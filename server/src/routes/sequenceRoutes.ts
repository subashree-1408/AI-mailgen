import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET all sequences
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sequences = await prisma.sequence.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        enrollments: {
          select: {
            id: true,
            status: true,
            contactEmail: true,
            currentStepOrder: true,
          },
        },
      },
    });

    res.json({ sequences });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create sequence
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, sequenceType = 'WELCOME', strategy, steps = [] } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Sequence name is required.' });
      return;
    }

    const sequence = await prisma.sequence.create({
      data: {
        userId: req.user!.id,
        name,
        sequenceType,
        strategy,
        status: 'ACTIVE',
        steps: {
          create: steps.map((step: any, index: number) => ({
            stepOrder: step.stepOrder || index + 1,
            delayHours: step.delayHours !== undefined ? step.delayHours : 24,
            subject: step.subject || 'Follow-up',
            previewText: step.previewText || null,
            bodyHtml: step.bodyHtml || `<p>${step.bodyText || ''}</p>`,
            bodyText: step.bodyText || '',
            ctaText: step.ctaText || null,
            ctaUrl: step.ctaUrl || null,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    res.status(201).json({ sequence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET sequence details
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sequence = await prisma.sequence.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!sequence) {
      res.status(404).json({ error: 'Sequence not found.' });
      return;
    }

    res.json({ sequence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST enroll contact
router.post('/:id/enroll', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contactEmail } = req.body;
    if (!contactEmail) {
      res.status(400).json({ error: 'Contact email is required.' });
      return;
    }

    const sequence = await prisma.sequence.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!sequence) {
      res.status(404).json({ error: 'Sequence not found.' });
      return;
    }

    // Check if already active in this sequence
    const existing = await prisma.sequenceEnrollment.findFirst({
      where: {
        sequenceId: sequence.id,
        contactEmail: contactEmail.toLowerCase().trim(),
        status: 'ACTIVE',
      },
    });

    if (existing) {
      res.status(400).json({ error: 'This contact is already actively enrolled in this sequence.' });
      return;
    }

    // First step delay (often 0 for instant send)
    const firstStep = sequence.steps[0];
    const nextDate = new Date();
    if (firstStep && firstStep.delayHours > 0) {
      nextDate.setHours(nextDate.getHours() + firstStep.delayHours);
    }

    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactEmail: contactEmail.toLowerCase().trim(),
        currentStepOrder: 1,
        status: 'ACTIVE',
        nextExecutionAt: nextDate,
      },
    });

    res.status(201).json({
      success: true,
      message: `Enrolled ${contactEmail} into "${sequence.name}".`,
      enrollment,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST pause sequence
router.post('/:id/pause', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sequence = await prisma.sequence.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' },
    });
    res.json({ sequence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST resume sequence
router.post('/:id/resume', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sequence = await prisma.sequence.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });
    res.json({ sequence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
