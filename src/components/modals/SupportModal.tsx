import React, { useState } from 'react';
import { SupportTicket } from '../../types';
import { 
  LifeBuoy, 
  X, 
  Send, 
  Check, 
  HelpCircle, 
  PackageSearch, 
  AlertTriangle, 
  CreditCard, 
  Car, 
  RotateCw,
  Phone,
  Mail,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { isGmailConnected, connectGmailAccount, sendGmailMessage, fetchGmailProfile } from '../../services/gmailService';
import { GmailSendConfirmationModal } from './GmailSendConfirmationModal';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: 'user' | 'driver';
  activeRideId?: string;
  userEmail?: string;
  onSubmitTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userRole,
  activeRideId,
  userEmail = 'halderkoushik120@gmail.com',
  onSubmitTicket
}) => {
  const [category, setCategory] = useState<SupportTicket['category']>('ride');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [sendGmailCopy, setSendGmailCopy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [senderGmail, setSenderGmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    if (sendGmailCopy) {
      if (!isGmailConnected()) {
        try {
          const { profile } = await connectGmailAccount();
          setSenderGmail(profile.emailAddress);
        } catch {
          // continue without blocking ticket submit
        }
      } else {
        try {
          const profile = await fetchGmailProfile();
          setSenderGmail(profile.emailAddress);
        } catch {
          // ignore
        }
      }
      setIsConfirmModalOpen(true);
      return;
    }

    await executeSubmit();
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitTicket({
        userId,
        userName,
        userRole,
        rideId: activeRideId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        itemDetails: category === 'lost_item' ? itemDetails.trim() : undefined
      });

      // Send Gmail copy if requested
      if (sendGmailCopy && isGmailConnected()) {
        try {
          const ticketBody = `
Toto Drive Support Request
----------------------------------------
Ticket Type: ${category.toUpperCase()}
Submitted By: ${userName} (${userId})
Contact Email: ${userEmail}
Ride Reference: ${activeRideId || 'None (General Query)'}

Subject: ${subject.trim()}

Message:
${description.trim()}
${category === 'lost_item' ? `\nLost Item Details: ${itemDetails.trim()}` : ''}
----------------------------------------
Kolkata Toto Drive 24x7 Customer Helpdesk
          `.trim();

          const ticketHtml = `
<div style="font-family: sans-serif; padding: 20px; background-color: #faf9f6;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #e5e0d8;">
    <h2 style="margin: 0 0 12px; color: #111111;">Toto Drive Support Request</h2>
    <p style="font-size: 13px; color: #666; margin: 0 0 16px;">We have received your support ticket and our Kolkata operations desk is looking into it.</p>
    <div style="background: #f4f4f5; padding: 14px; border-radius: 12px; font-size: 13px; margin-bottom: 16px;">
      <div><strong>Category:</strong> ${category.toUpperCase()}</div>
      <div><strong>Passenger:</strong> ${userName}</div>
      <div><strong>Subject:</strong> ${subject.trim()}</div>
      ${activeRideId ? `<div><strong>Ride ID:</strong> ${activeRideId}</div>` : ''}
    </div>
    <div style="font-size: 13px; line-height: 1.5; color: #222; white-space: pre-wrap; background: #fafafa; padding: 14px; border-radius: 12px; border: 1px solid #eee;">
      ${description.trim()}
    </div>
  </div>
</div>
          `.trim();

          await sendGmailMessage({
            to: 'halderkoushik120@gmail.com',
            subject: `[Toto Support Ticket] ${subject.trim()}`,
            htmlBody: ticketHtml,
            textBody: ticketBody
          });
        } catch (emailErr) {
          console.warn('Could not send Gmail copy of ticket:', emailErr);
        }
      }

      confetti({ particleCount: 40, spread: 50 });
      setSubmitted(true);
      setIsConfirmModalOpen(false);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Support ticket submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-neutral-900">Support Center</h3>
                <p className="text-[11px] text-neutral-500 font-medium">We're here to help you 24x7</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-neutral-900">Ticket Submitted</h4>
              <p className="text-xs text-neutral-500">
                Our support team has received your ticket and will contact you shortly.
                {sendGmailCopy && ' A confirmation email has been dispatched via Gmail.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handlePreSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Category picker */}
              <div className="space-y-1.5">
                <label className="block font-bold text-neutral-700">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ride', label: 'Ride / Route Issue', icon: Car },
                    { id: 'lost_item', label: 'Lost & Found', icon: PackageSearch },
                    { id: 'driver', label: 'Captain Issue', icon: AlertTriangle },
                    { id: 'other', label: 'General / Query', icon: HelpCircle }
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as any)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/60 border-blue-500 text-blue-900 font-bold shadow-2xs'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-neutral-400'}`} />
                        <span className="text-[10px] truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If Lost Item selected */}
              {category === 'lost_item' && (
                <div className="space-y-1">
                  <label className="block font-bold text-neutral-700">Lost Item Description</label>
                  <input
                    type="text"
                    value={itemDetails}
                    onChange={(e) => setItemDetails(e.target.value)}
                    placeholder="e.g. Black umbrella, bag in rear passenger seat"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                    required
                  />
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your query or issue"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                  required
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">Detailed Message</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Explain what happened so our team can resolve it quickly..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                  required
                />
              </div>

              {/* Gmail Dispatch Option */}
              <div className="p-3 bg-red-50/50 border border-red-200/70 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#EA4335] shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-neutral-900">Send copy via Gmail</div>
                    <div className="text-[10px] text-neutral-500">Dispatch copy to support & your inbox</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendGmailCopy}
                  onChange={(e) => setSendGmailCopy(e.target.checked)}
                  className="w-4 h-4 accent-[#EA4335] rounded-md cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#E07A00] hover:bg-[#C96E00] text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Submit Support Ticket</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Mandatory confirmation for Gmail sending */}
      <GmailSendConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executeSubmit}
        title="Send Support Ticket via Gmail"
        recipientEmail="halderkoushik120@gmail.com"
        senderEmail={senderGmail || userEmail}
        subject={`[Toto Support Ticket] ${subject.trim()}`}
        isLoading={isSubmitting}
      />
    </>
  );
};
