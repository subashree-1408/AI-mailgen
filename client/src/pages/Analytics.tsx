import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Mail,
  Send,
  Eye,
  MousePointer,
  AlertTriangle,
  Users,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client.js';
import { OverviewMetrics } from '../types/index.js';

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalyticsOverview();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const personal = metrics?.personalEmails;
  const marketing = metrics?.marketing;

  const totalMarketingSent = marketing?.totalSent || 0;
  const openRate = totalMarketingSent > 0 ? Math.round(((marketing?.totalOpened || 0) / totalMarketingSent) * 100) : 0;
  const clickRate = totalMarketingSent > 0 ? Math.round(((marketing?.totalClicked || 0) / totalMarketingSent) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Performance Analytics</h2>
          <p className="text-xs text-slate-500">
            True database-backed event metrics separated by personal Gmail and Brevo marketing channels
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* SECTION 1: Personal Emails (Gmail) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Send className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Personal Correspondence (Gmail API)</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Emails Composed</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{personal?.totalCreated ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Total created with Gemini AI</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Accepted by Gmail</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{personal?.sentThroughGmail ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Successfully dispatched</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Pending Drafts</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{personal?.drafts ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting confirmation</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Failed Attempts</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{personal?.failedAttempts ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Provider or scope errors</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Marketing Campaigns (Brevo) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Marketing Deliverability & Engagement (Brevo)</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 font-medium">Total Delivered</span>
              <Send className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{marketing?.totalSent ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Dispatched to audience</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 font-medium">Open Rate</span>
              <Eye className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{openRate}%</p>
            <p className="text-[11px] text-slate-400 mt-1">{marketing?.totalOpened ?? 0} opens recorded</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 font-medium">Click-Through</span>
              <MousePointer className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{clickRate}%</p>
            <p className="text-[11px] text-slate-400 mt-1">{marketing?.totalClicked ?? 0} link clicks</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 font-medium">Bounces & Blocks</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-600 mt-1">{marketing?.totalBounced ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Protected from re-sending</p>
          </div>
        </div>
      </div>
    </div>
  );
};
