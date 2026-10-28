import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Send,
  Key,
  HelpCircle,
  Check,
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

export const Integrations: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [integrationsStatus, setIntegrationsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Gmail State
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('');

  // Brevo State
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('Subashreekamal@gmail.com');
  const [brevoSenderName, setBrevoSenderName] = useState('subashree');
  const [brevoVerifying, setBrevoVerifying] = useState(false);
  const [brevoTestEmail, setBrevoTestEmail] = useState('');
  const [brevoTestSending, setBrevoTestSending] = useState(false);
  const [brevoMsg, setBrevoMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationsStatus();
      setIntegrationsStatus(data);
      if (data?.brevo?.senderEmail) setBrevoSenderEmail(data.brevo.senderEmail);
      if (data?.brevo?.senderName) setBrevoSenderName(data.brevo.senderName);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Connect Gmail via Google OAuth
  const handleConnectGmailOAuth = async () => {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const res = await api.getGmailConnectUrl();
      if (!res.configured) {
        setGmailError(
          res.error ||
            'Google OAuth Client ID & Secret are not configured in server/.env. You can use the Sandbox Direct Connect below for local testing.'
        );
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setGmailError(err.message || 'Failed to initiate Google OAuth.');
    } finally {
      setGmailLoading(false);
    }
  };

  // Disconnect Gmail
  const handleDisconnectGmail = async () => {
    if (!window.confirm('Disconnect your Gmail account? You will need to reconnect to send personal emails.')) return;
    try {
      await api.disconnectGmail();
      await refreshUser();
      fetchStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Dev Direct Connect (For Sandbox / Local evaluation)
  const handleDevConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail || !devEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    try {
      await api.connectGmailDev(devEmail);
      await refreshUser();
      fetchStatus();
      setDevEmail('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Verify Brevo
  const handleVerifyBrevo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrevoVerifying(true);
    setBrevoMsg(null);
    try {
      const res = await api.verifyBrevo({
        apiKey: brevoApiKey,
        senderEmail: brevoSenderEmail,
        senderName: brevoSenderName,
      });

      setBrevoMsg(res.message);
      await refreshUser();
      fetchStatus();
    } catch (err: any) {
      setBrevoMsg(`Error: ${err.message}`);
    } finally {
      setBrevoVerifying(false);
    }
  };

  // Send Brevo Test Email
  const handleSendBrevoTest = async () => {
    if (!brevoTestEmail || !brevoTestEmail.includes('@')) {
      alert('Please enter a test recipient email address.');
      return;
    }
    setBrevoTestSending(true);
    try {
      const res = await api.sendBrevoTestEmail(brevoTestEmail);
      alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Test send failed.');
    } finally {
      setBrevoTestSending(false);
    }
  };

  const gmail = integrationsStatus?.gmail;
  const brevo = integrationsStatus?.brevo;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Integrations & Credentials</h2>
        <p className="text-xs text-slate-500">
          Connect your Gmail and Brevo providers with least-privilege permissions and encrypted key storage
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 1. GMAIL INTEGRATION CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Google Gmail API</h3>
                <p className="text-[11px] text-slate-400">Personal correspondence & direct dispatch</p>
              </div>
            </div>

            {gmail?.connected ? (
              <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                Not Connected
              </span>
            )}
          </div>

          {/* Connection Status Details */}
          {gmail?.connected ? (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Connected Account:</span>
                <span className="font-bold text-slate-900">{gmail.emailAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scope:</span>
                <span className="text-slate-700 font-mono text-[11px]">https://www.googleapis.com/auth/gmail.send</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Synced:</span>
                <span className="text-slate-700">
                  {gmail.lastSyncAt ? new Date(gmail.lastSyncAt).toLocaleString() : 'Just now'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect your Gmail account using Google OAuth 2.0 to send AI-generated personal emails directly from your real inbox address.
            </p>
          )}

          {gmailError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <span>{gmailError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-1">
            {gmail?.connected ? (
              <button
                type="button"
                onClick={handleDisconnectGmail}
                className="w-full py-2 px-4 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors"
              >
                Disconnect Gmail Account
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGmailOAuth}
                disabled={gmailLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                <span>{gmailLoading ? 'Connecting...' : 'Connect with Google OAuth 2.0'}</span>
              </button>
            )}

            {/* Sandbox Direct Connect fallback */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Sandbox Mode / Direct Account Setter:
              </span>
              <form onSubmit={handleDevConnect} className="flex space-x-2">
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Set Active
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 2. BREVO INTEGRATION CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Brevo (Sendinblue)</h3>
                <p className="text-[11px] text-slate-400">Marketing sequences, campaigns & webhooks</p>
              </div>
            </div>

            {brevo?.isVerified ? (
              <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Action Required
              </span>
            )}
          </div>

          <form onSubmit={handleVerifyBrevo} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Brevo API Key or SMTP Key <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                  placeholder="xkeysib-... or xsmtpsib-..."
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                REST API v3 keys start with <code className="text-indigo-600 font-bold">xkeysib-</code>. SMTP relay keys start with <code className="text-indigo-600 font-bold">xsmtpsib-</code>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sender Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={brevoSenderEmail}
                  onChange={(e) => setBrevoSenderEmail(e.target.value)}
                  placeholder="Subashreekamal@gmail.com"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={brevoSenderName}
                  onChange={(e) => setBrevoSenderName(e.target.value)}
                  placeholder="subashree"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {brevoMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  brevoMsg.includes('Error') || brevoMsg.includes('failed')
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {brevoMsg}
              </div>
            )}

            {brevo?.setupInstructions && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">Setup Instructions:</span>
                {brevo.setupInstructions.map((step: string, i: number) => (
                  <p key={i}>{step}</p>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={brevoVerifying}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{brevoVerifying ? 'Verifying with Brevo...' : 'Verify & Save Brevo Credentials'}</span>
            </button>
          </form>

          {/* Test Send Card */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Send Verified Test Delivery:
            </span>
            <div className="flex space-x-2">
              <input
                type="email"
                value={brevoTestEmail}
                onChange={(e) => setBrevoTestEmail(e.target.value)}
                placeholder="test-recipient@domain.com"
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendBrevoTest}
                disabled={brevoTestSending}
                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center space-x-1"
              >
                <Send className="w-3 h-3" />
                <span>{brevoTestSending ? 'Sending...' : 'Test'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
