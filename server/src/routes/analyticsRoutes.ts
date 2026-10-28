import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/overview', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Personal Email & Contact Metrics
    const totalEmailsCreated = await prisma.emailRecord.count({ where: { userId } });
    const draftEmails = await prisma.emailRecord.count({ where: { userId, isDraft: true } });
    const sentThroughGmail = await prisma.emailRecord.count({
      where: { userId, status: 'ACCEPTED', provider: 'GMAIL' },
    });
    const failedSendAttempts = await prisma.emailSendAttempt.count({
      where: {
        emailRecord: { userId },
        status: 'FAILURE',
      },
    });
    const totalContacts = await prisma.contact.count({ where: { userId } });

    // 2. Integration Statuses
    const gmailConnection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: { emailAddress: true, status: true, lastSyncAt: true },
    });

    const brevoConnection = await prisma.brevoConnection.findUnique({
      where: { userId },
      select: { senderEmail: true, senderName: true, isVerified: true, accountStatus: true },
    });

    // 3. Marketing Metrics
    const totalCampaigns = await prisma.marketingCampaign.count({ where: { userId } });
    const scheduledCampaigns = await prisma.marketingCampaign.count({
      where: { userId, status: 'SCHEDULED' },
    });
    const activeAutomations = await prisma.sequenceEnrollment.count({
      where: {
        sequence: { userId },
        status: 'ACTIVE',
      },
    });
    const eligibleMarketingContacts = await prisma.marketingContact.count({
      where: { userId, status: 'SUBSCRIBED' },
    });

    // 4. Marketing Email Aggregates
    const campaignAggregates = await prisma.marketingCampaign.aggregate({
      where: { userId },
      _sum: {
        sentCount: true,
        openCount: true,
        clickCount: true,
        bounceCount: true,
      },
    });

    // 5. Recent Activity
    const recentEmails = await prisma.emailRecord.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        recipientEmail: true,
        recipientName: true,
        subject: true,
        status: true,
        provider: true,
        isDraft: true,
        createdAt: true,
        sentAt: true,
        updatedAt: true,
      },
    });

    res.json({
      personalEmails: {
        totalCreated: totalEmailsCreated,
        drafts: draftEmails,
        sentThroughGmail,
        failedAttempts: failedSendAttempts,
        contacts: totalContacts,
      },
      marketing: {
        totalCampaigns,
        scheduledCampaigns,
        activeAutomations,
        eligibleContacts: eligibleMarketingContacts,
        totalSent: campaignAggregates._sum.sentCount || 0,
        totalOpened: campaignAggregates._sum.openCount || 0,
        totalClicked: campaignAggregates._sum.clickCount || 0,
        totalBounced: campaignAggregates._sum.bounceCount || 0,
      },
      integrations: {
        gmail: gmailConnection || { status: 'DISCONNECTED', emailAddress: null },
        brevo: brevoConnection || { accountStatus: 'DISCONNECTED', senderEmail: null },
      },
      recentEmails,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
