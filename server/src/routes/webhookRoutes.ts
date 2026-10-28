import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// POST /api/webhooks/brevo
router.post('/brevo', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body;
    console.log('[Webhook] Ingested Brevo event:', event?.event, event?.email);

    if (!event || !event.email) {
      res.status(200).send('OK (ignored invalid payload)');
      return;
    }

    const eventType = String(event.event || 'unknown').toUpperCase();
    const recipientEmail = String(event.email).toLowerCase().trim();
    const messageId = event['message-id'] || event.messageId;
    const tag = Array.isArray(event.tags) ? event.tags[0] : event.tag;

    // Record raw provider event
    await prisma.providerEvent.create({
      data: {
        provider: 'BREVO',
        eventType,
        recipientEmail,
        messageId,
        rawPayload: JSON.stringify(event),
      },
    });

    // Handle Unsubscribes & Hard Bounces
    if (eventType === 'UNSUBSCRIBED' || eventType === 'SPAM' || eventType === 'HARD_BOUNCE') {
      await prisma.suppressionRecord.upsert({
        where: { email: recipientEmail },
        create: {
          email: recipientEmail,
          reason: eventType,
          source: 'BREVO_WEBHOOK',
        },
        update: {
          reason: eventType,
        },
      });

      await prisma.marketingContact.updateMany({
        where: { email: recipientEmail },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
        },
      });
    }

    // Handle Campaign attribution if tagged
    if (tag && tag.startsWith('campaign-')) {
      const campaignId = tag.replace('campaign-', '');
      if (eventType === 'OPENED' || eventType === 'UNIQUE_OPENED') {
        await prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: { openCount: { increment: 1 } },
        });
      } else if (eventType === 'CLICK' || eventType === 'CLICKED') {
        await prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: { clickCount: { increment: 1 } },
        });
      } else if (eventType === 'BOUNCE' || eventType === 'HARD_BOUNCE' || eventType === 'SOFT_BOUNCE') {
        await prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: { bounceCount: { increment: 1 } },
        });
      }
    }

    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('[Webhook] Brevo webhook processing error:', error);
    res.status(200).json({ status: 'error_logged' });
  }
});

export default router;
