import { google } from 'googleapis';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

export function generateAuthUrl(userId: string): { url: string; configured: boolean; error?: string } {
  if (!config.google.clientId || !config.google.clientSecret) {
    return {
      url: '',
      configured: false,
      error: 'Google OAuth Client ID or Client Secret is not set in server/.env.',
    };
  }

  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Ensures refresh_token is returned
    scope: SCOPES,
    state: userId,
  });

  return { url, configured: true };
}

export async function handleOAuthCallback(code: string, stateUserId: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Retrieve user email identity from Google
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const emailAddress = userInfo.data.email;
  const googleUserId = userInfo.data.id || undefined;

  if (!emailAddress) {
    throw new Error('Unable to retrieve email address from Google OAuth profile.');
  }

  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
  const accessTokenEncrypted = tokens.access_token ? encrypt(tokens.access_token) : null;
  const refreshTokenEncrypted = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

  // Upsert connection in database
  const connection = await prisma.gmailConnection.upsert({
    where: { userId: stateUserId },
    create: {
      userId: stateUserId,
      emailAddress,
      googleUserId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      expiryDate,
      scope: tokens.scope || SCOPES.join(' '),
      status: 'CONNECTED',
      lastSyncAt: new Date(),
    },
    update: {
      emailAddress,
      googleUserId,
      accessTokenEncrypted,
      ...(refreshTokenEncrypted ? { refreshTokenEncrypted } : {}),
      expiryDate,
      scope: tokens.scope || SCOPES.join(' '),
      status: 'CONNECTED',
      lastSyncAt: new Date(),
    },
  });

  return { emailAddress, status: connection.status };
}

export async function getGmailConnection(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return {
      connected: false,
      isConfiguredInEnv: Boolean(config.google.clientId && config.google.clientSecret),
    };
  }

  return {
    connected: connection.status === 'CONNECTED',
    status: connection.status,
    emailAddress: connection.emailAddress,
    lastSyncAt: connection.lastSyncAt,
    isConfiguredInEnv: Boolean(config.google.clientId && config.google.clientSecret),
  };
}

export async function disconnectGmail(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return { success: true };
  }

  if (connection.refreshTokenEncrypted) {
    try {
      const refreshToken = decrypt(connection.refreshTokenEncrypted);
      const oauth2Client = getOAuth2Client();
      await oauth2Client.revokeToken(refreshToken);
    } catch (err) {
      console.warn('Google token revocation warning:', err);
    }
  }

  await prisma.gmailConnection.delete({
    where: { userId },
  });

  return { success: true };
}

// Build MIME RFC 2822 base64url message
function createMimeMessage(params: {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : null,
    params.bcc ? `Bcc: ${params.bcc}` : null,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    params.bodyHtml
      ? `Content-Type: multipart/alternative; boundary="${boundary}"`
      : 'Content-Type: text/plain; charset=UTF-8; format=flowed',
    'Content-Transfer-Encoding: 7bit',
    '',
  ].filter(Boolean);

  let message = headers.join('\r\n') + '\r\n';

  if (params.bodyHtml) {
    message += `--${boundary}\r\n`;
    message += 'Content-Type: text/plain; charset=UTF-8\r\n';
    message += 'Content-Transfer-Encoding: base64\r\n\r\n';
    message += Buffer.from(params.bodyText, 'utf-8').toString('base64') + '\r\n\r\n';

    message += `--${boundary}\r\n`;
    message += 'Content-Type: text/html; charset=UTF-8\r\n';
    message += 'Content-Transfer-Encoding: base64\r\n\r\n';
    message += Buffer.from(params.bodyHtml, 'utf-8').toString('base64') + '\r\n\r\n';

    message += `--${boundary}--\r\n`;
  } else {
    message += params.bodyText + '\r\n';
  }

  // Base64url encoding (replace + with -, / with _, remove =)
  return Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendEmailThroughGmail(params: {
  userId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId: params.userId },
  });

  if (!connection || connection.status !== 'CONNECTED') {
    throw new Error(
      'Gmail account is not connected. Please connect your Gmail account in Integrations before sending.'
    );
  }

  const oauth2Client = getOAuth2Client();

  // Decrypt tokens
  const accessToken = connection.accessTokenEncrypted ? decrypt(connection.accessTokenEncrypted) : null;
  const refreshToken = connection.refreshTokenEncrypted ? decrypt(connection.refreshTokenEncrypted) : null;

  oauth2Client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
    expiry_date: connection.expiryDate ? connection.expiryDate.getTime() : undefined,
  });

  // Listen to new tokens if auto-refreshed
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.access_token) {
      await prisma.gmailConnection.update({
        where: { userId: params.userId },
        data: {
          accessTokenEncrypted: encrypt(newTokens.access_token),
          ...(newTokens.refresh_token ? { refreshTokenEncrypted: encrypt(newTokens.refresh_token) } : {}),
          expiryDate: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
        },
      });
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const rawMessage = createMimeMessage({
    from: connection.emailAddress,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    bodyText: params.bodyText,
    bodyHtml: params.bodyHtml,
  });

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });

    return {
      accepted: true,
      messageId: res.data.id || '',
      threadId: res.data.threadId || '',
      senderEmail: connection.emailAddress,
    };
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      await prisma.gmailConnection.update({
        where: { userId: params.userId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Gmail authorization expired or was revoked. Please reconnect your Gmail account.');
    }
    throw new Error(`Gmail API error: ${error.message || 'Failed to dispatch email'}`);
  }
}
