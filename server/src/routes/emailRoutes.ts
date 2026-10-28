import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { sendEmailThroughGmail } from '../services/gmailService.js';
import { sendMarketingEmailThroughBrevo } from '../services/brevoService.js';
import { formatEmailHtml } from '../services/aiService.js';
import { config } from '../config/env.js';

const router = Router();

// GET all emails for the user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, isDraft, search } = req.query;

    const where: any = {
      userId: req.user!.id,
    };

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (isDraft !== undefined) {
      where.isDraft = isDraft === 'true';
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { subject: { contains: search } },
        { recipientEmail: { contains: search } },
        { recipientName: { contains: search } },
        { bodyText: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    const emails = await prisma.emailRecord.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        sendAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json({ emails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single email
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const email = await prisma.emailRecord.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        sendAttempts: {
          orderBy: { attemptedAt: 'desc' },
        },
      },
    });

    if (!email) {
      res.status(404).json({ error: 'Email record not found.' });
      return;
    }

    res.json({ email });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST save email / draft
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      recipientEmail,
      recipientName,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      purpose,
      tone,
      length,
      language,
      shortDescription,
      additionalInstructions,
      isDraft = true,
      status = 'DRAFT',
    } = req.body;

    if (!recipientEmail) {
      res.status(400).json({ error: 'Recipient email is required.' });
      return;
    }

    // Lookup sender identity from user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { gmailConnection: true },
    });

    const senderEmail = config.brevo.senderEmail || user?.gmailConnection?.emailAddress || user?.email;
    const senderName = config.brevo.senderName || user?.name || 'subashree';

    const email = await prisma.emailRecord.create({
      data: {
        userId: req.user!.id,
        title: title || shortDescription || subject || 'Untitled Email',
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName?.trim(),
        cc: cc?.trim() || null,
        bcc: bcc?.trim() || null,
        senderEmail,
        senderName,
        subject: subject || '(No Subject)',
        bodyText: bodyText || '',
        bodyHtml: bodyHtml || null,
        purpose,
        tone,
        length,
        language,
        shortDescription,
        additionalInstructions,
        isDraft,
        status: status || 'DRAFT',
      },
    });

    res.status(201).json({ email });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update email
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.emailRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Email record not found.' });
      return;
    }

    const {
      title,
      recipientEmail,
      recipientName,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      purpose,
      tone,
      length,
      language,
      shortDescription,
      additionalInstructions,
      isDraft,
      status,
    } = req.body;

    const updated = await prisma.emailRecord.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(recipientEmail !== undefined ? { recipientEmail: recipientEmail.trim() } : {}),
        ...(recipientName !== undefined ? { recipientName: recipientName?.trim() } : {}),
        ...(cc !== undefined ? { cc: cc?.trim() || null } : {}),
        ...(bcc !== undefined ? { bcc: bcc?.trim() || null } : {}),
        ...(subject !== undefined ? { subject } : {}),
        ...(bodyText !== undefined ? { bodyText } : {}),
        ...(bodyHtml !== undefined ? { bodyHtml } : {}),
        ...(purpose !== undefined ? { purpose } : {}),
        ...(tone !== undefined ? { tone } : {}),
        ...(length !== undefined ? { length } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(shortDescription !== undefined ? { shortDescription } : {}),
        ...(additionalInstructions !== undefined ? { additionalInstructions } : {}),
        ...(isDraft !== undefined ? { isDraft } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    res.json({ email: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE email
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.emailRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Email record not found.' });
      return;
    }

    await prisma.emailRecord.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Email draft deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST duplicate email
router.post('/:id/duplicate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.emailRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Email record not found.' });
      return;
    }

    const duplicated = await prisma.emailRecord.create({
      data: {
        userId: req.user!.id,
        title: `${existing.title || existing.subject} (Copy)`,
        recipientEmail: existing.recipientEmail,
        recipientName: existing.recipientName,
        cc: existing.cc,
        bcc: existing.bcc,
        senderEmail: existing.senderEmail,
        senderName: existing.senderName,
        subject: existing.subject,
        bodyText: existing.bodyText,
        bodyHtml: existing.bodyHtml,
        purpose: existing.purpose,
        tone: existing.tone,
        length: existing.length,
        language: existing.language,
        shortDescription: existing.shortDescription,
        additionalInstructions: existing.additionalInstructions,
        isDraft: true,
        status: 'DRAFT',
      },
    });

    res.status(201).json({ email: duplicated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST send email via Brevo or Gmail
router.post('/:id/send', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const email = await prisma.emailRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!email) {
      res.status(404).json({ error: 'Email record not found.' });
      return;
    }

    if (!email.recipientEmail) {
      res.status(400).json({ error: 'Recipient email address is required.' });
      return;
    }

    if (!email.bodyText && !email.bodyHtml) {
      res.status(400).json({ error: 'Email content is empty. Cannot send.' });
      return;
    }

    // Default provider to BREVO as per required workflow, or GMAIL if specified
    const targetProvider = ((req.body?.provider || req.query?.provider || email.provider || 'BREVO') as string).toUpperCase();

    // Set status to SENDING
    await prisma.emailRecord.update({
      where: { id: email.id },
      data: { status: 'SENDING' },
    });

    if (targetProvider === 'BREVO') {
      try {
        const companyName = email.shortDescription || '';
        const formattedHtml = email.bodyHtml || formatEmailHtml(email.bodyText, companyName);

        const result = await sendMarketingEmailThroughBrevo({
          userId: req.user!.id,
          to: email.recipientEmail,
          subject: email.subject || '(No Subject)',
          htmlContent: formattedHtml,
          plainText: email.bodyText,
          senderEmail: config.brevo.senderEmail || email.senderEmail || undefined,
          senderName: config.brevo.senderName || email.senderName || undefined,
        });

        const updated = await prisma.emailRecord.update({
          where: { id: email.id },
          data: {
            status: 'ACCEPTED',
            isDraft: false,
            provider: 'BREVO',
            providerMessageId: result.messageId,
            sentAt: new Date(),
            errorMessage: null,
          },
        });

        await prisma.emailSendAttempt.create({
          data: {
            emailRecordId: email.id,
            provider: 'BREVO',
            status: 'SUCCESS',
            responsePayload: JSON.stringify(result),
          },
        });

        res.json({
          success: true,
          message: 'Email successfully sent to recipient via Brevo backend.',
          email: updated,
          providerMessageId: result.messageId,
        });
      } catch (brevoError: any) {
        console.error('Brevo send error:', brevoError);

        await prisma.emailRecord.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            errorMessage: brevoError.message,
          },
        });

        await prisma.emailSendAttempt.create({
          data: {
            emailRecordId: email.id,
            provider: 'BREVO',
            status: 'FAILURE',
            errorMessage: brevoError.message,
          },
        });

        res.status(400).json({
          error: brevoError.message || 'Failed to dispatch email through Brevo backend.',
        });
      }
    } else {
      // Gmail API fallback/alternative
      try {
        const result = await sendEmailThroughGmail({
          userId: req.user!.id,
          to: email.recipientEmail,
          cc: email.cc || undefined,
          bcc: email.bcc || undefined,
          subject: email.subject || '(No Subject)',
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml || undefined,
        });

        const updated = await prisma.emailRecord.update({
          where: { id: email.id },
          data: {
            status: 'ACCEPTED',
            isDraft: false,
            provider: 'GMAIL',
            providerMessageId: result.messageId,
            sentAt: new Date(),
            errorMessage: null,
          },
        });

        await prisma.emailSendAttempt.create({
          data: {
            emailRecordId: email.id,
            provider: 'GMAIL',
            status: 'SUCCESS',
            responsePayload: JSON.stringify(result),
          },
        });

        res.json({
          success: true,
          message: 'Email accepted by Gmail API and sent from your connected account.',
          email: updated,
          providerMessageId: result.messageId,
        });
      } catch (sendError: any) {
        console.error('Gmail send error:', sendError);

        await prisma.emailRecord.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message,
          },
        });

        await prisma.emailSendAttempt.create({
          data: {
            emailRecordId: email.id,
            provider: 'GMAIL',
            status: 'FAILURE',
            errorMessage: sendError.message,
          },
        });

        res.status(400).json({
          error: sendError.message || 'Failed to dispatch email through Gmail API.',
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
