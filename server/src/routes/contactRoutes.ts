import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET personal contacts (supports search for autocomplete)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const where: any = { userId: req.user!.id };

    if (q && typeof q === 'string') {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { company: { contains: q } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ contacts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create personal contact
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, company, notes, tags } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const contact = await prisma.contact.create({
      data: {
        userId: req.user!.id,
        name,
        email: email.toLowerCase().trim(),
        company,
        notes,
        tags,
      },
    });

    res.status(201).json({ contact });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE personal contact
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.contact.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET marketing contacts
router.get('/marketing', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const contacts = await prisma.marketingContact.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ contacts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create marketing contact
router.post('/marketing', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, listName = 'Default' } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const contact = await prisma.marketingContact.create({
      data: {
        userId: req.user!.id,
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        listName,
        status: 'SUBSCRIBED',
      },
    });

    res.status(201).json({ contact });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
