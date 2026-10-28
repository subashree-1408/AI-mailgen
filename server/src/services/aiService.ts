import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiInstance = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiInstance;
}

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

async function callGemini(prompt: string, jsonMode = true): Promise<string> {
  const ai = getAI();
  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: jsonMode
          ? {
              responseMimeType: 'application/json',
              temperature: 0.7,
            }
          : {
              temperature: 0.7,
            },
      });

      const text = response.text;
      if (text) {
        return text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next candidate... (${err.message || err})`);
      lastError = err;
    }
  }

  throw new Error(
    `AI generation failed across all available Gemini models. ${lastError?.message || 'Please check your API key and quota.'}`
  );
}

export interface GenerateEmailParams {
  shortDescription?: string;
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  shopOrBusinessName?: string;
  purpose?: string;
  tone?: string;
  length?: 'Low' | 'Medium' | 'High' | 'Short' | 'Detailed' | string;
  businessDomain?: string;
  customDomain?: string;
  language?: string;
  additionalInstructions?: string;
  senderName?: string;
  senderEmail?: string;
}

export interface GeneratedEmailResult {
  subject: string;
  greeting: string;
  body: string;
  closing: string;
  signature: string;
  fullContent: string;
}

export async function generateSubjectSuggestion(params: {
  shopOrBusinessName?: string;
  businessDomain?: string;
  customDomain?: string;
  purpose?: string;
  tone?: string;
  instructions?: string;
}): Promise<{ subject: string }> {
  const domain = params.businessDomain === 'Other' && params.customDomain
    ? params.customDomain
    : params.businessDomain || 'General Business';
  const shop = params.shopOrBusinessName || '';
  const purpose = params.purpose || 'Business Inquiry';

  const prompt = `
Generate a single, compelling, professional email subject line:
- Shop / Business Name: "${shop || 'Relevant Business'}"
- Business Domain / Category: "${domain}"
- Purpose: "${purpose}"
- Tone: "${params.tone || 'Professional'}"
- Context / Notes: "${params.instructions || 'Direct outreach'}"

The subject line must be natural, relevant to ${domain}, and clear. Avoid spam triggers and ALL-CAPS.
Return ONLY valid JSON:
{
  "subject": "Specific compelling subject line here"
}
`;

  try {
    const rawJson = await callGemini(prompt, true);
    const parsed = JSON.parse(rawJson);
    return { subject: parsed.subject || `${purpose} regarding ${shop || domain}` };
  } catch (err) {
    return { subject: `${purpose} - ${shop || domain}` };
  }
}

export async function generateEmail(params: GenerateEmailParams): Promise<GeneratedEmailResult> {
  const {
    recipientEmail,
    recipientName = '',
    subject = '',
    shopOrBusinessName = '',
    purpose = 'Business Conversation',
    tone = 'Professional',
    length = 'Medium',
    businessDomain = 'General Business',
    customDomain = '',
    language = 'English',
    additionalInstructions = '',
    shortDescription = '',
    senderName = '',
  } = params;

  const effectiveDomain = businessDomain === 'Other' && customDomain
    ? customDomain
    : businessDomain || 'General Business';

  const lengthExplanation =
    length === 'Low' || length === 'Short'
      ? 'LOW / SHORT (1-2 tight, concise paragraphs; quick to read)'
      : length === 'High' || length === 'Detailed'
      ? 'HIGH / DETAILED (3-4 comprehensive paragraphs with thorough explanation, context, and clear details)'
      : 'MEDIUM / BALANCED (2-3 well-balanced paragraphs with sufficient details and clear structure)';

  const effectiveInstructions = additionalInstructions || shortDescription || '';

  const prompt = `
You are an expert executive email copywriter.
Generate a tailored, high-converting, professional email adhering strictly to these requirements:

TARGET BUSINESS & CONTEXT:
- Recipient Email: "${recipientEmail}"
- Recipient Name: "${recipientName || ''}"
- Shop or Business Name: "${shopOrBusinessName || 'Not specified'}"
- Business Domain / Category: "${effectiveDomain}"
- Email Type / Purpose: "${purpose}"
- Email Tone / Mode: "${tone}"
- Length Requirement: ${lengthExplanation}
- User Instructions ("What should this email say?"): "${effectiveInstructions || 'Draft a relevant outreach based on domain and purpose'}"
- User Pre-typed Subject: "${subject || 'None'}"
- Language: "${language}"
- Sender Name: "${senderName || 'Sender'}"

DOMAIN-SPECIFIC WRITING RULES:
1. Deeply align with the Business Domain ("${effectiveDomain}") and Shop Name ("${shopOrBusinessName || 'the recipient business'}").
   Example: If the domain is "Sports & Sports Equipment" and purpose is "Sponsorship Request" for "Chennai Sports World", discuss sports events, tournaments, athletic gear, and community visibility rather than generic corporate buzzwords.
2. The writing tone must authentically reflect "${tone}" (Professional, Formal, Casual, Friendly, or Persuasive).
3. The email length must strictly follow the ${lengthExplanation} requirement.
4. If a User Pre-typed Subject was provided and is not empty, you may refine it or adopt it; otherwise create a crisp, relevant subject line.
5. Provide a suitable greeting, well-structured body with natural paragraph breaks, a professional closing, and sender signature.
6. NEVER invent unsupported business numbers, false dates, fake awards, or personal credentials.
7. HIGHLIGHT COMPANY NAME: When you mention the Shop, Business, or Company Name ("${shopOrBusinessName}") anywhere in the greeting or body, you MUST format and highlight it in bold letters using double asterisks (e.g. **${shopOrBusinessName}**).

Return ONLY a valid JSON object matching this exact schema:
{
  "subject": "Clear, relevant subject line",
  "greeting": "e.g. Dear [Name/Team] or Hi [Name],",
  "body": "The complete main paragraphs of the email, separated by double newlines",
  "closing": "e.g. Best regards, / Sincerely, / Warm regards,",
  "signature": "${senderName || 'Your Name'}"
}
`;

  const rawJson = await callGemini(prompt, true);
  try {
    const parsed = JSON.parse(rawJson);
    const generatedSubject = parsed.subject || subject || `${purpose} - ${shopOrBusinessName || effectiveDomain}`;
    const rawGreeting = parsed.greeting || (recipientName ? `Hi ${recipientName},` : shopOrBusinessName ? `Dear ${shopOrBusinessName} Team,` : 'Hello,');
    const rawBody = parsed.body || '';
    const closing = parsed.closing || 'Best regards,';
    const signature = parsed.signature || senderName || '';

    // Ensure company name is highlighted in bold
    const greeting = highlightCompanyName(rawGreeting, shopOrBusinessName);
    const body = highlightCompanyName(rawBody, shopOrBusinessName);
    const fullContent = `${greeting}\n\n${body}\n\n${closing}\n${signature}`.trim();

    return {
      subject: generatedSubject,
      greeting,
      body,
      closing,
      signature,
      fullContent,
    };
  } catch (err) {
    throw new Error('Failed to parse structured response from Gemini API.');
  }
}

export function highlightCompanyName(text: string, companyName?: string): string {
  if (!text || !companyName || !companyName.trim()) return text;
  const name = companyName.trim();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Matches occurrences that are not already enclosed in **
  return text.replace(new RegExp(`(?<!\\*\\*)(${escaped})(?!\\*\\*)`, 'gi'), '**$1**');
}

export function formatEmailHtml(text: string, companyName?: string): string {
  if (!text) return '';
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Ensure company name is bolded
  safe = highlightCompanyName(safe, companyName);

  // Convert **bold** to <strong>bold</strong>
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #0f172a;">$1</strong>');

  // Convert paragraphs
  const paragraphs = safe
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #1e293b;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b; background-color: #ffffff; padding: 24px 16px; max-width: 650px; margin: 0 auto;">
  ${paragraphs}
</body>
</html>
  `.trim();
}

