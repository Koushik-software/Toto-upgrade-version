import React, { useState } from 'react';
import { ActiveRide, TripRecord } from '../../types';
import { 
  Car, 
  MapPin, 
  FileText, 
  RotateCw, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Mail,
  Send,
  Check,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  isGmailConnected, 
  connectGmailAccount, 
  sendGmailMessage, 
  generateRideReceiptHtml,
  fetchGmailProfile
} from '../../services/gmailService';
import { GmailSendConfirmationModal } from '../modals/GmailSendConfirmationModal';

interface RideHistoryPageProps {
  activeRide: ActiveRide | null;
  completedTrips: TripRecord[];
  onBookAgain: (pickup: string, dropoff: string) => void;
  onOpenReceipt: (trip: TripRecord) => void;
  onReportIssue: (tripId: string) => void;
  onNavigateHome: () => void;
}

export const RideHistoryPage: React.FC<RideHistoryPageProps> = ({
  activeRide,
  completedTrips,
  onBookAgain,
  onOpenReceipt,
  onReportIssue,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedTripForGmail, setSelectedTripForGmail] = useState<TripRecord | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [gmailNotification, setGmailNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userGmailAddress, setUserGmailAddress] = useState<string>('halderkoushik120@gmail.com');

  const completedCount = completedTrips.filter((t) => t.status === 'completed').length;
  const cancelledCount = completedTrips.filter((t) => t.status === 'cancelled').length;

  const filteredTrips = completedTrips.filter((t) => {
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  const handleInitiateEmailReceipt = async (trip: TripRecord) => {
    setGmailNotification(null);
    setSelectedTripForGmail(trip);

    if (!isGmailConnected()) {
      try {
        const { profile } = await connectGmailAccount();
        setUserGmailAddress(profile.emailAddress);
      } catch (err: any) {
        setGmailNotification({
          type: 'error',
          message: err?.message || 'Could not connect Gmail account. Please allow popups.'
        });
        return;
      }
    } else {
      try {
        const profile = await fetchGmailProfile();
        if (profile.emailAddress) setUserGmailAddress(profile.emailAddress);
      } catch {
        // use fallback
      }
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSendGmail = async () => {
    if (!selectedTripForGmail) return;
    setIsSendingGmail(true);
    setGmailNotification(null);
    try {
      const payload = generateRideReceiptHtml(
        selectedTripForGmail, 
        selectedTripForGmail.passengerName || 'Passenger', 
        userGmailAddress
      );

      const res = await sendGmailMessage({
        to: userGmailAddress,
        subject: payload.subject,
        htmlBody: payload.html,
        textBody: payload.text
      });

      setIsConfirmModalOpen(false);
      setGmailNotification({
        type: 'success',
        message: `Ride invoice #${selectedTripForGmail.id.slice(-6)} sent to ${userGmailAddress} via Gmail!`
      });
      setTimeout(() => setGmailNotification(null), 6000);
    } catch (err: any) {
      setIsConfirmModalOpen(false);
      setGmailNotification({
        type: 'error',
        message: err?.message || 'Failed to dispatch email via Gmail API.'
      });
      setTimeout(() => setGmailNotification(null), 6000);
    } finally {
      setIsSendingGmail(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-3xl mx-auto px-2 sm:px-6 py-2 sm:py-6 space-y-3.5 sm:space-y-5 pb-6 sm:pb-10"
    >
      {/* Top Page Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#EDE8E0] shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FFF3C4] text-[#8C5200] flex items-center justify-center shrink-0 shadow-2xs">
            <Car className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight truncate">
              My Rides
            </h1>
            <p className="text-xs text-neutral-500 font-medium truncate">
              Trip history, digital receipts & active bookings
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#181818] hover:bg-black active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Book Ride</span>
          <span className="xs:hidden">Home</span>
        </button>
      </div>

      {/* Gmail Notification Banner */}
      {gmailNotification && (
        <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in duration-200 ${
          gmailNotification.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          {gmailNotification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold flex-1">{gmailNotification.message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { key: 'all', label: 'All Trips', count: completedTrips.length },
          { key: 'completed', label: 'Completed', count: completedCount },
          { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as 'all' | 'completed' | 'cancelled')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shrink-0 ${
                isActive
                  ? 'bg-[#181818] text-white shadow-xs'
                  : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-[#EDE8E0]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ongoing Active Ride Card (if any in progress) */}
      {activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' && (
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#FFF9E6] to-[#FFF3C4] border-2 border-[#FFD54F] rounded-3xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-xs sm:text-sm text-[#8C5200] uppercase tracking-wider">
                Active Ride in Progress
              </span>
            </div>
            <span className="font-mono text-base sm:text-lg font-black text-neutral-900">
              ₹{activeRide.fare}
            </span>
          </div>

          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3 sm:p-3.5 space-y-2 border border-[#FFE082]">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{activeRide.pickup.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-900">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">{activeRide.dropoff.name}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-neutral-700 min-w-0">
              <span className="font-bold">{activeRide.driverName}</span>
              <span className="text-neutral-500 text-[11px] ml-1.5">({activeRide.driverVehicleNumber})</span>
            </div>

            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3.5 py-2 bg-[#E07A00] hover:bg-[#C8622A] text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Track on Map
            </button>
          </div>
        </div>
      )}

      {/* Trips Ledger List */}
      <div className="space-y-3">
        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => {
            const isCompleted = trip.status === 'completed';
            return (
              <div
                key={trip.id}
                className="bg-white rounded-3xl border border-[#EDE8E0] p-4 sm:p-5 shadow-xs hover:border-neutral-300 transition-all space-y-3"
              >
                {/* Trip Top Header */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      #{trip.id.slice(-6)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5" />
                      )}
                      <span>{trip.status}</span>
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black font-mono text-base sm:text-lg text-[#111111]">
                      ₹{trip.fare}
                    </span>
                  </div>
                </div>

                {/* Locations Routing */}
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Pickup</p>
                      <p className="font-bold text-[#111111] truncate">{trip.pickupName || (trip as any).pickupAddress || 'Pickup Location'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Dropoff</p>
                      <p className="font-bold text-[#111111] truncate">{trip.dropoffName || (trip as any).dropoffAddress || 'Dropoff Destination'}</p>
                    </div>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-600">{trip.passengerName}</span>
                    <span>•</span>
                    <span>{trip.distanceKm ? `${trip.distanceKm.toFixed(1)} km` : '2.8 km'}</span>
                  </div>
                  <div className="text-neutral-400 font-medium">
                    {trip.completedAt || 'Recent trip'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onBookAgain(
                      trip.pickupName || (trip as any).pickupAddress || '',
                      trip.dropoffName || (trip as any).dropoffAddress || ''
                    )}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#C8622A] font-bold text-xs transition-colors cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Book Again</span>
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => onReportIssue(trip.id)}
                      className="text-neutral-500 hover:text-neutral-800 font-semibold text-xs px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      Report Issue
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(trip)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[#111111] font-bold text-xs transition-colors cursor-pointer active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#E07A00]" />
                      <span>Receipt</span>
                    </button>
                    {trip.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleInitiateEmailReceipt(trip)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#EA4335] font-bold text-xs transition-colors cursor-pointer active:scale-95"
                        title="Send invoice via your connected Gmail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl border border-[#EDE8E0] p-8 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-amber-50 text-[#E07A00] flex items-center justify-center">
              <Car className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-extrabold text-base text-neutral-900">
                No trips found
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500">
                {activeTab === 'all' 
                  ? "You haven't taken any trips yet. Book your first clean electric toto ride today!"
                  : `No ${activeTab} trips found in your account history.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E07A00] hover:bg-[#C8622A] text-white font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <span>Book a Ride Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Gmail Send Confirmation Modal */}
      {selectedTripForGmail && (
        <GmailSendConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setSelectedTripForGmail(null);
          }}
          onConfirm={handleConfirmSendGmail}
          title="Send Trip Invoice via Gmail"
          recipientEmail={userGmailAddress}
          senderEmail={userGmailAddress}
          subject={`Your Toto Drive Ride Receipt [INV-${selectedTripForGmail.id.toUpperCase().slice(-8)}] - ₹${selectedTripForGmail.fare}.00`}
          details={{
            rideId: selectedTripForGmail.id,
            amount: selectedTripForGmail.fare,
            pickup: selectedTripForGmail.pickupName || (selectedTripForGmail as any).pickupAddress,
            dropoff: selectedTripForGmail.dropoffName || (selectedTripForGmail as any).dropoffAddress
          }}
          isLoading={isSendingGmail}
        />
      )}
    </motion.div>
  );
};
