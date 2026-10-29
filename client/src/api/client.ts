const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('mailpilot_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('mailpilot_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('mailpilot_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      clearAuthToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1200);
      }
    }
    const errorMessage = (isJson && data?.error) ? data.error : (typeof data === 'string' ? data : 'Request failed');
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  signup: (userData: { name: string; email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  resetWebsiteData: () =>
    request<{ success: boolean; message: string }>('/auth/reset-data', {
      method: 'POST',
    }),

  // AI
  generateEmail: (params: {
    recipientEmail: string;
    recipientName?: string;
    subject?: string;
    shopOrBusinessName?: string;
    purpose?: string;
    tone?: string;
    length?: string;
    businessDomain?: string;
    customDomain?: string;
    additionalInstructions?: string;
    shortDescription?: string;
    language?: string;
    senderName?: string;
    senderEmail?: string;
  }) =>
    request<{ success: boolean; data: any }>('/ai/generate-email', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  suggestSubject: (params: {
    shopOrBusinessName?: string;
    businessDomain?: string;
    customDomain?: string;
    purpose?: string;
    tone?: string;
    instructions?: string;
  }) =>
    request<{ success: boolean; subject: string }>('/ai/suggest-subject', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  rewriteEmail: (params: {
    currentSubject: string;
    currentBody: string;
    instructions: string;
    tone?: string;
    senderName?: string;
  }) =>
    request<{ success: boolean; data: any }>('/ai/rewrite-email', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  improveText: (params: {
    text: string;
    action: 'improve_grammar' | 'shorten' | 'expand' | 'change_tone' | 'translate';
    targetTone?: string;
    targetLanguage?: string;
  }) =>
    request<{ success: boolean; data: { resultText: string } }>('/ai/improve-text', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getSubjectAlternatives: (params: { currentSubject: string; body: string; tone?: string }) =>
    request<{ success: boolean; data: { alternatives: string[] } }>('/ai/subject-alternatives', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  generateSequence: (params: {
    sequenceType?: string;
    productDescription: string;
    targetAudience: string;
    numberOfSteps?: number;
    tone?: string;
    platform?: string;
    goal?: string;
    isDemo?: boolean;
  }) =>
    request<{ success: boolean; data: any }>('/ai/generate-sequence', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Emails
  getEmails: (params?: { status?: string; isDraft?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.isDraft !== undefined) query.set('isDraft', String(params.isDraft));
    if (params?.search) query.set('search', params.search);
    return request<{ emails: any[] }>(`/emails?${query.toString()}`);
  },
  getEmail: (id: string) => request<{ email: any }>(`/emails/${id}`),
  saveEmail: (emailData: any) =>
    request<{ email: any }>('/emails', {
      method: 'POST',
      body: JSON.stringify(emailData),
    }),
  updateEmail: (id: string, updates: any) =>
    request<{ email: any }>(`/emails/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteEmail: (id: string) =>
    request<{ success: boolean }>(`/emails/${id}`, {
      method: 'DELETE',
    }),
  duplicateEmail: (id: string) =>
    request<{ email: any }>(`/emails/${id}/duplicate`, {
      method: 'POST',
    }),
  sendEmailViaGmail: (id: string) =>
    request<{ success: boolean; message: string; email: any; providerMessageId: string }>(
      `/emails/${id}/send?provider=GMAIL`,
      { method: 'POST', body: JSON.stringify({ provider: 'GMAIL' }) }
    ),
  sendEmailViaBrevo: (id: string) =>
    request<{ success: boolean; message: string; email: any; providerMessageId: string }>(
      `/emails/${id}/send?provider=BREVO`,
      { method: 'POST', body: JSON.stringify({ provider: 'BREVO' }) }
    ),

  // Integrations
  getIntegrationsStatus: () => request<{ gmail: any; brevo: any }>('/integrations/status'),
  getGmailConnectUrl: () => request<{ url: string; configured: boolean; error?: string }>('/integrations/gmail/connect'),
  disconnectGmail: () => request<{ success: boolean }>('/integrations/gmail/disconnect', { method: 'POST' }),
  connectGmailDev: (emailAddress: string) =>
    request<{ success: boolean; emailAddress: string }>('/integrations/gmail/dev-connect', {
      method: 'POST',
      body: JSON.stringify({ emailAddress }),
    }),
  getBrevoStatus: () => request<any>('/integrations/brevo/status'),
  verifyBrevo: (data: { apiKey: string; senderEmail: string; senderName: string }) =>
    request<any>('/integrations/brevo/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sendBrevoTestEmail: (toEmail: string) =>
    request<{ success: boolean; message: string }>('/integrations/brevo/test-email', {
      method: 'POST',
      body: JSON.stringify({ toEmail }),
    }),

  // Campaigns
  getCampaigns: () => request<{ campaigns: any[] }>('/campaigns'),
  getCampaign: (id: string) => request<{ campaign: any }>(`/campaigns/${id}`),
  createCampaign: (data: any) =>
    request<{ campaign: any }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  scheduleCampaign: (id: string, scheduledAt: string) =>
    request<{ campaign: any }>(`/campaigns/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    }),
  sendCampaignNow: (id: string) =>
    request<{ success: boolean; message: string; campaign: any }>(`/campaigns/${id}/send-now`, {
      method: 'POST',
    }),
  testSendCampaign: (id: string, testEmail: string) =>
    request<{ success: boolean; message: string }>(`/campaigns/${id}/test-send`, {
      method: 'POST',
      body: JSON.stringify({ testEmail }),
    }),

  // Sequences
  getSequences: () => request<{ sequences: any[] }>('/sequences'),
  getSequence: (id: string) => request<{ sequence: any }>(`/sequences/${id}`),
  createSequence: (data: any) =>
    request<{ sequence: any }>('/sequences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  enrollInSequence: (id: string, contactEmail: string) =>
    request<{ success: boolean; message: string; enrollment: any }>(`/sequences/${id}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ contactEmail }),
    }),
  pauseSequence: (id: string) =>
    request<{ sequence: any }>(`/sequences/${id}/pause`, { method: 'POST' }),
  resumeSequence: (id: string) =>
    request<{ sequence: any }>(`/sequences/${id}/resume`, { method: 'POST' }),

  // Contacts
  getContacts: (q?: string) =>
    request<{ contacts: any[] }>(`/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createContact: (data: any) =>
    request<{ contact: any }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteContact: (id: string) =>
    request<{ success: boolean }>(`/contacts/${id}`, { method: 'DELETE' }),
  getMarketingContacts: () => request<{ contacts: any[] }>('/contacts/marketing'),
  createMarketingContact: (data: any) =>
    request<{ contact: any }>('/contacts/marketing', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Analytics
  getAnalyticsOverview: () => request<any>('/analytics/overview'),
};
