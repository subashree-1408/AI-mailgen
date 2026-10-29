import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { resetDatabase } from '../prisma/reset.js';

const router = Router();

// POST /api/auth/login - Admin Only
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isMasterAdmin =
      normalizedEmail === 'subashreekamal@gmail.com' && (password || '').toLowerCase().trim() === 'inselen3ra';

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If master admin login and account doesn't exist yet in database, provision automatically on the fly
    if (isMasterAdmin && !user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('inselen3ra', salt);
      user = await prisma.user.create({
        data: {
          id: 'admin_subashree_root_id',
          email: 'Subashreekamal@gmail.com',
          name: 'subashree',
          passwordHash,
          role: 'ADMIN',
        },
      });

      // Ensure primary workspace exists
      await prisma.workspace.create({
        data: {
          name: "Subashree's Workspace",
          slug: 'subashree-workspace',
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      }).catch(() => {});
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials or user account not found.' });
      return;
    }

    let isMatch = false;
    if (isMasterAdmin) {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Please check your admin password.' });
      return;
    }

    // Ensure role is ADMIN
    if (user.role !== 'ADMIN') {
      if (isMasterAdmin) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
        });
      } else {
        res.status(403).json({
          error: 'Access restricted: This application can be accessed and handled by administrators only.',
        });
        return;
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

// POST /api/auth/signup - Disallow public registrations
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, adminSecret } = req.body;
    
    // Only allow provisioning if the admin secret is supplied or if no admin exists yet
    const existingAdminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    
    if (existingAdminCount > 0 && adminSecret !== 'mailpilot_admin_setup_2026') {
      res.status(403).json({
        error: 'Public registration is disabled. This website can be handled by only the administrator.',
      });
      return;
    }

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        role: 'ADMIN', // Guaranteed admin
      },
    });

    await prisma.workspace.create({
      data: {
        name: `${name}'s Admin Workspace`,
        slug: `admin-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Signup failed.' });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        gmailConnection: {
          select: {
            emailAddress: true,
            status: true,
            lastSyncAt: true,
          },
        },
        brevoConnection: {
          select: {
            senderEmail: true,
            senderName: true,
            isVerified: true,
            accountStatus: true,
          },
        },
      },
    });

    if (user && user.email.toLowerCase() === 'subashreekamal@gmail.com' && user.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
      user.role = 'ADMIN';
    }

    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Administrator access required.' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-data - Reset all website details & data (Admin only)
router.post('/reset-data', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only the administrator can reset website details.' });
      return;
    }

    await resetDatabase();

    res.json({
      success: true,
      message: 'All website details, emails, campaigns, sequences, contacts, and logs have been completely reset to a clean state.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset website data.' });
  }
});

export default router;
