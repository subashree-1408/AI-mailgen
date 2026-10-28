import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt } from '../lib/crypto.js';
import { config } from '../config/env.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with administrator credentials...');

  // 1. Create or update primary Administrator
  const adminEmail = 'Subashreekamal@gmail.com'.toLowerCase().trim();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('inselen3ra', salt);

  const user = await prisma.user.upsert({
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
  console.log(`Administrator provisioned: ${user.email} (${user.id})`);

  // 2. Create or verify Workspace
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
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
    });
    console.log(`Created workspace: ${workspace.name}`);
  }

  // 3. Connect Brevo credentials
  if (config.brevo.apiKey) {
    await prisma.brevoConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
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
    console.log('Linked Brevo connection to administrator account.');
  }

  // 4. Connect Gmail active sender for admin
  await prisma.gmailConnection.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
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
  console.log('Linked connected Gmail identity to Subashreekamal@gmail.com');

  console.log('Admin provisioning completed successfully. Database is clean.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
