import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  generateEmail,
  rewriteEmail,
  improveEmailText,
  generateSubjectAlternatives,
  generateSubjectSuggestion,
  generateMarketingSequence,
} from '../services/aiService.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Validation schema for email generation
const generateEmailSchema = z.object({
  recipientEmail: z.string().email('Valid recipient email address is required.'),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  shopOrBusinessName: z.string().optional(),
  tone: z.string().optional(),
  length: z.enum(['Low', 'Medium', 'High', 'Short', 'Detailed']).optional(),
  purpose: z.string().optional(),
  businessDomain: z.string().optional(),
  customDomain: z.string().optional(),
  additionalInstructions: z.string().optional(),
  shortDescription: z.string().optional(),
  language: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().optional(),
});

router.post('/suggest-subject', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopOrBusinessName, businessDomain, customDomain, purpose, tone, instructions } = req.body;
    const result = await generateSubjectSuggestion({
      shopOrBusinessName,
      businessDomain,
      customDomain,
      purpose,
      tone,
      instructions,
    });
    res.json({ success: true, subject: result.subject });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to suggest subject line.' });
  }
});

router.post('/generate-email', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = generateEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
      return;
    }

    // Determine sender name and email from profile or connected Gmail if not provided
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { gmailConnection: true },
    });

    const senderName = req.body.senderName || user?.name || 'Sender';
    const senderEmail = req.body.senderEmail || user?.gmailConnection?.emailAddress || user?.email;

    const result = await generateEmail({
      ...parseResult.data,
      senderName,
      senderEmail,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate email with Gemini AI. Please try again.',
    });
  }
});

router.post('/rewrite-email', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentSubject, currentBody, instructions, tone, senderName } = req.body;
    if (!currentBody || !instructions) {
      res.status(400).json({ error: 'currentBody and instructions are required.' });
      return;
    }

    const result = await rewriteEmail({
      currentSubject: currentSubject || '',
      currentBody,
      instructions,
      tone,
      senderName: senderName || req.user?.name,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to rewrite email.' });
  }
});

router.post('/improve-text', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { text, action, targetTone, targetLanguage } = req.body;
    if (!text || !action) {
      res.status(400).json({ error: 'text and action are required.' });
      return;
    }

    const result = await improveEmailText({
      text,
      action,
      targetTone,
      targetLanguage,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to improve text.' });
  }
});

router.post('/subject-alternatives', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentSubject, body, tone } = req.body;
    if (!body) {
      res.status(400).json({ error: 'Email body is required to generate subject alternatives.' });
      return;
    }

    const result = await generateSubjectAlternatives({
      currentSubject: currentSubject || '',
      body,
      tone,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate subject alternatives.' });
  }
});

router.post('/generate-sequence', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sequenceType, productDescription, targetAudience, numberOfSteps, tone, platform, goal, isDemo } = req.body;
    if (!productDescription || !targetAudience) {
      res.status(400).json({ error: 'productDescription and targetAudience are required.' });
      return;
    }

    const result = await generateMarketingSequence({
      sequenceType: sequenceType || goal || 'Product launch',
      productDescription,
      targetAudience,
      numberOfSteps,
      tone,
      platform,
      goal,
      isDemo: Boolean(isDemo),
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate marketing sequence.' });
  }
});

export default router;
