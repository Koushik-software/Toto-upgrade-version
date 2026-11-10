import React, { useState, useEffect, useRef } from 'react';
import { Radio, Check, AlertCircle, Clock, X, RotateCw } from 'lucide-react';
import { ActiveRide } from '../../types';

export interface WaitingCaptainToastProps {
  activeRide: ActiveRide | null;
  onCancelRequest?: () => void;
  onRetryRequest?: () => void;
  onDismiss?: () => void;
  currentFare?: number;
}

export const WaitingCaptainToast: React.FC<WaitingCaptainToastProps> = ({
  activeRide,
  onCancelRequest,
  onRetryRequest,
  onDismiss,
  currentFare
}) => {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<'waiting' | 'matched' | 'no_driver' | 'cancelled'>('waiting');
  const [countdown, setCountdown] = useState(15);
  const [driverName, setDriverName] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevRideIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Monitor ride status transitions
  useEffect(() => {
    if (!activeRide) {
      if (stage === 'waiting') {
        setVisible(false);
      }
      prevRideIdRef.current = null;
      prevStatusRef.current = null;
      return;
    }

    const isSearching = activeRide.status === 'searching' || (activeRide.status as any) === 'SEARCHING_DRIVER';
    const isMatched = Boolean(
      (activeRide.driverName || activeRide.driverId) &&
      (
        activeRide.status === 'driver_assigned' ||
        (activeRide.status as any) === 'DRIVER_ASSIGNED' ||
        activeRide.status === 'driver_accepted' ||
        (activeRide.status as any) === 'DRIVER_ACCEPTED' ||
        activeRide.status === 'driver_arriving' ||
        (activeRide.status as any) === 'DRIVER_ARRIVING' ||
        activeRide.status === 'driver_arrived' ||
        (activeRide.status as any) === 'DRIVER_ARRIVED' ||
        activeRide.status === 'in_progress' ||
        (activeRide.status as any) === 'RIDE_STARTED' ||
        (activeRide.status as any) === 'RIDE_IN_PROGRESS'
      )
    );
    const isNoDriver = Boolean(
      activeRide.status === 'no_driver_accepted' ||
      (activeRide.status as any) === 'NO_DRIVER_ACCEPTED' ||
      (activeRide.status as any) === 'no_driver_available' ||
      (activeRide.status as any) === 'NO_DRIVER_AVAILABLE' ||
      (activeRide.status as any) === 'expired'
    );
    const isCancelled = activeRide.status === 'cancelled' || (activeRide.status as any) === 'CUSTOMER_CANCELLED';

    // 1. New searching ride or initial request
    if (isSearching) {
      if (prevRideIdRef.current !== activeRide.id || !visible) {
        setStage('waiting');
        setCountdown(15);
        setVisible(true);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      }
    } 
    // 2. Server Response: Driver Matched
    else if (isMatched && (prevStatusRef.current === 'searching' || stage === 'waiting')) {
      setStage('matched');
      setDriverName(activeRide.driverName || 'Captain');
      setVehicleNumber(activeRide.vehicleNumber || 'Toto E-Rickshaw');
      setVisible(true);

      // Clear countdown timer
      if (timerRef.current) clearInterval(timerRef.current);

      // Auto dismiss after 4.5 seconds
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 4500);
    }
    // 3. Server Response: No Driver Available / Expired
    else if (isNoDriver && stage === 'waiting') {
      setStage('no_driver');
      setVisible(true);

      if (timerRef.current) clearInterval(timerRef.current);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 6000);
    }
    // 4. Server Response: Cancelled
    else if (isCancelled && stage === 'waiting') {
      setStage('cancelled');
      setVisible(true);

      if (timerRef.current) clearInterval(timerRef.current);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    }

    prevRideIdRef.current = activeRide.id;
    prevStatusRef.current = activeRide.status;
  }, [activeRide?.id, activeRide?.status, activeRide?.driverName, activeRide?.driverId]);

  // Handle the 15-second countdown timer during 'waiting' stage
  useEffect(() => {
    if (visible && stage === 'waiting') {
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [visible, stage]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  const fareDisplay = activeRide?.totalFare || currentFare || 30;

  return (
    <div 
      id="waiting-captain-non-blocking-toast"
      className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md pointer-events-none transition-all duration-300 animate-in slide-in-from-top-3 fade-in"
      role="status"
      aria-live="polite"
    >
      {/* Toast Content Box - pointer-events-auto allows interacting with buttons while rest of screen remains clickable */}
      <div className={`pointer-events-auto w-full p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.3)] border backdrop-blur-md transition-colors duration-300 flex items-center justify-between gap-3 ${
        stage === 'waiting'
          ? 'bg-[#181818]/95 text-white border-neutral-700'
          : stage === 'matched'
          ? 'bg-[#064E3B]/95 text-white border-emerald-600 shadow-[0_12px_36px_rgba(6,78,59,0.4)]'
          : stage === 'no_driver'
          ? 'bg-[#78350F]/95 text-white border-amber-600 shadow-[0_12px_36px_rgba(120,53,15,0.4)]'
          : 'bg-neutral-900/95 text-white border-neutral-700'
      }`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status Icon / Visual Counter */}
          {stage === 'waiting' && (
            <div className="relative w-11 h-11 rounded-2xl bg-[#FFF4ED] border border-[#FFD8C2] flex items-center justify-center shrink-0 shadow-2xs">
              <span className="absolute inset-0 rounded-2xl bg-[#FF6B2C]/25 animate-ping" />
              <Radio className="w-5 h-5 text-[#FF6B2C] animate-pulse" />
            </div>
          )}

          {stage === 'matched' && (
            <div className="w-11 h-11 rounded-2xl bg-white text-[#064E3B] flex items-center justify-center shrink-0 shadow-2xs animate-in zoom-in-75">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
          )}

          {stage === 'no_driver' && (
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
          )}

          {stage === 'cancelled' && (
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}

          {/* Text & Progress Details */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                {stage === 'waiting' && 'Waiting for Captain'}
                {stage === 'matched' && 'Captain Matched!'}
                {stage === 'no_driver' && 'No Captain Available'}
                {stage === 'cancelled' && 'Request Cancelled'}
              </h4>

              {stage === 'waiting' && (
                <span className="text-[11px] font-mono bg-[#FF6B2C]/20 border border-[#FF6B2C]/50 text-[#FF9E70] px-2 py-0.5 rounded-full font-bold tabular-nums">
                  {countdown > 0 ? `${countdown}s` : 'Searching...'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-neutral-300 truncate">
              {stage === 'waiting' && `Broadcasting request · Upfront ₹${fareDisplay}`}
              {stage === 'matched' && `${driverName || 'Captain'} accepted your ride (${vehicleNumber})`}
              {stage === 'no_driver' && 'Nearby captains are busy. Tap retry to dispatch again.'}
              {stage === 'cancelled' && 'Ride request has been cancelled.'}
            </p>

            {/* Subtle Progress Bar during 15-second countdown */}
            {stage === 'waiting' && (
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden mt-1.5">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF6B2C] to-[#FFA133] transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.max(4, (countdown / 15) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {stage === 'waiting' && onCancelRequest && (
            <button
              type="button"
              onClick={() => {
                onCancelRequest();
                setVisible(false);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] text-neutral-200 hover:text-white font-bold transition-all cursor-pointer"
              title="Cancel request"
            >
              Cancel
            </button>
          )}

          {stage === 'no_driver' && onRetryRequest && (
            <button
              type="button"
              onClick={() => {
                onRetryRequest();
                setStage('waiting');
                setCountdown(15);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-[11px] text-black font-extrabold transition-all flex items-center gap-1 cursor-pointer"
              title="Retry booking"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          {stage !== 'waiting' && (
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                if (onDismiss) onDismiss();
              }}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
