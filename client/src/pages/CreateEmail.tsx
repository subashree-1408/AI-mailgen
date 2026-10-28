import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Save,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Minimize2,
  Maximize2,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  HelpCircle,
  Building2,
  Briefcase,
  Layers,
  Sliders,
  AlignLeft,
  Mail,
  Zap,
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { ContactAutocomplete } from '../components/email/ContactAutocomplete.js';

// Exact Tone Options
const TONES = [
  { id: 'Professional', label: 'Professional', desc: 'Polished, respectful, and articulate' },
  { id: 'Formal', label: 'Formal', desc: 'Dignified and traditional business protocol' },
  { id: 'Casual', label: 'Casual', desc: 'Modern, relaxed, and easygoing' },
  { id: 'Friendly', label: 'Friendly', desc: 'Warm, approachable, and encouraging' },
  { id: 'Persuasive', label: 'Persuasive', desc: 'Compelling, value-driven, and clear CTA' },
];

// Exact Length Options
const LENGTHS = [
  { id: 'Low', label: 'Low', title: 'Short & Concise', desc: '1-2 tight paragraphs for quick reading' },
  { id: 'Medium', label: 'Medium', title: 'Balanced', desc: '2-3 structured paragraphs with sufficient details' },
  { id: 'High', label: 'High', title: 'Detailed', desc: 'Comprehensive with thorough context and explanation' },
];

// Exact Purpose Options
const PURPOSES = [
  'Product Inquiry',
  'Business Conversation',
  'Collaboration',
  'Sponsorship Request',
  'Partnership Proposal',
  'Price / Quotation Request',
  'Product Purchase Inquiry',
  'Wholesale Inquiry',
  'Follow-up Email',
  'Complaint / Support',
  'Custom Email',
];

// Exact Business Domain Options
const DOMAINS = [
  'Sports & Sports Equipment',
  'Food & Restaurants',
  'Clothing & Fashion',
  'Accessories',
  'Electronics & Gadgets',
  'Footwear',
  'Healthcare',
  'Education',
  'Beauty & Personal Care',
  'Automotive',
  'General Business',
  'Other',
];

