import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { decrypt, encrypt } from '../lib/crypto.js';

export interface BrevoStatus {
  connected: boolean;
  senderEmail: string;
  senderName: string;
  isVerified: boolean;
  status: 'CONNECTED' | 'INVALID_KEY' | 'DISCONNECTED' | 'AUTHENTICATION_FAILED';
  keyType: 'REST_API' | 'SMTP_KEY' | 'UNKNOWN';
  message?: string;
  setupInstructions?: string[];
}

export async function getBrevoStatus(userId: string): Promise<BrevoStatus> {
  const connection = await prisma.brevoConnection.findUnique({
    where: { userId },
  });

  const rawKey = connection?.apiKeyEncrypted
    ? decrypt(connection.apiKeyEncrypted)
    : config.brevo.apiKey;
  const senderEmail = connection?.senderEmail || config.brevo.senderEmail || '';
  const senderName = connection?.senderName || config.brevo.senderName || 'MailPilot';

  if (!rawKey) {
    return {
      connected: false,
      senderEmail,
      senderName,
      isVerified: false,
      status: 'DISCONNECTED',
      keyType: 'UNKNOWN',
      message: 'No Brevo API key or SMTP key provided.',
      setupInstructions: [
        '1. Log into your Brevo (formerly Sendinblue) account at https://app.brevo.com',
        '2. Navigate to "SMTP & API" -> "API Keys" to generate a v3 REST API key (starts with xkeysib-)',
        '3. Ensure your sender email is verified under "Senders & IP"',
        '4. Enter the API key in the MailPilot Integrations settings.',
      ],
    };
  }

  const keyType = rawKey.startsWith('xkeysib-')
    ? 'REST_API'
    : rawKey.startsWith('xsmtpsib-')
    ? 'SMTP_KEY'
    : 'UNKNOWN';

  // Test connection
  const verification = await verifyBrevoCredentials(rawKey, senderEmail);

  return {
    connected: verification.success,
    senderEmail,
    senderName,
    isVerified: verification.success,
    status: verification.success ? 'CONNECTED' : 'AUTHENTICATION_FAILED',
    keyType,
    message: verification.message,
    setupInstructions: verification.success
      ? undefined
      : [
          'The provided key failed provider authentication.',
          keyType === 'SMTP_KEY'
            ? 'Note: You provided an SMTP key (xsmtpsib-). Make sure SMTP is activated in Brevo > Transactional > Settings, or generate an API v3 key (xkeysib-) in Brevo > SMTP & API.'
            : 'Verify that your Brevo API key is active and not revoked.',
          `Ensure sender "${senderEmail}" is verified in Brevo Senders list.`,
        ],
  };
}

export async function verifyBrevoCredentials(
  apiKey: string,
  senderEmail: string
): Promise<{ success: boolean; message: string }> {
  if (!apiKey) {
    return { success: false, message: 'API key is missing.' };
  }

  // If it's a v3 REST API key
  if (apiKey.startsWith('xkeysib-')) {
    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': apiKey,
          accept: 'application/json',
        },
      });

      if (response.ok) {
        return { success: true, message: 'Brevo REST API v3 connected successfully.' };
      } else {
        const errorData: any = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || `Brevo REST API returned status ${response.status}`,
        };
      }
    } catch (err: any) {
      return { success: false, message: `Failed to reach Brevo API: ${err.message}` };
    }
  }

  // If it's an SMTP key (xsmtpsib-)
  return new Promise((resolve) => {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: senderEmail || 'apikey',
        pass: apiKey,
      },
    });

    transporter.verify((err) => {
      if (err) {
        resolve({
          success: false,
          message: `Brevo SMTP authentication failed: ${err.message}`,
        });
      } else {
        resolve({
          success: true,
          message: 'Brevo SMTP Relay verified successfully.',
        });
      }
    });
  });
}

export async function sendMarketingEmailThroughBrevo(params: {
  userId: string;
  to: string;
  subject: string;
  htmlContent: string;
  plainText?: string;
  senderEmail?: string;
  senderName?: string;
  campaignId?: string;
}) {
  // Check suppression list first!
  const suppressed = await prisma.suppressionRecord.findUnique({
    where: { email: params.to.toLowerCase().trim() },
  });

  if (suppressed) {
    throw new Error(
      `Cannot send marketing email to ${params.to}: recipient is on the suppression list (${suppressed.reason}).`
    );
  }

  // Check contact unsubscribe status
  const marketingContact = await prisma.marketingContact.findFirst({
    where: {
      userId: params.userId,
      email: params.to.toLowerCase().trim(),
    },
  });

  if (marketingContact && marketingContact.status === 'UNSUBSCRIBED') {
    throw new Error(`Recipient ${params.to} has unsubscribed from marketing communications.`);
  }

  const connection = await prisma.brevoConnection.findUnique({
    where: { userId: params.userId },
  });

  const apiKey = connection?.apiKeyEncrypted
    ? decrypt(connection.apiKeyEncrypted)
    : config.brevo.apiKey;
  const senderEmail =
    params.senderEmail || connection?.senderEmail || config.brevo.senderEmail || 'subashree@mailpilot.io';
  const senderName =
    params.senderName || connection?.senderName || config.brevo.senderName || 'MailPilot Marketing';

  if (!apiKey) {
    throw new Error('Brevo is not connected. Please add your Brevo API key in Integrations.');
  }

  // If REST API v3
  if (apiKey.startsWith('xkeysib-')) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.plainText,
        tags: params.campaignId ? [`campaign-${params.campaignId}`] : ['mailpilot-marketing'],
      }),
    });

    if (!response.ok) {
      const errJson: any = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Brevo delivery failed with status ${response.status}`);
    }

    const data: any = await response.json();
    return {
      accepted: true,
      messageId: data.messageId || `brevo-${Date.now()}`,
      provider: 'BREVO_REST',
    };
  }

  // If SMTP relay
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: senderEmail,
      pass: apiKey,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.plainText || '',
      html: params.htmlContent,
    });

    return {
      accepted: true,
      messageId: info.messageId,
      provider: 'BREVO_SMTP',
    };
  } catch (error: any) {
    throw new Error(`Brevo SMTP relay delivery failed: ${error.message}`);
  }
}

export async function updateBrevoConnection(
  userId: string,
  data: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
  }
) {
  const verification = await verifyBrevoCredentials(data.apiKey, data.senderEmail);

  const updated = await prisma.brevoConnection.upsert({
    where: { userId },
    create: {
      userId,
      apiKeyEncrypted: encrypt(data.apiKey),
      senderEmail: data.senderEmail,
      senderName: data.senderName,
      isVerified: verification.success,
      accountStatus: verification.success ? 'CONNECTED' : 'AUTHENTICATION_FAILED',
      lastTestedAt: new Date(),
    },
    update: {
      apiKeyEncrypted: encrypt(data.apiKey),
      senderEmail: data.senderEmail,
      senderName: data.senderName,
      isVerified: verification.success,
      accountStatus: verification.success ? 'CONNECTED' : 'AUTHENTICATION_FAILED',
      lastTestedAt: new Date(),
    },
  });

  return {
    ...verification,
    accountStatus: updated.accountStatus,
  };
}
