import React from 'react';
import { 
  Phone, 
  MessageSquare, 
  Share2, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Lock,
  Wallet,
  CreditCard,
  Banknote
} from 'lucide-react';
import { ActiveRide } from '../../types';

export interface PersistentDriverCardProps {
  activeRide: ActiveRide;
  liveEtaData?: {
    stage: string;
    badge: string;
    etaText: string;
    etaClock: string;
    distanceText?: string;
    fullLabel?: string;
  } | null;
  currentFare: number;
  onCall?: () => void;
  onChat?: () => void;
  onShare?: () => void;
  onSos?: () => void;
  onSafety?: () => void;
  onCancel?: () => void;
}

export const PersistentDriverCard: React.FC<PersistentDriverCardProps> = ({
  activeRide,
  liveEtaData,
  currentFare,
  onCall,
  onChat,
  onShare,
  onSos,
  onSafety,
  onCancel
}) => {
  const driverName = activeRide.driverName || 'Assigned Captain';
  const driverPhone = activeRide.driverPhone || '+91 98745 22019';
  const vehicleNumber = activeRide.vehicleNumber || 'WB-06-ER-4821';
  const vehicleModel = activeRide.vehicleModel || 'Mayuri Deluxe Eco E-Rickshaw';
  const totalFare = activeRide.totalFare || activeRide.fare || currentFare;
  const paymentMethod = activeRide.paymentMethod || 'cash';
  const isTripStarted = activeRide.status === 'in_progress' || (activeRide.status as any) === 'RIDE_STARTED' || (activeRide.status as any) === 'RIDE_IN_PROGRESS';
  const isDriverArrived = activeRide.status === 'driver_arrived' || (activeRide.status as any) === 'DRIVER_ARRIVED';

  return (
    <div 
      id="persistent-matched-driver-card"
      className="w-full max-w-none px-3 sm:px-4 sm:max-w-xl md:max-w-2xl sm:mx-auto mt-3 mb-2 relative z-10 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-[#EDE8E0] space-y-4">
        
        {/* ============================================================== */}
        {/* 1. Live ETA & Status Header Banner                             */}
        {/* ============================================================== */}
        <div 
          id="persistent-driver-eta-banner"
          className="p-3.5 bg-[#F6F4F0] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 border border-[#EDE8E0]"
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center mt-0.5 sm:mt-0 shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping absolute ${
                isTripStarted ? 'bg-blue-500' : isDriverArrived ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span className={`w-2.5 h-2.5 rounded-full relative ${
                isTripStarted ? 'bg-blue-600' : isDriverArrived ? 'bg-amber-600' : 'bg-emerald-600'
              }`} />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                  isTripStarted 
                    ? 'text-blue-800 bg-blue-100' 
                    : isDriverArrived 
                    ? 'text-amber-800 bg-amber-100' 
                    : 'text-emerald-800 bg-emerald-100'
                }`}>
                  {isTripStarted ? 'TRIP ONGOING' : isDriverArrived ? 'AT PICKUP SPOT' : 'CAPTAIN ARRIVING'}
                </span>
                <span className="font-black text-[#111111] text-xs sm:text-sm">
                  {liveEtaData?.etaText || (isDriverArrived ? 'Captain is waiting at spot' : 'Arriving in ~2-4 mins')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FF6B2C] shrink-0" />
                  <span>
                    Arrival: <strong className="text-neutral-800 font-semibold">{liveEtaData?.etaClock || 'Now'}</strong>
                  </span>
                </span>
                {liveEtaData?.distanceText && (
                  <>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="text-neutral-600">{liveEtaData.distanceText}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upfront Authoritative Fare Pill */}
          <div className="flex items-center justify-between sm:flex-col sm:items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E4DC]">
            <span className="text-[10px] uppercase font-bold text-neutral-400 sm:block hidden">
              Authoritative Fare
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-neutral-500">₹</span>
              <span className="font-black text-[#111111] text-base sm:text-lg">
                {totalFare}
              </span>
            </div>
            <span className="text-[10px] font-medium text-neutral-500 capitalize flex items-center gap-1">
              {paymentMethod === 'cash' ? (
                <>
                  <Banknote className="w-3 h-3 text-emerald-600" />
                  <span>Cash on Drop</span>
                </>
              ) : paymentMethod === 'wallet' ? (
                <>
                  <Wallet className="w-3 h-3 text-[#FF6B2C]" />
                  <span>Toto Wallet</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3 h-3 text-blue-600" />
                  <span>UPI Payment</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. Captain Profile, Vehicle Details & Start OTP Code           */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Driver Avatar & Name */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              {activeRide.driverPhoto ? (
                <img 
                  src={activeRide.driverPhoto} 
                  alt={driverName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border border-neutral-200 shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#FFF0E6] text-[#C8622A] flex items-center justify-center font-black text-lg border border-[#FFD8C2] shadow-2xs">
                  {driverName.charAt(0)}
                </div>
              )}
              {/* Online indicator */}
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-[#111111] truncate tracking-tight">
                  {driverName}
                </h3>
                <span title="Verified Captain">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </span>
              </div>

              {/* Zero-Pill Typography Metadata */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 flex-wrap">
                <span className="font-semibold text-amber-700 flex items-center gap-0.5">
                  ★ 4.94
                </span>
                <span aria-hidden="true" className="text-neutral-300">·</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 text-[11px]">
                  {vehicleNumber}
                </span>
              </div>

              <p className="text-[11px] text-neutral-500 truncate">
                {vehicleModel} · Eco Electric
              </p>
            </div>
          </div>

          {/* Start Ride PIN OTP Display */}
          <div className="flex items-center sm:flex-col items-end justify-between bg-[#FFFBF7] sm:bg-transparent p-2.5 sm:p-0 rounded-2xl border sm:border-0 border-[#FFE8D6] shrink-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1 sm:justify-end">
                <Lock className="w-2.5 h-2.5 text-[#FF6B2C]" />
                <span>Start OTP</span>
              </span>
              <div className="text-xl sm:text-2xl font-black tracking-widest text-[#111111] font-mono leading-tight">
                {activeRide.otp || '3821'}
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 sm:text-right text-left mt-0.5">
              Share upon boarding
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. Primary Actions: Call, Chat, Share, Emergency SOS           */}
        {/* ============================================================== */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Call Captain */}
          <a
            href={`tel:${driverPhone}`}
            onClick={(e) => {
              if (onCall) {
                e.preventDefault();
                onCall();
              }
            }}
            className="min-h-[46px] py-2 px-1 bg-[#F9F7F4] hover:bg-[#F0ECE6] active:scale-95 text-[#111111] font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-neutral-200 transition-all cursor-pointer"
            title={`Call Captain at ${driverPhone}`}
          >
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Call</span>
          </a>

          {/* Chat with Captain */}
          <button
            type="button"
            onClick={onChat}
            className="min-h-[46px] py-2 px-1 bg-[#F9F7F4] hover:bg-[#F0ECE6] active:scale-95 text-[#111111] font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-neutral-200 transition-all cursor-pointer"
            title="Chat with Captain"
          >
            <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Chat</span>
          </button>

          {/* Share Live Trip */}
          <button
            type="button"
            onClick={onShare}
            className="min-h-[46px] py-2 px-1 bg-[#F9F7F4] hover:bg-[#F0ECE6] active:scale-95 text-[#111111] font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-neutral-200 transition-all cursor-pointer"
            title="Share Live Trip"
          >
            <Share2 className="w-4 h-4 text-[#FF6B2C] shrink-0" />
            <span className="truncate">Share</span>
          </button>

          {/* SOS Safety Toolkit */}
          <button
            type="button"
            onClick={onSos}
            className="min-h-[46px] py-2 px-1 bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-red-200 transition-all cursor-pointer"
            title="Emergency SOS Toolkit"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
            <span className="truncate">SOS</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* 4. Secondary Trip Actions: Safety Center & Cancel Ride         */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onSafety}
            className="flex-1 min-h-[42px] py-2 px-3 bg-[#FAF8F5] hover:bg-[#F0EEEA] text-neutral-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Safety Center</span>
          </button>

          {!isTripStarted && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[42px] py-2 px-3.5 bg-[#FEE2E2] hover:bg-[#FECACA] active:scale-95 text-[#DC2626] font-bold text-xs rounded-xl transition-all cursor-pointer"
              title="Cancel Ride"
            >
              Cancel Ride
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
