export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  gmailConnection?: {
    emailAddress: string;
    status: string;
    lastSyncAt?: string;
  };
  brevoConnection?: {
    senderEmail: string;
    senderName: string;
    isVerified: boolean;
    accountStatus: string;
  };
}

export interface EmailRecord {
  id: string;
  userId: string;
  title?: string;
  recipientEmail: string;
  recipientName?: string;
  cc?: string;
  bcc?: string;
  senderEmail?: string;
  senderName?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  purpose?: string;
  tone?: string;
  length?: string;
  language?: string;
  shortDescription?: string;
  additionalInstructions?: string;
  status: 'DRAFT' | 'READY' | 'SENDING' | 'ACCEPTED' | 'FAILED' | 'CANCELED';
  provider: 'GMAIL' | 'BREVO' | 'MANUAL';
  providerMessageId?: string;
  errorMessage?: string;
  isDraft: boolean;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  sendAttempts?: Array<{
    id: string;
    status: string;
    provider: string;
    errorMessage?: string;
    attemptedAt: string;
  }>;
}

export interface Contact {
  id: string;
  name?: string;
  email: string;
  company?: string;
  notes?: string;
  tags?: string;
}

export interface MarketingContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  listName: string;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'SUPPRESSED' | 'BOUNCED';
  createdAt: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  plainText?: string;
  targetList: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELED';
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  createdAt: string;
}

export interface SequenceStep {
  id?: string;
  stepOrder: number;
  day?: number;
  delayHours: number;
  subject: string;
  previewText?: string;
  bodyHtml: string;
  bodyText: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface Sequence {
  id: string;
  name: string;
  sequenceType: string;
  strategy?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  steps: SequenceStep[];
  enrollments?: Array<{
    id: string;
    contactEmail: string;
    currentStepOrder: number;
    status: string;
  }>;
  createdAt: string;
}

export interface OverviewMetrics {
  personalEmails: {
    totalCreated: number;
    drafts: number;
    sentThroughGmail: number;
    failedAttempts: number;
    contacts?: number;
  };
  marketing: {
    totalCampaigns: number;
    scheduledCampaigns: number;
    activeAutomations: number;
    eligibleContacts: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
  };
  integrations: {
    gmail: {
      status: string;
      emailAddress: string | null;
      lastSyncAt?: string;
    };
    brevo: {
      accountStatus: string;
      senderEmail: string | null;
      senderName?: string;
      isVerified?: boolean;
    };
  };
  recentEmails: EmailRecord[];
}