export const CreateEmail: React.FC<{ initialDraftId?: string; onTabChange?: (tab: string) => void }> = ({
  initialDraftId,
  onTabChange,
}) => {
  const { user } = useAuth();

  // Workflow Step: 'details' (Step 1) | 'review' (Step 3)
  const [currentStep, setCurrentStep] = useState<'details' | 'review'>('details');

  // Form Fields (in exact order)
  // 1. Recipient Details
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');

  // 2. Shop or Business Name
  const [shopOrBusinessName, setShopOrBusinessName] = useState('');

  // 3. Email Tone / Mode
  const [tone, setTone] = useState('Professional');

  // 4. Email Length
  const [length, setLength] = useState('Medium');

  // 5. Email Type / Purpose
  const [purpose, setPurpose] = useState('Business Conversation');
  const [customPurpose, setCustomPurpose] = useState('');

  // 6. Business Domain / Category
  const [businessDomain, setBusinessDomain] = useState('General Business');
  const [customDomain, setCustomDomain] = useState('');

  // 7. Additional Instructions ("What should this email say?")
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Generated / Review state
  const [bodyText, setBodyText] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialDraftId || null);

  // Loading & Feedback states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingSubject, setIsSuggestingSubject] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendProvider, setSendProvider] = useState<'BREVO' | 'GMAIL'>('BREVO');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-load draft if provided
  useEffect(() => {
    if (initialDraftId) {
      api.getEmail(initialDraftId)
        .then((res) => {
          if (res?.email) {
            const e = res.email;
            setCurrentDraftId(e.id);
            setRecipientEmail(e.recipientEmail || '');
            setRecipientName(e.recipientName || '');
            setSubject(e.subject || '');
            setBodyText(e.bodyText || '');
            if (e.purpose) setPurpose(e.purpose);
            if (e.tone) setTone(e.tone);
            if (e.length) setLength(e.length);
            if (e.additionalInstructions) setAdditionalInstructions(e.additionalInstructions);
            if (e.bodyText) setCurrentStep('review');
          }
        })
        .catch(console.error);
    }
  }, [initialDraftId]);

  // AI Subject Suggestion
  const handleSuggestSubject = async () => {
    try {
      setIsSuggestingSubject(true);
      setErrorMsg(null);
      const res = await api.suggestSubject({
        shopOrBusinessName,
        businessDomain: businessDomain === 'Other' && customDomain ? customDomain : businessDomain,
        purpose: purpose === 'Custom Email' && customPurpose ? customPurpose : purpose,
        tone,
        instructions: additionalInstructions,
      });
      if (res?.subject) {
        setSubject(res.subject);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to suggest subject line.');
    } finally {
      setIsSuggestingSubject(false);
    }
  };

  // Generate Email
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMsg('Please enter a valid recipient email address (To).');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const effectivePurpose = purpose === 'Custom Email' && customPurpose ? customPurpose : purpose;
      const effectiveDomain = businessDomain === 'Other' && customDomain ? customDomain : businessDomain;

      const res = await api.generateEmail({
        recipientEmail,
        recipientName,
        subject,
        shopOrBusinessName,
        purpose: effectivePurpose,
        tone,
        length,
        businessDomain: effectiveDomain,
        customDomain,
        additionalInstructions,
        senderName: user?.name,
        senderEmail: user?.email,
      });

      if (res?.data) {
        if (!subject || subject.trim() === '') {
          setSubject(res.data.subject || '');
        }
        setBodyText(res.data.body || res.data.fullContent || '');

        // Persist draft in database
        try {
          if (currentDraftId) {
            await api.updateEmail(currentDraftId, {
              recipientEmail,
              recipientName,
              subject: res.data.subject || subject,
              bodyText: res.data.body || res.data.fullContent || '',
              purpose: effectivePurpose,
              tone,
              length,
              additionalInstructions,
              provider: 'BREVO',
            });
          } else {
            const draft = await api.saveEmail({
              recipientEmail,
              recipientName,
              subject: res.data.subject || subject,
              bodyText: res.data.body || res.data.fullContent || '',
              purpose: effectivePurpose,
              tone,
              length,
              additionalInstructions,
              isDraft: true,
              provider: 'BREVO',
            });
            if (draft?.email?.id) {
              setCurrentDraftId(draft.email.id);
            }
          }
        } catch (saveErr) {
          console.warn('Draft save notice:', saveErr);
        }

        // Transition to Review & Send Screen
        setCurrentStep('review');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate email with Gemini. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Draft manually
  const handleSaveDraft = async () => {
    if (!recipientEmail) {
      setErrorMsg('Recipient email is required to save a draft.');
      return;
    }
    try {
      setIsSavingDraft(true);
      setErrorMsg(null);
      const effectivePurpose = purpose === 'Custom Email' && customPurpose ? customPurpose : purpose;
      const draftData = {
        recipientEmail,
        recipientName,
        subject: subject || '(Draft)',
        bodyText,
        purpose: effectivePurpose,
        tone,
        length,
        additionalInstructions,
        isDraft: true,
        provider: 'BREVO',
      };

      if (currentDraftId) {
        await api.updateEmail(currentDraftId, draftData);
      } else {
        const res = await api.saveEmail(draftData);
        if (res?.email?.id) setCurrentDraftId(res.email.id);
      }
      setSuccessMsg('Draft saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Improve Text tools
  const handleImproveText = async (action: 'improve_grammar' | 'shorten' | 'expand' | 'change_tone') => {
    if (!bodyText.trim()) return;
    try {
      setIsImproving(true);
      setErrorMsg(null);
      const res = await api.improveText({
        text: bodyText,
        action,
        targetTone: tone,
      });
      if (res?.data?.resultText) {
        setBodyText(res.data.resultText);
        setSuccessMsg(`Email updated via AI ${action.replace('_', ' ')}.`);
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to improve email content.');
    } finally {
      setIsImproving(false);
    }
  };

  // Copy Email to clipboard
  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${bodyText}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send Email via Brevo backend
  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMsg('Please specify a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Email subject cannot be empty.');
      return;
    }
    if (!bodyText.trim()) {
      setErrorMsg('Email body content cannot be empty.');
      return;
    }

    try {
      setIsSending(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // 1. Ensure email record is saved
      let emailId = currentDraftId;
      const effectivePurpose = purpose === 'Custom Email' && customPurpose ? customPurpose : purpose;

      if (!emailId) {
        const saved = await api.saveEmail({
          recipientEmail,
          recipientName,
          subject,
          bodyText,
          purpose: effectivePurpose,
          tone,
          length,
          additionalInstructions,
          isDraft: false,
          provider: sendProvider,
        });
        emailId = saved.email.id;
        setCurrentDraftId(emailId);
      } else {
        await api.updateEmail(emailId, {
          recipientEmail,
          recipientName,
          subject,
          bodyText,
          isDraft: false,
          provider: sendProvider,
        });
      }

      // 2. Dispatch via chosen backend provider
      if (!emailId) throw new Error('Failed to initialize email record before sending.');

      const result = sendProvider === 'BREVO'
        ? await api.sendEmailViaBrevo(emailId)
        : await api.sendEmailViaGmail(emailId);

      if (result.success) {
        setSuccessMsg(result.message || `Email successfully sent via ${sendProvider === 'BREVO' ? 'Brevo backend' : 'Gmail'}!`);
        if (onTabChange) {
          setTimeout(() => {
            onTabChange('my-emails');
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Send error:', err);
      setErrorMsg(err.message || `Failed to dispatch email through ${sendProvider === 'BREVO' ? 'Brevo backend' : 'Gmail API'}.`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Step Breadcrumbs / Progress Indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-semibold">
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep('details')}
            className={`flex items-center space-x-2 cursor-pointer transition ${
              currentStep === 'details'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep === 'details'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              1
            </div>
            <span>Email Details</span>
          </div>

          <div className="flex-1 h-0.5 mx-4 bg-slate-200" />

          {/* Step 2 */}
          <div className="flex items-center space-x-2 text-slate-400">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                isGenerating ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </div>
            <span>Generate</span>
          </div>

          <div className="flex-1 h-0.5 mx-4 bg-slate-200" />

          {/* Step 3 */}
          <div
            onClick={() => {
              if (bodyText) setCurrentStep('review');
            }}
            className={`flex items-center space-x-2 transition ${
              currentStep === 'review'
                ? 'text-indigo-600 font-bold'
                : bodyText
                ? 'text-slate-500 hover:text-slate-800 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep === 'review'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <span>Review & Send</span>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-900 text-xs shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Action Required</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-900 text-xs shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium flex-1">{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: EMAIL CREATION FORM (Exact Required Fields Order) */}
      {/* ======================================================== */}
      {currentStep === 'details' && (
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Create New Email</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fill in the details below. Gemini AI will craft a personalized email tailored to your business domain and purpose.
              </p>
            </div>

            {/* 1. Recipient Details */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Recipient Details</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* To: */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    To <span className="text-rose-500">*</span>
                  </label>
                  <ContactAutocomplete
                    value={recipientEmail}
                    onChange={(email, name) => {
                      setRecipientEmail(email);
                      if (name) setRecipientName(name);
                    }}
                    placeholder="recipient@business.com"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Recipient's email address (type or select from saved contacts)</p>
                </div>

                {/* Subject: */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Subject
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggestSubject}
                      disabled={isSuggestingSubject}
                      className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isSuggestingSubject ? 'animate-spin' : ''}`} />
                      <span>{isSuggestingSubject ? 'Generating Suggestion...' : 'Suggest Subject with AI'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject or click 'Suggest Subject with AI'"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shop or Business Name */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Shop or Business Name</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Company Name
                </label>
                <input
                  type="text"
                  value={shopOrBusinessName}
                  onChange={(e) => setShopOrBusinessName(e.target.value)}
                  placeholder="e.g., Chennai Sports World, Nike Store, Fashion Hub, or ABC Electronics"
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the specific shop or company name to personalize the context and greeting.
                </p>
              </div>
            </div>

            {/* 3. Email Tone / Mode */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Email Tone / Mode</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                      tone === t.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{t.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Email Length */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  4
                </span>
                <span>Email Length</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LENGTHS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLength(l.id)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                      length === l.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{l.label}</span>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                        {l.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Email Type / Purpose */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  5
                </span>
                <span>Email Type / Purpose</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      purpose === p
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {purpose === 'Custom Email' && (
                <div className="mt-2 animate-in fade-in">
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="Specify your custom email purpose..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* 6. Business Domain / Category */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  6
                </span>
                <span>Business Domain / Category</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBusinessDomain(d)}
                    className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition cursor-pointer truncate ${
                      businessDomain === d
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                    title={d}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {businessDomain === 'Other' && (
                <div className="mt-2 animate-in fade-in">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="Specify your industry or custom domain (e.g. Real Estate, Solar Energy)..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* 7. Additional Instructions */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  7
                </span>
                <span>What should this email say? (Optional)</span>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Describe your requirements in simple words (e.g., We are organizing a state-level badminton tournament and would love to partner with Chennai Sports World as our equipment sponsor with banner placement)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-relaxed resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Gemini will combine your instructions with the shop name, domain, and purpose to produce a tailored email.
                </p>
              </div>
            </div>

            {/* 8. Generate Email Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !recipientEmail}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
              </button>

              <button
                type="submit"
                disabled={isGenerating}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Generating Email with Gemini...' : 'Generate Email'}</span>
                {!isGenerating && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* STEP 3: REVIEW AND SEND SCREEN */}
      {/* ======================================================== */}
      {currentStep === 'review' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-0 animate-in fade-in">
          {/* Header & Navigation */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <button
              onClick={() => setCurrentStep('details')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Edit Details</span>
            </button>

            {/* Toolbar Actions: Edit, Regenerate, Improve, Copy */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 shadow-2xs"
                title="Regenerate email with current parameters"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>

              <button
                onClick={() => handleImproveText('improve_grammar')}
                disabled={isImproving}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 shadow-2xs"
                title="Fix grammar & polish writing"
              >
                <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Fix Grammar</span>
              </button>

              <button
                onClick={() => handleImproveText('shorten')}
                disabled={isImproving}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1 disabled:opacity-50 shadow-2xs"
                title="Shorten text"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Shorten</span>
              </button>

              <button
                onClick={() => handleImproveText('expand')}
                disabled={isImproving}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1 disabled:opacity-50 shadow-2xs"
                title="Expand text"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                title="Copy full email to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Email'}</span>
              </button>
            </div>
          </div>

          {/* Email Review Body */}
          <div className="p-6 sm:p-8 space-y-4">
            {/* Context Badge */}
            <div className="flex flex-wrap items-center gap-2 pb-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Configured Context:</span>
              {shopOrBusinessName && (
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium border border-indigo-100">
                  Shop: {shopOrBusinessName}
                </span>
              )}
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                Domain: {businessDomain === 'Other' && customDomain ? customDomain : businessDomain}
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                Purpose: {purpose === 'Custom Email' && customPurpose ? customPurpose : purpose}
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                Tone: {tone}
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                Length: {length}
              </span>
            </div>

            {/* Editable To */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                To
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Editable Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Editable Email Body */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Email Body
              </label>
              <textarea
                rows={12}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Review and edit the generated email body here..."
                className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              />
            </div>

            {/* Error Help / Troubleshooting Card for Brevo 535 */}
            {errorMsg && (errorMsg.includes('535') || errorMsg.includes('Authentication failed')) && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950">
                <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>How to fix Brevo 535 Authentication Failed:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-amber-800 text-[11px] leading-relaxed">
                  <li>
                    <strong>Check SMTP Login Username:</strong> In your Brevo account (<em>Settings &gt; SMTP &amp; API &gt; SMTP</em>), verify the exact <strong>Login</strong> username assigned to your account.
                  </li>
                  <li>
                    <strong>Account Activation:</strong> Newly registered Brevo accounts require one-time account activation or sender verification before outgoing relay is permitted.
                  </li>
                  <li>
                    <strong>Alternative:</strong> You can select <strong>Send via Gmail</strong> below to dispatch this email directly through your connected Gmail account!
                  </li>
                </ul>
              </div>
            )}

            {/* Footer with Provider Selector & Send Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              {/* Sending Provider Selector */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500 font-medium">Send via:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSendProvider('BREVO');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      sendProvider === 'BREVO'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Brevo (Marketing)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendProvider('GMAIL');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      sendProvider === 'GMAIL'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gmail Account
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className={`px-6 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 ${
                    sendProvider === 'BREVO'
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-200'
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                  <span>
                    {isSending
                      ? `Sending via ${sendProvider === 'BREVO' ? 'Brevo' : 'Gmail'}...`
                      : `Send via ${sendProvider === 'BREVO' ? 'Brevo' : 'Gmail'}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
