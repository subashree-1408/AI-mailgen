import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Inbox,
  FileEdit,
  Send,
  Users,
  Settings,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { api } from '../api/client.js';
import { OverviewMetrics } from '../types/index.js';

interface DashboardProps {
  onNavigate: (tab: string, draftId?: string) => void;
}

const QUICK_PRESETS = [
  {
    title: 'Leave Request',
    desc: 'Write a leave request to my college HOD for two days.',
    badge: 'Leave',
  },
  {
    title: 'Job Application',
    desc: 'Send a professional job application to a recruiter.',
    badge: 'Career',
  },
  {
    title: 'Interview Follow-Up',
    desc: 'Write a follow-up email after an interview.',
    badge: 'Follow-up',
  },
  {
    title: 'Meeting Request',
    desc: 'Request a meeting with my manager to discuss project roadmap.',
    badge: 'Work',
  },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalyticsOverview();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Primary Hero Section */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-1.5 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI-Powered Mail Studio</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Write smarter. Send professionally. Automate everything.
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
            Create professional emails from a short description, review in an editable client preview, and send directly from your verified Gmail account.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('create-email')}
              className="w-full sm:w-auto justify-center px-5 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 active:bg-indigo-100 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Create Email Now</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              onClick={() => onNavigate('my-emails')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-700/50 hover:bg-indigo-700/70 text-white rounded-xl text-xs font-medium border border-indigo-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>My Emails</span>
            </button>

            <button
              onClick={() => onNavigate('drafts')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-700/50 hover:bg-indigo-700/70 text-white rounded-xl text-xs font-medium border border-indigo-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Draft</span>
            </button>

            <button
              onClick={() => onNavigate('contacts')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-700/50 hover:bg-indigo-700/70 text-white rounded-xl text-xs font-medium border border-indigo-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/3" />
      </div>

      {/* 4 Clean Key Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Overview & Activity</h3>
          <button
            onClick={fetchMetrics}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('my-emails')}
            className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">Total Created</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.personalEmails?.totalCreated ?? 0}</p>
            <p className="text-[11px] text-slate-400">Total emails generated or saved</p>
          </div>

          <div
            onClick={() => onNavigate('my-emails')}
            className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-4 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-600">Sent via Gmail</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.personalEmails?.sentThroughGmail ?? 0}</p>
            <p className="text-[11px] text-slate-400">Delivered via Brevo</p>
          </div>

          <div
            onClick={() => onNavigate('drafts')}
            className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-4 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 group-hover:text-amber-600">Draft</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <FileEdit className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.personalEmails?.drafts ?? 0}</p>
            <p className="text-[11px] text-slate-400">Saved and ready to review</p>
          </div>

          <div
            onClick={() => onNavigate('contacts')}
            className="bg-white border border-slate-200 hover:border-cyan-300 rounded-xl p-4 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 group-hover:text-cyan-600">Contacts</span>
              <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.personalEmails?.contacts ?? 0}</p>
            <p className="text-[11px] text-slate-400">Saved personal contacts</p>
          </div>
        </div>
      </div>

      {/* Quick Start Presets (Very Easy to Use) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Quick Start Presets</h3>
              <p className="text-[11px] text-slate-400">Click any preset to start generating instantly</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate('create-email')}
              className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all space-y-2 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-800 group-hover:text-indigo-600">
                  {preset.title}
                </span>
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                  {preset.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Email Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Email Activity</h3>
            <p className="text-[11px] text-slate-400">Your latest created and dispatched messages</p>
          </div>
          <button
            onClick={() => onNavigate('my-emails')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {metrics?.recentEmails && metrics.recentEmails.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {metrics.recentEmails.map((email) => {
              const isAccepted = email.status === 'ACCEPTED';
              const isDraft = email.isDraft;
              const isFailed = email.status === 'FAILED';

              return (
                <div
                  key={email.id}
                  className="p-4 sm:px-6 sm:py-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-xs"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-semibold text-slate-900 truncate max-w-[220px] sm:max-w-md">
                        {email.subject || '(No Subject)'}
                      </span>
                      {isAccepted && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                          Sent via Brevo
                        </span>
                      )}
                      {isDraft && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                          Draft
                        </span>
                      )}
                      {isFailed && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                          Failed
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 truncate">
                      To: <span className="font-medium text-slate-700">{email.recipientEmail}</span>
                      {email.recipientName && <span> ({email.recipientName})</span>}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 pt-1.5 sm:pt-0 border-t sm:border-0 border-slate-100 shrink-0">
                    <span className="text-[11px] text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(email.updatedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onNavigate('create-email', email.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isDraft ? 'Resume Draft' : 'Open'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">No email activity recorded yet.</p>
            <button
              onClick={() => onNavigate('create-email')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Create Your First Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
