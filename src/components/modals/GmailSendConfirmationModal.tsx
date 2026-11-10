import React from 'react';
import { Mail, CheckCircle2, AlertCircle, X, Send, ShieldCheck, ArrowRight } from 'lucide-react';

interface GmailSendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  recipientEmail: string;
  senderEmail?: string;
  subject: string;
  details?: {
    rideId?: string;
    amount?: number;
    pickup?: string;
    dropoff?: string;
  };
  isLoading?: boolean;
}

export const GmailSendConfirmationModal: React.FC<GmailSendConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Send Email via Gmail',
  recipientEmail,
  senderEmail,
  subject,
  details,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div 
        id="gmail-send-confirmation-modal"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 text-neutral-900 animate-in zoom-in-95 duration-150"
      >
        {/* Header with Gmail Branding */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-[#FCFCFD]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Mail className="w-5 h-5 text-[#EA4335]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900 leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Explicit User Confirmation Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Confirmation needed:</span> You are about to send an email using your authenticated Google Workspace account.
            </div>
          </div>

          {/* Details breakdown */}
          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200 space-y-2 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider">To:</span>
              <span className="font-bold text-neutral-900 font-mono text-right truncate">{recipientEmail}</span>
            </div>

            {senderEmail && (
              <div className="flex justify-between items-start gap-2 pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider">From:</span>
                <span className="font-medium text-neutral-700 font-mono text-right truncate">{senderEmail}</span>
              </div>
            )}

            <div className="flex justify-between items-start gap-2 pt-1 border-t border-neutral-200/60">
              <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider">Subject:</span>
              <span className="font-medium text-neutral-800 text-right truncate max-w-[240px]">{subject}</span>
            </div>

            {details?.amount !== undefined && (
              <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider">Trip Amount:</span>
                <span className="font-extrabold text-[#E07A00] font-mono text-sm">₹{details.amount}.00</span>
              </div>
            )}

            {details?.pickup && details?.dropoff && (
              <div className="pt-1.5 border-t border-neutral-200/60 text-[11px] text-neutral-600">
                <div className="truncate"><strong>Route:</strong> {details.pickup} → {details.dropoff}</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Sends direct via Google Workspace Gmail API with end-to-end security.</span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#111111] hover:bg-neutral-900 text-white text-xs font-bold active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <span>Sending via Gmail...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