export async function rewriteEmail(params: {
  currentSubject: string;
  currentBody: string;
  instructions: string;
  tone?: string;
  senderName?: string;
}): Promise<GeneratedEmailResult> {
  const prompt = `
Rewrite and refine this email according to the user's instructions:

Current Subject: "${params.currentSubject}"
Current Body:
"""
${params.currentBody}
"""

Instructions: "${params.instructions}"
Desired Tone: "${params.tone || 'Professional'}"
Sender Name: "${params.senderName || ''}"

Return ONLY a JSON object:
{
  "subject": "Refined subject line",
  "greeting": "Greeting line",
  "body": "Rewritten body paragraphs",
  "closing": "Closing sign-off",
  "signature": "Sender name or signature"
}
`;

  const rawJson = await callGemini(prompt, true);
  const parsed = JSON.parse(rawJson);
  const subject = parsed.subject || params.currentSubject;
  const greeting = parsed.greeting || '';
  const body = parsed.body || '';
  const closing = parsed.closing || 'Best regards,';
  const signature = parsed.signature || params.senderName || '';
  const fullContent = `${greeting ? greeting + '\n\n' : ''}${body}\n\n${closing}\n${signature}`.trim();

  return { subject, greeting, body, closing, signature, fullContent };
}

export async function improveEmailText(params: {
  text: string;
  action: 'improve_grammar' | 'shorten' | 'expand' | 'change_tone' | 'translate';
  targetTone?: string;
  targetLanguage?: string;
}): Promise<{ resultText: string }> {
  let instruction = '';
  switch (params.action) {
    case 'improve_grammar':
      instruction = 'Fix all grammar, punctuation, and phrasing errors while maintaining the exact voice and meaning.';
      break;
    case 'shorten':
      instruction = 'Make this email significantly more concise, direct, and punchy without losing key action items.';
      break;
    case 'expand':
      instruction = 'Elaborate on the key points with courteous, professional context, without hallucinating facts.';
      break;
    case 'change_tone':
      instruction = `Shift the tone of this email to be distinctively "${params.targetTone || 'Professional'}" while keeping all core facts intact.`;
      break;
    case 'translate':
      instruction = `Translate this email naturally into "${params.targetLanguage || 'English'}", keeping business etiquette intact.`;
      break;
  }

  const prompt = `
You are a senior executive communication editor.
${instruction}

Original content:
"""
${params.text}
"""

Return ONLY a JSON object:
{
  "resultText": "The edited and improved text"
}
`;

  const rawJson = await callGemini(prompt, true);
  const parsed = JSON.parse(rawJson);
  return { resultText: parsed.resultText || params.text };
}

