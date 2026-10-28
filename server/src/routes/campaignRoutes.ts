import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { dispatchCampaign } from '../services/schedulerService.js';
import { sendMarketingEmailThroughBrevo } from '../services/brevoService.js';

const router = Router();

// GET all campaigns
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await prisma.marketingCampaign.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        emails: {
          select: { status: true },
        },
      },
    });

    res.json({ campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create campaign
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      subject,
      previewText,
      htmlContent,
      plainText,
      targetList = 'Default',
      scheduledAt,
      status = 'DRAFT',
    } = req.body;

    if (!name || !subject || !htmlContent) {
      res.status(400).json({ error: 'Campaign name, subject, and HTML content are required.' });
      return;
    }

    // Get user brevo connection sender
    const brevo = await prisma.brevoConnection.findUnique({
      where: { userId: req.user!.id },
    });

    const campaign = await prisma.marketingCampaign.create({
      data: {
        userId: req.user!.id,
        name,
        subject,
        previewText,
        htmlContent,
        plainText,
        targetList,
        senderName: brevo?.senderName || 'MailPilot Marketing',
        senderEmail: brevo?.senderEmail || 'marketing@mailpilot.io',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'SCHEDULED' : status,
      },
    });

    res.status(201).json({ campaign });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single campaign with recipient logs
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        emails: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }

    res.json({ campaign });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST schedule campaign
router.post('/:id/schedule', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      res.status(400).json({ error: 'Scheduled time is required.' });
      return;
    }

    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }

    const updated = await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED',
      },
    });

    res.json({ campaign: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST send campaign immediately
router.post('/:id/send-now', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }

    // Trigger dispatch
    await dispatchCampaign(campaign.id);

    const updated = await prisma.marketingCampaign.findUnique({
      where: { id: campaign.id },
      include: { emails: true },
    });

    res.json({
      success: true,
      message: 'Campaign dispatched to audience.',
      campaign: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST test send campaign
router.post('/:id/test-send', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { testEmail } = req.body;
    if (!testEmail) {
      res.status(400).json({ error: 'Test recipient email is required.' });
      return;
    }

    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }

    const result = await sendMarketingEmailThroughBrevo({
      userId: req.user!.id,
      to: testEmail.trim(),
      subject: `[TEST PREVIEW] ${campaign.subject}`,
      htmlContent: campaign.htmlContent,
      plainText: campaign.plainText || undefined,
      campaignId: campaign.id,
    });

    res.json({ success: true, message: `Test preview sent to ${testEmail}`, result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
