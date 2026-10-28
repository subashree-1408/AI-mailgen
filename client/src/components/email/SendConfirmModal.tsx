import React from 'react';
import { Send, AlertTriangle, CheckCircle2, X, Info } from 'lucide-react';

interface SendConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSending: boolean;
  recipientEmail: string;
  recipientName?: string;
  senderEmail: string;
  subject: string;
  cc?: string;
  bcc?: string;
}

export const SendConfirmModal: React.FC<SendConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSending,
  recipientEmail,
  recipientName,
  senderEmail,
  subject,
  cc,
  bcc,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Confirm Email Dispatch</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Please review the transmission details below. Once confirmed, this email will be delivered directly through your authenticated Gmail API connection.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-start justify-between">
              <span className="font-medium text-slate-500 w-24 flex-shrink-0">From (Sender):</span>
              <span className="font-semibold text-slate-900 break-all text-right">{senderEmail || 'Connected Gmail account'}</span>
            </div>

            <div className="flex items-start justify-between">
              <span className="font-medium text-slate-500 w-24 flex-shrink-0">To (Recipient):</span>
              <div className="text-right">
                <span className="font-semibold text-slate-900 break-all">{recipientEmail}</span>
                {recipientName && (
                  <span className="text-slate-500 ml-1">({recipientName})</span>
                )}
              </div>
            </div>

            {cc && (
              <div className="flex items-start justify-between">
                <span className="font-medium text-slate-500 w-24 flex-shrink-0">Cc:</span>
                <span className="text-slate-700 text-right">{cc}</span>
              </div>
            )}

            {bcc && (
              <div className="flex items-start justify-between">
                <span className="font-medium text-slate-500 w-24 flex-shrink-0">Bcc:</span>
                <span className="text-slate-700 text-right">{bcc}</span>
              </div>
            )}

            <div className="flex items-start justify-between pt-1 border-t border-slate-200/60">
              <span className="font-medium text-slate-500 w-24 flex-shrink-0">Subject:</span>
              <span className="font-semibold text-slate-900 break-all text-right">{subject || '(No Subject)'}</span>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/80 flex items-start space-x-2.5 text-xs text-amber-800">
            <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Notice:</strong> Gmail API will accept and dispatch this email. MailPilot distinguishes <span className="underline">acceptance by Google</span> from remote inbox spam filtering.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel & Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSending}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {isSending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Dispatching via Gmail API...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send via Gmail Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