export async function generateSubjectAlternatives(params: {
  currentSubject: string;
  body: string;
  tone?: string;
}): Promise<{ alternatives: string[] }> {
  const prompt = `
Generate 4 high-converting, clear, professional alternative email subject lines for this email.
Current Subject: "${params.currentSubject}"
Body:
"""
${params.body}
"""

Tone: "${params.tone || 'Professional'}"

Return ONLY a JSON object:
{
  "alternatives": [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4"
  ]
}
`;

  const rawJson = await callGemini(prompt, true);
  const parsed = JSON.parse(rawJson);
  return { alternatives: parsed.alternatives || [params.currentSubject] };
}

export interface GenerateSequenceParams {
  sequenceType: string;
  productDescription: string;
  targetAudience: string;
  numberOfSteps?: number;
  tone?: string;
  platform?: string; // 'Email' | 'WhatsApp' | 'Instagram' | 'LinkedIn' | 'SMS'
  goal?: string;     // 'Brand awareness' | 'Lead generation' | 'Product launch' | 'Customer engagement' | 'Sales conversion'
  isDemo?: boolean;  // Offline template generator
}

export interface GeneratedSequenceStep {
  stepOrder: number;
  day?: number;
  delayHours: number;
  subject: string;
  previewText: string;
  bodyHtml: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
}

export interface GeneratedSequenceResult {
  strategy: string;
  platform: string;
  steps: GeneratedSequenceStep[];
}

