import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { User, Shield, Key, Bell, Database, Trash2, AlertTriangle, CheckCircle2, Mail, Check } from 'lucide-react';
import { api } from '../api/client.js';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      setResetError(null);
      setResetSuccess(null);
      const res = await api.resetWebsiteData();
      setResetSuccess(res.message);
      setShowConfirm(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset website data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Account & Workspace Settings</h2>
        <p className="text-xs text-slate-500">
          Manage your profile, sender preferences, and security settings
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">User Profile</h3>
            <p className="text-[11px] text-slate-400">Authenticated account details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Full Name</label>
            <input
              type="text"
              readOnly
              value={user?.name || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Account Email</label>
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Role & Permissions</label>
            <input
              type="text"
              readOnly
              value={user?.role || 'USER'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Primary Workspace</label>
            <input
              type="text"
              readOnly
              value="Personal Workspace"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Connected Email Services */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Connected Email Services</h3>
            <p className="text-[11px] text-slate-400">Authenticated Gmail and dispatch provider</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Gmail Sending Identity</span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" />
                <span>Connected</span>
              </span>
            </div>
            <p className="text-slate-600 font-mono text-[11px]">{user?.email || 'Subashreekamal@gmail.com'}</p>
            <p className="text-[11px] text-slate-400">Used for direct sending through Gmail API</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Brevo Service</span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" />
                <span>Active</span>
              </span>
            </div>
            <p className="text-slate-600 font-mono text-[11px]">{user?.email || 'Subashreekamal@gmail.com'}</p>
            <p className="text-[11px] text-slate-400">Configured with your Brevo API credentials</p>
          </div>
        </div>
      </div>

      {/* Security & Token Encryption Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Security & Encryption</h3>
            <p className="text-[11px] text-slate-400">All external provider keys are protected server-side</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            MailPilot AI utilizes hardware-grade <strong>AES-256-GCM</strong> encryption with unique Initialization Vectors (IV) and authentication tags for all stored Google OAuth refresh tokens and Brevo API credentials.
          </p>
          <p>
            No secrets or refresh tokens are ever exposed to browser bundles or client-side JavaScript.
          </p>
        </div>
      </div>

      {/* Admin Danger Zone / Reset All Data */}
      <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-red-100">
          <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 font-bold">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-950">Reset Website Data</h3>
            <p className="text-[11px] text-red-600 font-medium">Administrator Reset Control</p>
          </div>
        </div>

        <p className="text-xs text-red-800 leading-relaxed">
          Purge all emails, drafts, campaigns, marketing sequences, contacts, logs, and events across the entire website. The administrator account (<span className="font-semibold">{user?.email}</span>) and integration credentials will be preserved.
        </p>

        {resetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetSuccess} Reloading...</span>
          </div>
        )}

        {resetError && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-900 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{resetError}</span>
          </div>
        )}

        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            Reset Every Detail in Website
          </button>
        ) : (
          <div className="p-4 bg-white border border-red-200 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-red-900">
              Are you absolutely certain? This will delete all generated emails, campaigns, sequences, and contacts.
            </p>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResetting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                {isResetting ? 'Resetting Data...' : 'Yes, Permanently Reset Everything'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isResetting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
