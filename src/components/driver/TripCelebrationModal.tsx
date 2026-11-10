import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Sparkles, 
  MapPin, 
  User, 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  Leaf, 
  ShieldCheck,
  IndianRupee,
  Share2,
  Calendar,
  Clock
} from 'lucide-react';

export interface CompletedTripSummary {
  id: string;
  passengerName: string;
  passengerPhone?: string;
  pickupName: string;
  dropoffName: string;
  distanceKm: number;
  totalFare: number;
  driverEarnings: number;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  completedAt: string;
}

interface TripCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: CompletedTripSummary | null;
  onReadyForNextRide?: () => void;
}

export const TripCelebrationModal: React.FC<TripCelebrationModalProps> = ({
  isOpen,
  onClose,
  tripData,
  onReadyForNextRide,
}) => {
  // Fire multiple festive confetti cannons when modal opens
  const triggerCelebrationConfetti = () => {
    // 1. Center vibrant burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#fbbf24']
    });

    // 2. Left corner cannon
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.75 },
        colors: ['#22c55e', '#3b82f6', '#fbbf24']
      });
    }, 200);

    // 3. Right corner cannon
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.75 },
        colors: ['#ec4899', '#f59e0b', '#10b981']
      });
    }, 350);
  };

  useEffect(() => {
    if (isOpen) {
      triggerCelebrationConfetti();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const earnings = tripData?.driverEarnings ?? 78;
  const fare = tripData?.totalFare ?? 85;
  const passengerName = tripData?.passengerName || 'Passenger';
  const pickup = tripData?.pickupName || 'Sector V Metro Station';
  const dropoff = tripData?.dropoffName || 'DLF 2 Tech Park';
  const distance = tripData?.distanceKm ? tripData.distanceKm.toFixed(1) : '2.4';
  const time = tripData?.completedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const paymentMethod = tripData?.paymentMethod || 'cash';
  const tripId = tripData?.id ? tripData.id.slice(-6).toUpperCase() : 'RT-8842';

  const handleNextRide = () => {
    if (onReadyForNextRide) onReadyForNextRide();
    onClose();
  };

  return (
    <div 
      id="trip-celebration-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div 
        id="trip-celebration-modal"
        className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 text-center space-y-4 shadow-2xl border border-neutral-200 relative animate-in zoom-in-95 duration-300 my-auto"
      >
        {/* Confetti Replay Badge */}
        <button
          type="button"
          onClick={triggerCelebrationConfetti}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF8F5] hover:bg-[#F0EEEA] text-[#FF6B2C] border border-neutral-200 transition-transform active:scale-90 cursor-pointer shadow-2xs"
          title="Replay Celebration Animation"
        >
          <Sparkles className="w-4 h-4 animate-spin" />
        </button>

        {/* 1. Celebratory Radiant Icon Badge */}
        <div className="relative inline-flex items-center justify-center mx-auto mt-1">
          {/* Pulsing ring halos */}
          <span className="animate-ping absolute inline-flex h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-emerald-400 opacity-25" />
          <span className="animate-pulse absolute inline-flex h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-300 opacity-40" />
          
          {/* Center Checkmark Sphere */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Check className="w-8 h-8 stroke-[3.5] animate-in zoom-in duration-300" />
          </div>
        </div>

        {/* 2. Header & Congratulatory Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Trip Completed Successfully</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Transaction Confirmed!
          </h3>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            Payment settled directly with {passengerName}. Net earnings added to your workday balance.
          </p>
        </div>

        {/* 3. Earnings & Settlement Card */}
        <div className="bg-[#FAF8F5] border border-[#EDE8E0] rounded-2xl p-4 space-y-3 text-left">
          {/* Main Earnings Readout */}
          <div className="flex items-center justify-between pb-3 border-b border-[#EDE8E0]">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Driver Net Earnings
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 flex items-center gap-0.5">
                <span>₹{earnings}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Payment Mode
              </span>
              <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-xs font-bold text-[#111111]">
                <Wallet className="w-3 h-3 text-[#FF6B2C]" />
                <span className="uppercase">{paymentMethod === 'upi' ? 'Digital UPI' : paymentMethod === 'wallet' ? 'Toto Wallet' : `${paymentMethod} Cash Collected`}</span>
              </div>
            </div>
          </div>

          {/* Fare Breakdown Details */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white rounded-xl p-2 border border-[#EDE8E0]">
              <span className="text-[9px] text-gray-400 font-bold block uppercase">Total Fare</span>
              <span className="font-extrabold text-[#111111] text-xs sm:text-sm">₹{fare}</span>
            </div>
            <div className="bg-white rounded-xl p-2 border border-[#EDE8E0]">
              <span className="text-[9px] text-gray-400 font-bold block uppercase">Commission</span>
              <span className="font-extrabold text-emerald-600 text-xs sm:text-sm">₹0 (0%)</span>
            </div>
            <div className="bg-white rounded-xl p-2 border border-[#EDE8E0]">
              <span className="text-[9px] text-gray-400 font-bold block uppercase">Distance</span>
              <span className="font-extrabold text-[#111111] text-xs sm:text-sm">{distance} km</span>
            </div>
          </div>

          {/* Route Summary */}
          <div className="bg-white rounded-xl p-3 border border-[#EDE8E0] space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase block">Pickup</span>
                <p className="font-semibold text-[#111111] text-[11px] truncate">{pickup}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#9A3412] mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase block">Dropoff</span>
                <p className="font-semibold text-[#111111] text-[11px] truncate">{dropoff}</p>
              </div>
            </div>
          </div>

          {/* Eco Impact & Timestamp Footer */}
          <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
            <div className="flex items-center gap-1 text-emerald-700 font-semibold">
              <Leaf className="w-3 h-3 text-emerald-600" />
              <span>+0.8 kg CO₂ Saved</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{time}</span>
              <span>•</span>
              <span>#{tripId}</span>
            </div>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            id="celebration-next-ride-btn"
            type="button"
            onClick={handleNextRide}
            className="w-full py-3 bg-[#141414] hover:bg-black active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ready for Next Ride</span>
            <ArrowRight className="w-4 h-4 text-[#FF6B2C]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            Close & View Earnings
          </button>
        </div>
      </div>
    </div>
  );
};
