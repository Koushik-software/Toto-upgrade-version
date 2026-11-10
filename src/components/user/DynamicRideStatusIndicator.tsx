import React, { useMemo } from 'react';
import { ActiveRide } from '../../types';
import { 
  Radio, 
  Navigation, 
  MapPin, 
  Check, 
  Clock, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Share2, 
  AlertTriangle, 
  Zap, 
  ChevronRight,
  Sparkles,
  Search,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface DynamicRideStatusIndicatorProps {
  activeRide: ActiveRide;
  onCancelRide?: () => void;
  onCallDriver?: () => void;
  onOpenChat?: () => void;
  onOpenShareTrip?: () => void;
  onOpenSos?: () => void;
  onOpenSafety?: () => void;
}

type StageType = 'looking' | 'en_route' | 'in_progress' | 'completed';

export const DynamicRideStatusIndicator: React.FC<DynamicRideStatusIndicatorProps> = ({
  activeRide,
  onCancelRide,
  onCallDriver,
  onOpenChat,
  onOpenShareTrip,
  onOpenSos,
  onOpenSafety,
}) => {
  // Determine current active stage index and key
  const currentStage: StageType = useMemo(() => {
    switch (activeRide.status) {
      case 'searching':
        return 'looking';
      case 'driver_assigned':
      case 'driver_arriving':
      case 'driver_arrived':
        return 'en_route';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      default:
        return 'looking';
    }
  }, [activeRide.status]);

  const stageIndex = useMemo(() => {
    switch (currentStage) {
      case 'looking':
        return 0;
      case 'en_route':
        return 1;
      case 'in_progress':
        return 2;
      case 'completed':
        return 3;
    }
  }, [currentStage]);

  // Stage configuration details
  const stageConfig = useMemo(() => {
    switch (currentStage) {
      case 'looking':
        return {
          title: 'Looking for Captain',
          badgeText: 'Step 1 of 3 • Searching',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          indicatorColor: 'bg-amber-500',
          pulseColor: 'bg-amber-400',
          subtitle: 'Matching with nearest available Toto drivers...',
          etaText: '~2-3 mins',
        };
      case 'en_route':
        return {
          title: activeRide.status === 'driver_arrived' ? 'Captain Arrived at Pickup' : 'Captain En Route',
          badgeText: activeRide.status === 'driver_arrived' ? 'Step 2 of 3 • At Pickup' : 'Step 2 of 3 • Arriving',
          badgeColor: activeRide.status === 'driver_arrived' 
            ? 'bg-blue-100 text-blue-900 border-blue-300' 
            : 'bg-emerald-100 text-emerald-900 border-emerald-300',
          indicatorColor: activeRide.status === 'driver_arrived' ? 'bg-blue-600' : 'bg-emerald-500',
          pulseColor: activeRide.status === 'driver_arrived' ? 'bg-blue-400' : 'bg-emerald-400',
          subtitle: activeRide.status === 'driver_arrived'
            ? 'Captain has arrived at your pickup spot. Please verify PIN OTP.'
            : `${activeRide.driverName || 'Captain'} is heading towards your pickup location.`,
          etaText: activeRide.status === 'driver_arrived' ? 'Waiting for you' : 'Arriving in ~2 mins',
        };
      case 'in_progress':
        return {
          title: 'Trip In Progress',
          badgeText: 'Step 3 of 3 • Live Ride',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          indicatorColor: 'bg-emerald-500',
          pulseColor: 'bg-emerald-400',
          subtitle: `En route to ${activeRide.dropoff.name || 'destination'}`,
          etaText: 'Destination ~8 mins',
        };
      case 'completed':
        return {
          title: 'Trip Completed',
          badgeText: 'Completed',
          badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300',
          indicatorColor: 'bg-neutral-700',
          pulseColor: 'bg-neutral-400',
          subtitle: `Arrived safely at ${activeRide.dropoff.name}`,
          etaText: 'Settled',
        };
    }
  }, [currentStage, activeRide.status, activeRide.driverName, activeRide.dropoff.name]);

  // The 3 explicit progression steps requested
  const steps = [
    {
      key: 'looking',
      name: 'Looking for Captain',
      shortLabel: 'Looking',
      icon: Search,
      stepNumber: 1,
    },
    {
      key: 'en_route',
      name: 'Captain En Route',
      shortLabel: 'En Route',
      icon: Navigation,
      stepNumber: 2,
    },
    {
      key: 'in_progress',
      name: 'Trip In Progress',
      shortLabel: 'In Progress',
      icon: MapPin,
      stepNumber: 3,
    },
  ];

  return (
    <div 
      id="dynamic-ride-status-indicator"
      className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-[#EDE8E0] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {/* 1. Header: Live Beacon + Current Stage Title & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stageConfig.pulseColor}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stageConfig.indicatorColor}`} />
            </span>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wider ${stageConfig.badgeColor}`}>
              {stageConfig.badgeText}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight truncate">
            {stageConfig.title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {stageConfig.subtitle}
          </p>
        </div>

        {/* Fare / ETA Pill */}
        <div className="text-right shrink-0 bg-[#FAF8F5] border border-[#EDE8E0] px-3 py-1.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-gray-400">Total Fare</div>
          <div className="text-base font-black text-[#111111]">
            ₹{activeRide.totalFare}
          </div>
        </div>
      </div>

      {/* 2. Dynamic 3-Step Stepper Track */}
      <div 
        id="ride-progression-stepper"
        className="bg-[#FAF8F5] border border-[#EDE8E0] rounded-2xl p-3 sm:p-4 select-none"
      >
        <div className="flex items-center justify-between relative">
          {steps.map((step, idx) => {
            const isCompleted = stageIndex > idx;
            const isCurrent = stageIndex === idx;
            const isPending = stageIndex < idx;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.key}>
                {/* Step Item */}
                <div className="flex flex-col items-center relative z-10 text-center min-w-[70px] sm:min-w-[90px]">
                  {/* Step Node Circle */}
                  <div 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : isCurrent
                        ? 'bg-[#141414] text-white ring-4 ring-[#FF6B2C]/20 shadow-md scale-105'
                        : 'bg-white border-2 border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <StepIcon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isCurrent ? 'text-[#FF6B2C]' : 'text-neutral-400'}`} />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-2 text-center">
                    <span 
                      className={`block text-[11px] sm:text-xs font-bold leading-tight ${
                        isCurrent 
                          ? 'text-[#111111]' 
                          : isCompleted 
                          ? 'text-emerald-700' 
                          : 'text-neutral-400'
                      }`}
                    >
                      {step.name}
                    </span>
                    <span className="text-[9px] font-medium text-neutral-400 block mt-0.5">
                      {isCompleted ? 'Done' : isCurrent ? 'Active Now' : `Step ${step.stepNumber}`}
                    </span>
                  </div>
                </div>

                {/* Connector Line between Steps */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-1.5 sm:mx-2 bg-neutral-200 rounded-full relative -top-3 sm:-top-3.5 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                      style={{
                        width: stageIndex > idx ? '100%' : stageIndex === idx ? '50%' : '0%'
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Stage-Specific Contextual Content Panel */}

      {/* STAGE 1: Looking for Captain */}
      {currentStage === 'looking' && (
        <div 
          id="stage-looking-panel"
          className="bg-[#FFFBF7] border border-[#FDE8DC] rounded-2xl p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-300"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF6B2C]/10 text-[#FF6B2C] flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#111111]">
                  Connecting to Nearby Drivers
                </h4>
                <p className="text-[11px] text-gray-500">
                  Sending ride request to verified Toto partners in Sector V...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#FF6B2C] shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>{stageConfig.etaText}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#F5E6DC] text-xs">
            <span className="text-gray-500 text-[11px]">
              Pickup: <strong className="text-gray-800">{activeRide.pickup.name}</strong>
            </span>
            {onCancelRide && (
              <button
                type="button"
                onClick={onCancelRide}
                className="text-red-600 hover:text-red-800 font-bold text-xs cursor-pointer py-1 px-2.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Captain En Route (Driver Assigned or Arrived) */}
      {currentStage === 'en_route' && (
        <div 
          id="stage-en-route-panel"
          className="bg-[#F8FAF9] border border-[#D5EBDA] rounded-2xl p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-300"
        >
          {/* Driver Details Strip */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {activeRide.driverPhoto ? (
                <img 
                  src={activeRide.driverPhoto} 
                  alt={activeRide.driverName}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-200">
                  {activeRide.driverName ? activeRide.driverName.charAt(0) : 'T'}
                </div>
              )}

              <div className="min-w-0">
                <div className="text-sm font-bold text-[#111111] truncate flex items-center gap-1.5">
                  <span>{activeRide.driverName || 'Subhashish Mondal'}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-semibold">
                    ★ 4.9
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono truncate">
                  {activeRide.vehicleNumber || 'WB-06-ER-4821'} • {activeRide.vehicleModel || 'Electric Toto'}
                </div>
              </div>
            </div>

            {/* OTP Box */}
            {activeRide.otp && (
              <div className="bg-white border-2 border-[#141414] rounded-xl px-2.5 py-1 text-right shrink-0 shadow-2xs">
                <div className="text-[8px] uppercase font-extrabold text-gray-400">PIN OTP</div>
                <div className="text-sm sm:text-base font-black tracking-widest text-[#111111] font-mono">
                  {activeRide.otp}
                </div>
              </div>
            )}
          </div>

          {/* Real-time Arrival Alert Banner */}
          <div className="bg-white rounded-xl p-2.5 border border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="font-semibold text-gray-800 truncate">
                {activeRide.status === 'driver_arrived' 
                  ? 'Toto is waiting at your pickup spot' 
                  : 'Captain is approaching your pickup spot'}
              </span>
            </div>
            <div className="font-bold text-emerald-700 font-mono text-[11px] shrink-0">
              {stageConfig.etaText}
            </div>
          </div>

          {/* Fast Actions: Call & Chat */}
          <div className="flex items-center gap-2 pt-0.5">
            {onCallDriver && (
              <button
                type="button"
                onClick={onCallDriver}
                className="flex-1 min-h-[42px] py-2 px-3 bg-white hover:bg-gray-50 text-[#111111] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call Captain</span>
              </button>
            )}

            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="flex-1 min-h-[42px] py-2 px-3 bg-white hover:bg-gray-50 text-[#111111] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Chat</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Trip In Progress */}
      {currentStage === 'in_progress' && (
        <div 
          id="stage-in-progress-panel"
          className="bg-[#F8FAF9] border border-emerald-200 rounded-2xl p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-300"
        >
          {/* Destination & Live Route Info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Navigation className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Destination
                </div>
                <div className="text-sm font-bold text-[#111111] truncate">
                  {activeRide.dropoff.name}
                </div>
                <div className="text-[11px] text-gray-500 truncate mt-0.5">
                  {activeRide.dropoff.address || 'Sector V, Salt Lake, Kolkata'}
                </div>
              </div>
            </div>

            {/* Safety Verified Badge */}
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ride Protected</span>
            </div>
          </div>

          {/* Quick Actions: Share, SOS & Chat */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-100">
            {onOpenShareTrip && (
              <button
                type="button"
                onClick={onOpenShareTrip}
                className="min-h-[40px] py-1.5 px-2 bg-white hover:bg-gray-50 text-[#111111] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5 text-[#FF6B2C]" />
                <span>Share</span>
              </button>
            )}

            {onOpenSafety && (
              <button
                type="button"
                onClick={onOpenSafety}
                className="min-h-[40px] py-1.5 px-2 bg-white hover:bg-gray-50 text-[#111111] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Safety</span>
              </button>
            )}

            {onOpenSos && (
              <button
                type="button"
                onClick={onOpenSos}
                className="min-h-[40px] py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-red-200 transition-colors cursor-pointer shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>SOS</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 4: Trip Completed */}
      {currentStage === 'completed' && (
        <div 
          id="stage-completed-panel"
          className="bg-[#FAF8F5] border border-[#EDE8E0] rounded-2xl p-3.5 text-center space-y-1.5 animate-in fade-in duration-300"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-[#111111]">Trip Successfully Completed</h4>
          <p className="text-[11px] text-gray-500">
            Thank you for riding with Rapido Toto Eco Mobility!
          </p>
        </div>
      )}
    </div>
  );
};
