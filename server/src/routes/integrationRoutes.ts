import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  generateAuthUrl,
  handleOAuthCallback,
  getGmailConnection,
  disconnectGmail,
} from '../services/gmailService.js';
import {
  getBrevoStatus,
  updateBrevoConnection,
  sendMarketingEmailThroughBrevo,
} from '../services/brevoService.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';

const router = Router();

// GET all integration statuses
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const gmail = await getGmailConnection(req.user!.id);
    const brevo = await getBrevoStatus(req.user!.id);

    res.json({
      gmail,
      brevo,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Gmail OAuth Connect URL
router.get('/gmail/connect', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authInfo = generateAuthUrl(req.user!.id);
    res.json(authInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Gmail OAuth Callback
router.get('/gmail/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`${config.corsOrigin}/integrations?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${config.corsOrigin}/integrations?error=missing_code_or_state`);
      return;
    }

    const stateUserId = String(state);
    await handleOAuthCallback(String(code), stateUserId);

    res.redirect(`${config.corsOrigin}/integrations?success=gmail_connected`);
  } catch (err: any) {
    console.error('Gmail OAuth Callback Error:', err);
    res.redirect(`${config.corsOrigin}/integrations?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
});

// POST Gmail Disconnect
router.post('/gmail/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await disconnectGmail(req.user!.id);
    res.json({ success: true, message: 'Gmail disconnected.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Dev/Test Direct Connection for Gmail (for local sandbox/dev when Google OAuth client is in setup)
router.post('/gmail/dev-connect', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { emailAddress } = req.body;
    if (!emailAddress) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    await prisma.gmailConnection.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        emailAddress: emailAddress.trim(),
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      },
      update: {
        emailAddress: emailAddress.trim(),
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      },
    });

    res.json({ success: true, emailAddress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Brevo status
router.get('/brevo/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await getBrevoStatus(req.user!.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Brevo update & verify credentials
router.post('/brevo/verify', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { apiKey, senderEmail, senderName } = req.body;
    if (!apiKey || !senderEmail) {
      res.status(400).json({ error: 'API Key and Sender Email are required.' });
      return;
    }

    const result = await updateBrevoConnection(req.user!.id, {
      apiKey: apiKey.trim(),
      senderEmail: senderEmail.trim(),
      senderName: (senderName || 'MailPilot').trim(),
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST send test email via Brevo
router.post('/brevo/test-email', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { toEmail } = req.body;
    if (!toEmail) {
      res.status(400).json({ error: 'Target email is required.' });
      return;
    }

    const result = await sendMarketingEmailThroughBrevo({
      userId: req.user!.id,
      to: toEmail.trim(),
      subject: 'Test Email from MailPilot AI via Brevo',
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">MailPilot AI Brevo Test</h2>
          <p style="color: #334155; line-height: 1.6;">
            This is a verified test delivery dispatched through Brevo from MailPilot AI.
          </p>
          <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #64748b; margin: 16px 0;">
            Timestamp: ${new Date().toISOString()}<br/>
            Recipient: ${toEmail}
          </div>
          <p style="color: #64748b; font-size: 13px;">If you received this, your marketing sender is configured correctly.</p>
        </div>
      `,
      plainText: 'This is a verified test delivery dispatched through Brevo from MailPilot AI.',
    });

    res.json({
      success: true,
      message: 'Test email successfully dispatched through Brevo.',
      result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
