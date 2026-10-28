import { prisma } from '../lib/prisma.js';
import { sendMarketingEmailThroughBrevo } from './brevoService.js';

let intervalTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export function startScheduler() {
  if (intervalTimer) return;
  console.log('[Scheduler] Background job worker started (polling every 30s)...');
  intervalTimer = setInterval(processScheduledWork, 30000);
  // Also run immediately on boot
  processScheduledWork().catch(console.error);
}

export function stopScheduler() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    console.log('[Scheduler] Background job worker stopped.');
  }
}

export async function processScheduledWork() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const now = new Date();

    // 1. Process scheduled Marketing Campaigns
    const dueCampaigns = await prisma.marketingCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      include: {
        user: true,
      },
    });

    for (const campaign of dueCampaigns) {
      console.log(`[Scheduler] Processing scheduled campaign: "${campaign.name}" (${campaign.id})`);
      await dispatchCampaign(campaign.id);
    }

    // 2. Process automated Sequence Enrollments
    const dueEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        nextExecutionAt: { lte: now },
      },
      include: {
        sequence: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    for (const enrollment of dueEnrollments) {
      console.log(`[Scheduler] Processing sequence step for: ${enrollment.contactEmail} (Step ${enrollment.currentStepOrder})`);
      await dispatchSequenceStep(enrollment);
    }
  } catch (error) {
    console.error('[Scheduler] Error during execution cycle:', error);
  } finally {
    isProcessing = false;
  }
}

export async function dispatchCampaign(campaignId: string) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId },
    include: { user: true },
  });

  if (!campaign || campaign.status === 'ACTIVE' || campaign.status === 'COMPLETED') {
    return;
  }

  // Mark as active
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: 'ACTIVE' },
  });

  // Fetch eligible marketing contacts
  const contacts = await prisma.marketingContact.findMany({
    where: {
      userId: campaign.userId,
      listName: campaign.targetList || 'Default',
      status: 'SUBSCRIBED',
    },
  });

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      const res = await sendMarketingEmailThroughBrevo({
        userId: campaign.userId,
        to: contact.email,
        subject: campaign.subject,
        htmlContent: campaign.htmlContent,
        plainText: campaign.plainText || undefined,
        senderName: campaign.senderName || undefined,
        senderEmail: campaign.senderEmail || undefined,
        campaignId: campaign.id,
      });

      await prisma.campaignEmail.create({
        data: {
          campaignId: campaign.id,
          recipientEmail: contact.email,
          status: 'SENT',
          brevoMessageId: res.messageId,
          sentAt: new Date(),
        },
      });

      sent++;
    } catch (err: any) {
      console.warn(`[Scheduler] Campaign send failed for ${contact.email}:`, err.message);
      await prisma.campaignEmail.create({
        data: {
          campaignId: campaign.id,
          recipientEmail: contact.email,
          status: 'FAILED',
        },
      });
      failed++;
    }
  }

  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'COMPLETED',
      sentAt: new Date(),
      totalRecipients: contacts.length,
      sentCount: sent,
      bounceCount: failed,
    },
  });

  console.log(`[Scheduler] Campaign ${campaign.name} finished: ${sent} sent, ${failed} failed.`);
}

export async function dispatchSequenceStep(enrollment: any) {
  const { sequence } = enrollment;
  const currentStep = sequence.steps.find((s: any) => s.stepOrder === enrollment.currentStepOrder);

  if (!currentStep) {
    // No more steps -> mark completed
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'COMPLETED',
        nextExecutionAt: null,
      },
    });
    return;
  }

  try {
    await sendMarketingEmailThroughBrevo({
      userId: sequence.userId,
      to: enrollment.contactEmail,
      subject: currentStep.subject,
      htmlContent: currentStep.bodyHtml,
      plainText: currentStep.bodyText,
    });

    const nextStepOrder = enrollment.currentStepOrder + 1;
    const nextStep = sequence.steps.find((s: any) => s.stepOrder === nextStepOrder);

    if (nextStep) {
      const nextDate = new Date();
      nextDate.setHours(nextDate.getHours() + (nextStep.delayHours || 24));

      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStepOrder: nextStepOrder,
          lastExecutedAt: new Date(),
          nextExecutionAt: nextDate,
        },
      });
    } else {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'COMPLETED',
          lastExecutedAt: new Date(),
          nextExecutionAt: null,
        },
      });
    }
  } catch (error: any) {
    console.error(`[Scheduler] Sequence step delivery error: ${error.message}`);
    // If unsubscribed or suppressed, exit
    if (error.message?.includes('suppression') || error.message?.includes('unsubscribed')) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'EXITED',
          exitReason: error.message,
          nextExecutionAt: null,
        },
      });
    }
  }
}
