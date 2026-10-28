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

// POST Profolio Lead Sync (Webhook from portfolio site)
router.post('/profolio-lead', async (req, res): Promise<void> => {
  try {
    const { name, email, phone, company, service, budget, meetingDate, meetingTime, description } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Client email is required.' });
      return;
    }

    // Find the admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      res.status(500).json({ error: 'Admin account not initialized.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCompany = company?.trim() || 'Client';
    const cleanName = name?.trim() || 'Valued Client';
    const notesSummary = `Phone: ${phone || 'N/A'} | Service: ${service || 'Website Development'} | Budget: ${budget || 'Negotiable'} | Meeting: ${meetingDate || 'TBD'} ${meetingTime || ''} | Scope: ${description || 'N/A'}`;

    // Upsert or create contact
    const existingContact = await prisma.contact.findFirst({
      where: { userId: admin.id, email: cleanEmail },
    });

    let contact;
    if (existingContact) {
      contact = await prisma.contact.update({
        where: { id: existingContact.id },
        data: {
          name: cleanName,
          company: cleanCompany,
          notes: notesSummary,
          tags: `Profolio Lead, ${service || 'Web Development'}`,
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          userId: admin.id,
          name: cleanName,
          email: cleanEmail,
          company: cleanCompany,
          notes: notesSummary,
          tags: `Profolio Lead, ${service || 'Web Development'}`,
        },
      });
    }

    // Create a personalized ready-to-review draft proposal
    const draftSubject = `Web Development Proposal & Quotation for ${cleanName} - Profolio`;
    const draftBody = `Dear ${cleanName},

Thank you for choosing Profolio and reaching out regarding your ${service || 'Website Development'} project.

We have reviewed your project requirements:
- Service: ${service || 'Custom Website Development'}
- Estimated Budget Range: ${budget || 'As discussed'}
- Meeting Schedule: ${meetingDate ? `${meetingDate} at ${meetingTime || 'agreed time'}` : 'To be coordinated'}

Our team at Profolio specializes in high-performance, responsive web development designed to elevate your online presence and drive business results. We are preparing a detailed technical proposal and customized quotation based on your project description.

Please confirm if our scheduled discussion time works for you, or let us know if you'd like to review any specific design references beforehand.

Warm regards,
Team Profolio
subashreekamal@gmail.com`;

    const draft = await prisma.emailRecord.create({
      data: {
        userId: admin.id,
        title: `Profolio Lead: ${cleanName} (${service || 'Web Development'})`,
        recipientEmail: cleanEmail,
        recipientName: cleanName,
        senderEmail: admin.email,
        senderName: 'Team Profolio',
        subject: draftSubject,
        bodyText: draftBody,
        purpose: 'Price / Quotation Request',
        tone: 'Professional',
        length: 'Medium',
        shortDescription: cleanCompany,
        additionalInstructions: `Auto-generated draft for portfolio inquiry: ${service}. Scope: ${description}`,
        isDraft: true,
        status: 'DRAFT',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Profolio lead synchronized successfully with MailPilot AI.',
      contact,
      draftId: draft.id,
    });
  } catch (error: any) {
    console.error('Profolio Lead Sync Error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync lead.' });
  }
});

export default router;