export async function generateMarketingSequence(
  params: GenerateSequenceParams
): Promise<GeneratedSequenceResult> {
  const stepsCount = Math.min(Math.max(params.numberOfSteps || 3, 2), 5);
  const platform = params.platform || 'Email';
  const goal = params.goal || params.sequenceType || 'Product launch';

  // If Demo Mode is requested, generate instant offline template sequence
  if (params.isDemo) {
    const templates = [
      {
        subject: `Meet ${params.productDescription}`,
        body: `Introducing ${params.productDescription}! Made for ${params.targetAudience}. Discover how it fits your needs.`,
        cta: 'Learn more',
      },
      {
        subject: `Why ${params.productDescription}?`,
        body: `Looking for a better solution? Explore the benefits of ${params.productDescription} and see what makes it worth considering.`,
        cta: 'Explore features',
      },
      {
        subject: 'Explore the details',
        body: `Curious about ${params.productDescription}? Take a closer look and decide whether it is right for you.`,
        cta: 'See how it works',
      },
      {
        subject: "Questions? We've got answers",
        body: `Have questions about ${params.productDescription}? Reach out and learn more before making a decision.`,
        cta: 'Ask questions',
      },
      {
        subject: 'Ready to get started?',
        body: `If ${params.productDescription} sounds right for you, take the next step today.`,
        cta: 'Get started now',
      },
    ];

    const demoSteps: GeneratedSequenceStep[] = [];
    for (let i = 0; i < stepsCount; i++) {
      const day = 1 + i * 2;
      const t = templates[i % templates.length];
      demoSteps.push({
        stepOrder: i + 1,
        day,
        delayHours: i === 0 ? 0 : 48,
        subject: t.subject,
        previewText: `${params.productDescription} for ${params.targetAudience}`,
        bodyText: t.body,
        bodyHtml: `<p>${t.body}</p><p><a href="#learn-more" style="display:inline-block;padding:8px 16px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">${t.cta}</a></p>`,
        ctaText: t.cta,
        ctaUrl: '#learn-more',
      });
    }

    return {
      strategy: `Offline Template Sequence for ${platform} targeting ${goal}.`,
      platform,
      steps: demoSteps,
    };
  }

  // AI Mode (Gemini)
  const prompt = `
You are a senior marketing automation strategist.
Create an automated ${stepsCount}-step marketing sequence for:
- Marketing Platform: "${platform}" (Email, WhatsApp, Instagram, LinkedIn, SMS)
- Campaign Goal: "${goal}" (e.g. Brand awareness, Lead generation, Product launch, Customer engagement, Sales conversion)
- Product/Service Description: "${params.productDescription}"
- Target Audience: "${params.targetAudience}"
- Tone: "${params.tone || 'Friendly & Persuasive'}"

Return a comprehensive sequence including campaign strategy and each step with:
- stepOrder (1, 2, 3...)
- day (1, 3, 5... positive increasing integer)
- delayHours (0 for first message, 24 for 1 day delay, 48 for 2 days delay, etc.)
- subject (Compelling subject line or social/WhatsApp hook)
- previewText (Compelling preheader or summary)
- bodyHtml (Clean, responsive HTML message body with inline styling and CTA button if platform is Email; or formatted text for WhatsApp/social)
- bodyText (Plain text version of message)
- call_to_action (Call to action button or message text)
- ctaUrl (Placeholder CTA destination)

Return ONLY a JSON object:
{
  "strategy": "Executive summary of the sequence strategy and conversion goal",
  "steps": [
    {
      "stepOrder": 1,
      "day": 1,
      "delayHours": 0,
      "subject": "...",
      "previewText": "...",
      "bodyHtml": "...",
      "bodyText": "...",
      "ctaText": "...",
      "ctaUrl": "#"
    }
  ]
}
`;

  const rawJson = await callGemini(prompt, true);
  const parsed = JSON.parse(rawJson);
  const steps: GeneratedSequenceStep[] = (parsed.steps || []).map((s: any, idx: number) => ({
    stepOrder: s.stepOrder || idx + 1,
    day: s.day || 1 + idx * 2,
    delayHours: s.delayHours !== undefined ? s.delayHours : idx * 24,
    subject: s.subject || `Message ${idx + 1}`,
    previewText: s.previewText || '',
    bodyHtml: s.bodyHtml || `<p>${s.bodyText || ''}</p>`,
    bodyText: s.bodyText || '',
    ctaText: s.ctaText || s.call_to_action || 'Learn more',
    ctaUrl: s.ctaUrl || '#',
  }));

  return {
    strategy: parsed.strategy || `Multi-step ${platform} sequence for ${goal}`,
    platform,
    steps,
  };
}
