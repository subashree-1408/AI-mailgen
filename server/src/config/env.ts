import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'mailpilot_default_secret_for_local_development_only',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/integrations/gmail/callback',
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || '',
    senderName: process.env.BREVO_SENDER_NAME || 'MailPilot',
    smtpLogin: process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SENDER_EMAIL || '',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
