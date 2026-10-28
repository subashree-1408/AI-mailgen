import React, { useState, useEffect } from 'react';
import { FileEdit, Search, Trash2, Copy, Sparkles, RefreshCw, Clock } from 'lucide-react';
import { api } from '../api/client.js';
import { EmailRecord } from '../types/index.js';

interface DraftsProps {
  onOpenDraft: (id: string) => void;
  onNewEmail: () => void;
}

export const Drafts: React.FC<DraftsProps> = ({ onOpenDraft, onNewEmail }) => {
  const [drafts, setDrafts] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await api.getEmails({
        isDraft: true,
        search: search.trim() || undefined,
      });
      setDrafts(res.emails || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this draft permanently?')) return;
    try {
      await api.deleteEmail(id);
      setDrafts(drafts.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete draft.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.duplicateEmail(id);
      onOpenDraft(res.email.id);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate draft.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Draft Emails</h2>
          <p className="text-xs text-slate-500">
            Saved compositions awaiting your review and dispatch
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

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDrafts()}
            placeholder="Search drafts..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <button
          onClick={fetchDrafts}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-2"
          title="Refresh drafts"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Drafts Cards / List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading drafts...</p>
          </div>
        ) : drafts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {draft.subject || '(Untitled Subject)'}
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Draft
                    </span>
                  </div>

                  {draft.shortDescription && (
                    <p className="text-xs text-indigo-700/80 font-medium line-clamp-1">
                      Prompt: {draft.shortDescription}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {draft.bodyText || <span className="text-slate-400 italic">No content yet...</span>}
                  </p>

                  <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                    <span>
                      To: <strong className="text-slate-600">{draft.recipientEmail || 'None'}</strong>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Updated {new Date(draft.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => onOpenDraft(draft.id)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    Resume Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(draft.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Duplicate draft"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileEdit className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">You have no saved drafts.</p>
            <button
              onClick={onNewEmail}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Start Composing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
