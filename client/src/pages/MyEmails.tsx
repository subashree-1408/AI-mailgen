import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  Copy,
  Trash2,
  ExternalLink,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client.js';
import { EmailRecord } from '../types/index.js';

interface MyEmailsProps {
  onOpenEmail: (id: string) => void;
  onNewEmail: () => void;
}

export const MyEmails: React.FC<MyEmailsProps> = ({ onOpenEmail, onNewEmail }) => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await api.getEmails({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setEmails(res.emails || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmails();
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.duplicateEmail(id);
      setActionMsg('Email duplicated successfully.');
      onOpenEmail(res.email.id);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate email.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this email record?')) return;
    try {
      await api.deleteEmail(id);
      setEmails(emails.filter((e) => e.id !== id));
      setActionMsg('Email record deleted.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete email.');
    }
  };

  const getStatusBadge = (email: EmailRecord) => {
    switch (email.status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted by Gmail
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" />
            Send Failed
          </span>
        );
      case 'SENDING':
        return (
          <span className="inline-flex items-center text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-1.5" />
            Sending...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            {email.status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Emails</h2>
          <p className="text-xs text-slate-500">
            All AI-generated emails, drafts, and Gmail transmissions
          </p>
        </div>

        <button
          onClick={onNewEmail}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Email</span>
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

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, recipient, body..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACCEPTED">Sent (Accepted by Gmail)</option>
            <option value="DRAFT">Drafts</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            onClick={fetchEmails}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Emails Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading email records from database...</p>
          </div>
        ) : emails.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Subject & Description</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Sender Account</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-900 truncate">
                        {email.subject || '(No Subject)'}
                      </p>
                      {email.shortDescription && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Prompt: "{email.shortDescription}"
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-medium text-slate-800">{email.recipientEmail}</p>
                      {email.recipientName && (
                        <p className="text-[11px] text-slate-400">{email.recipientName}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {email.senderEmail || 'Gmail'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(email)}
                      {email.errorMessage && (
                        <p className="text-[10px] text-rose-600 mt-1 max-w-[200px] truncate" title={email.errorMessage}>
                          {email.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      {new Date(email.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => onOpenEmail(email.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-md font-medium transition-colors"
                        title={email.isDraft ? 'Resume Draft' : 'Open in studio'}
                      >
                        {email.isDraft ? 'Edit Draft' : 'Reuse'}
                      </button>

                      <button
                        onClick={() => handleDuplicate(email.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Duplicate as new draft"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(email.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">No matching email records found.</p>
            <button
              onClick={onNewEmail}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Generate an Email Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
