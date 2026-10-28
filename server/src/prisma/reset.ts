import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt } from '../lib/crypto.js';
import { config } from '../config/env.js';

const prisma = new PrismaClient();

export async function resetDatabase() {
  console.log('🧹 Initiating complete website data reset...');

  // 1. Wipe all transactional, campaign, sequence, email, job, and analytics data
  const deletedSendAttempts = await prisma.emailSendAttempt.deleteMany({});
  const deletedEmails = await prisma.emailRecord.deleteMany({});
  const deletedCampaignEmails = await prisma.campaignEmail.deleteMany({});
  const deletedCampaigns = await prisma.marketingCampaign.deleteMany({});
  const deletedEnrollments = await prisma.sequenceEnrollment.deleteMany({});
  const deletedSteps = await prisma.sequenceStep.deleteMany({});
  const deletedSequences = await prisma.sequence.deleteMany({});
  const deletedJobs = await prisma.scheduledJob.deleteMany({});
  const deletedEvents = await prisma.providerEvent.deleteMany({});
  const deletedSuppressions = await prisma.suppressionRecord.deleteMany({});
  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  const deletedContacts = await prisma.contact.deleteMany({});
  const deletedMarketingContacts = await prisma.marketingContact.deleteMany({});

  console.log(`Deleted ${deletedEmails.count} email records.`);
  console.log(`Deleted ${deletedSendAttempts.count} send attempts.`);
  console.log(`Deleted ${deletedCampaigns.count} marketing campaigns.`);
  console.log(`Deleted ${deletedCampaignEmails.count} campaign emails.`);
  console.log(`Deleted ${deletedSequences.count} sequences and ${deletedSteps.count} steps.`);
  console.log(`Deleted ${deletedEnrollments.count} sequence enrollments.`);
  console.log(`Deleted ${deletedJobs.count} scheduled background jobs.`);
  console.log(`Deleted ${deletedEvents.count} provider events.`);
  console.log(`Deleted ${deletedSuppressions.count} suppression records.`);
  console.log(`Deleted ${deletedAuditLogs.count} audit logs.`);
  console.log(`Deleted ${deletedContacts.count} personal contacts.`);
  console.log(`Deleted ${deletedMarketingContacts.count} marketing contacts.`);

  // 2. Remove any obsolete non-admin users
  const adminEmail = 'Subashreekamal@gmail.com'.toLowerCase().trim();
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        not: adminEmail,
      },
    },
  });
  console.log(`Removed ${deletedUsers.count} non-admin user accounts.`);

  // 3. Ensure primary Administrator is fresh and pristine
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('inselen3ra', salt);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'subashree',
      passwordHash,
      role: 'ADMIN',
    },
    update: {
      name: 'subashree',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // 4. Ensure pristine Workspace
  await prisma.workspaceMembership.deleteMany({});
  await prisma.workspace.deleteMany({});

  const workspace = await prisma.workspace.create({
    data: {
      name: "Subashree's Workspace",
      slug: 'subashree-workspace',
      ownerId: admin.id,
      members: {
        create: {
          userId: admin.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log(`Pristine workspace created: ${workspace.name}`);

  // 5. Connect Brevo credentials for admin
  if (config.brevo.apiKey) {
    await prisma.brevoConnection.upsert({
      where: { userId: admin.id },
      create: {
        userId: admin.id,
        apiKeyEncrypted: encrypt(config.brevo.apiKey),
        senderEmail: 'Subashreekamal@gmail.com',
        senderName: 'subashree',
        isVerified: true,
        accountStatus: 'CONNECTED',
        lastTestedAt: new Date(),
      },
      update: {
        apiKeyEncrypted: encrypt(config.brevo.apiKey),
        senderEmail: 'Subashreekamal@gmail.com',
        senderName: 'subashree',
        isVerified: true,
        accountStatus: 'CONNECTED',
        lastTestedAt: new Date(),
      },
    });
    console.log('Linked Brevo credentials for Subashreekamal@gmail.com.');
  }

  // 6. Connect Gmail sender identity for admin
  await prisma.gmailConnection.upsert({
    where: { userId: admin.id },
    create: {
      userId: admin.id,
      emailAddress: 'Subashreekamal@gmail.com',
      status: 'CONNECTED',
      lastSyncAt: new Date(),
    },
    update: {
      emailAddress: 'Subashreekamal@gmail.com',
      status: 'CONNECTED',
      lastSyncAt: new Date(),
    },
  });
  console.log('Linked Gmail sender identity for Subashreekamal@gmail.com.');

  console.log('✨ Entire website data reset completed! Slate is 100% clean.');
}

if (process.argv[1]?.includes('reset')) {
  resetDatabase()
    .catch((err) => {
      console.error('Reset error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
