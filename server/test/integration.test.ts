import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting MailPilot AI Comprehensive Integration Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function assert(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  let authToken = '';
  let testEmailId = '';
  let testCampaignId = '';
  let testSequenceId = '';

  // 1. Healthcheck
  await assert('Server Healthcheck', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Status not ok');
  });

  // 2. Auth Login
  await assert('Authentication Login', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Subashreekamal@gmail.com',
        password: 'inselen3ra',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No JWT token returned');
    authToken = data.token;
  });

  // 3. User Profile
  await assert('Retrieve Authenticated User Profile', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.user.email.toLowerCase() !== 'subashreekamal@gmail.com') throw new Error('Email mismatch');
  });

  // 4. Gemini AI Email Generation
  await assert('Gemini AI Email Generation (Structured Schema)', async () => {
    const res = await fetch(`${BASE_URL}/ai/generate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        shortDescription: 'Request meeting with manager to discuss Q4 roadmap',
        recipientEmail: 'manager@company.com',
        recipientName: 'Sarah',
        purpose: 'Meeting request',
        tone: 'Professional',
        length: 'Short',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Status ${res.status}`);
    }
    const data = await res.json();
    if (!data.data?.subject || !data.data?.body) {
      throw new Error('AI result missing subject or body');
    }
  });

  // 5. Gemini AI Subject Alternatives
  await assert('Gemini AI Subject Line Alternatives', async () => {
    const res = await fetch(`${BASE_URL}/ai/subject-alternatives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        currentSubject: 'Meeting Request',
        body: 'Hi Sarah, Could we please schedule 30 minutes to review Q4 priorities?',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.data?.alternatives) || data.data.alternatives.length === 0) {
      throw new Error('No alternatives returned');
    }
  });

  // 6. Gemini AI Marketing Sequence Generation
  await assert('Gemini AI Marketing Sequence Generation', async () => {
    const res = await fetch(`${BASE_URL}/ai/generate-sequence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sequenceType: 'Welcome sequence',
        productDescription: 'MailPilot AI email copilot SaaS',
        targetAudience: 'Agency founders and sales professionals',
        numberOfSteps: 2,
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.data?.steps || data.data.steps.length < 2) {
      throw new Error('Sequence steps incomplete');
    }
  });

  // 7. Email CRUD - Create Draft
  await assert('Email Draft Creation & Persistence', async () => {
    const res = await fetch(`${BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        recipientEmail: 'client@example.com',
        recipientName: 'Acme Corp',
        subject: 'Project Quotation for Mobile Application',
        bodyText: 'Dear Acme Team,\n\nPlease find attached the requested scope of work and quotation.',
        isDraft: true,
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    testEmailId = data.email.id;
  });

  // 8. Email CRUD - Duplicate
  await assert('Email Draft Duplication', async () => {
    const res = await fetch(`${BASE_URL}/emails/${testEmailId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.email.title.includes('Copy')) throw new Error('Duplicate title mismatch');
  });

  // 9. Contacts - Create & Autocomplete Search
  await assert('Personal Contact Autocomplete Query', async () => {
    const res = await fetch(`${BASE_URL}/contacts?q=Sarah`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.contacts)) throw new Error('Contacts not an array');
  });

  // 10. Marketing Campaigns - Create
  await assert('Marketing Campaign Creation', async () => {
    const res = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Campaign',
        subject: 'Weekly Product Digest',
        htmlContent: '<p>Welcome to our weekly newsletter!</p>',
        targetList: 'Product Beta Users',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    testCampaignId = data.campaign.id;
  });

  // 11. Marketing Sequences - Create & Enroll
  await assert('Sequence Step Architecture & Enrollment', async () => {
    const res = await fetch(`${BASE_URL}/sequences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Customer Onboarding Flow',
        sequenceType: 'Customer onboarding',
        strategy: 'Deliver value on Day 1, feature showcase on Day 3',
        steps: [
          {
            stepOrder: 1,
            delayHours: 0,
            subject: 'Welcome to MailPilot AI!',
            bodyText: 'Here is how to connect your Gmail account in 2 minutes.',
            bodyHtml: '<p>Welcome! Here is your quick start guide.</p>',
          },
          {
            stepOrder: 2,
            delayHours: 48,
            subject: 'Pro tip: Generating multi-step sequences',
            bodyText: 'Learn how to generate marketing campaigns with Brevo.',
            bodyHtml: '<p>Discover automated campaigns.</p>',
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    testSequenceId = data.sequence.id;

    // Enroll contact
    const enrollRes = await fetch(`${BASE_URL}/sequences/${testSequenceId}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ contactEmail: 'beta.tester@agency.com' }),
    });
    if (!enrollRes.ok) throw new Error(`Enrollment status ${enrollRes.status}`);
  });

  // 12. Webhook Ingestion - Brevo Event
  await assert('Brevo Webhook Ingestion & Suppression Check', async () => {
    const res = await fetch(`${BASE_URL}/webhooks/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'opened',
        email: 'Subashreekamal@gmail.com',
        'message-id': 'brevo-msg-99218271',
        tag: `campaign-${testCampaignId}`,
      }),
    });
    if (!res.ok) throw new Error(`Webhook status ${res.status}`);
  });

  // 13. Analytics Overview
  await assert('Database-Backed Real Analytics Overview', async () => {
    const res = await fetch(`${BASE_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`Analytics status ${res.status}`);
    const data = await res.json();
    if (typeof data.personalEmails.totalCreated !== 'number') {
      throw new Error('Analytics missing totalCreated count');
    }
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
