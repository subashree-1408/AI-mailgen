import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Calendar,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { api } from '../api/client.js';
import { MarketingCampaign } from '../types/index.js';

export const MarketingCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Campaign Form
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [targetList, setTargetList] = useState('Product Beta Users');
  const [scheduleTime, setScheduleTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Test send state
  const [testEmail, setTestEmail] = useState('');
  const [activeTestCampaignId, setActiveTestCampaignId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaigns();
      setCampaigns(res.campaigns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !htmlContent) {
      setErrorMsg('Please enter campaign name, subject line, and content.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createCampaign({
        name,
        subject,
        previewText,
        htmlContent,
        targetList,
        scheduledAt: scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
      });

      setIsCreating(false);
      setName('');
      setSubject('');
      setPreviewText('');
      setHtmlContent('');
      setScheduleTime('');
      setActionMsg('Marketing campaign created successfully.');
      fetchCampaigns();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async (id: string) => {
    if (!window.confirm('Dispatch this marketing campaign to all subscribed list contacts now?')) return;
    try {
      const res = await api.sendCampaignNow(id);
      setActionMsg(res.message);
      fetchCampaigns();
    } catch (err: any) {
      setErrorMsg(err.message || 'Send failed.');
    }
  };

  const handleTestSend = async (campaignId: string) => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Please enter a valid test recipient email.');
      return;
    }
    try {
      await api.testSendCampaign(campaignId, testEmail);
      setActionMsg(`Test email dispatched to ${testEmail}`);
      setActiveTestCampaignId(null);
    } catch (err: any) {
      alert(err.message || 'Test send failed.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Marketing Campaigns</h2>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Brevo Engine
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Permission-based audience broadcasts with unsubscribe enforcement and tracking
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Cancel Campaign' : 'Create Campaign'}</span>
        </button>
      </div>

      {actionMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-xs flex justify-between items-center">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2 rounded-lg text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Creation Modal / Form Card */}
      {isCreating && (
        <div className="bg-white border border-indigo-100 rounded-2xl shadow-md p-6 space-y-4 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Compose Marketing Campaign</span>
            </h3>
            <span className="text-xs text-slate-400">Sent via Brevo</span>
          </div>

          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Internal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. November Product Launch"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Audience List
                </label>
                <select
                  value={targetList}
                  onChange={(e) => setTargetList(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="Product Beta Users">Product Beta Users</option>
                  <option value="Newsletter Subscribers">Newsletter Subscribers</option>
                  <option value="Default">Default Audience</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Exciting announcement: MailPilot 2.0 is live!"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preview Text / Preheader
                </label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Short teaser shown in inbox preview..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  HTML Body Content <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setHtmlContent(
                      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">\n  <h2 style="color: #4f46e5;">Welcome to Our Community</h2>\n  <p style="color: #334155; line-height: 1.6;">We are excited to have you with us. Here is what you can expect over the coming weeks...</p>\n  <p><a href="https://mailpilot.io" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Get Started Today</a></p>\n</div>`
                    )
                  }
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Insert Responsive Template
                </button>
              </div>
              <textarea
                rows={8}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Write or paste your campaign HTML content here..."
                required
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Delivery (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Creating...' : scheduleTime ? 'Schedule Campaign' : 'Save as Draft'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">All Campaigns</h3>
          <button
            onClick={fetchCampaigns}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading campaigns...
          </div>
        ) : campaigns.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {campaigns.map((c) => (
              <div key={c.id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        c.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : c.status === 'SCHEDULED'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{c.subject}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>
                      List: <strong className="text-slate-600">{c.targetList}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>Sent: <strong className="text-slate-700">{c.sentCount}</strong></span>
                    <span>&bull;</span>
                    <span>Opened: <strong className="text-slate-700">{c.openCount}</strong></span>
                    <span>&bull;</span>
                    <span>Clicked: <strong className="text-slate-700">{c.clickCount}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Test Send Dropdown */}
                  {activeTestCampaignId === c.id ? (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none"
                      />
                      <button
                        onClick={() => handleTestSend(c.id)}
                        className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => setActiveTestCampaignId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveTestCampaignId(c.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      Test Send
                    </button>
                  )}

                  {c.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleSendNow(c.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Now</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Mail className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">No marketing campaigns created yet.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Create First Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
