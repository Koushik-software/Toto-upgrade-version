import React, { useState, useEffect, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { InteractiveMap } from '../map/InteractiveMap';
import { POPULAR_LOCATIONS } from '../../data/appData';
import { useMobileGps } from '../../hooks/useMobileGps';
import { TripRecord, RideRequestDoc } from '../../types';
import { appDb } from '../../lib/supabase';
import { 
  RotateCw, 
  Check, 
  Phone, 
  Navigation, 
  IndianRupee, 
  QrCode,
  X,
  ShieldCheck, 
  Zap, 
  Radio, 
  LocateFixed, 
  Power,
  Bell,
  ArrowRight,
  Sparkles,
  Layers,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBackHandler } from '../../hooks/useBackHandler';
import { ChatModal } from '../modals/ChatModal';
import { TripCelebrationModal, CompletedTripSummary } from './TripCelebrationModal';
import { DriverTripsPage } from './DriverTripsPage';
import { DriverProfilePage } from './DriverProfilePage';

export const DriverDashboard: React.FC = () => {
  const { 
    driver, 
    setDriverOnlineStatus, 
    activeRide, 
    pendingDriverRequest, 
    userGpsPoint,
    driverGpsPoint,
    updateDriverGpsPoint,
    driverAcceptRide, 
    driverDeclineRide, 
    driverArriveAtPickup, 
    driverStartRideWithOtp, 
    driverCompleteRide, 
    createRideBooking,
    dispatchRideRequest,
    setActiveRole,
    triggerSound,
    activeNavTab,
    setActiveNavTab
  } = useRide();

  // Modals & UI states
  const [isDriverChatOpen, setIsDriverChatOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [justAccepted, setJustAccepted] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebratedTripData, setCelebratedTripData] = useState<CompletedTripSummary | null>(null);
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [doubleAcceptWarning, setDoubleAcceptWarning] = useState<string | null>(null);

  // 1. Ride Request Notification Banner State
  const [incomingRequest, setIncomingRequest] = useState<RideRequestDoc | null>(null);
  const [showRequestBanner, setShowRequestBanner] = useState(false);
  const [bannerCountdown, setBannerCountdown] = useState(12);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Earnings Summary derived from 'trips'
  const [completedTrips, setCompletedTrips] = useState<TripRecord[]>([]);
  const [dashboardTotalEarnings, setDashboardTotalEarnings] = useState<number>(0);
  const [dashboardTodayEarnings, setDashboardTodayEarnings] = useState<number>(0);

  const isOnline = Boolean(driver?.isOnline && driver?.availabilityStatus !== 'offline' && driver?.availabilityStatus !== 'inactive');

  // Real-Time Mobile GPS Tracking for Driver / Toto Partner
  const {
    gpsState,
    hasRealGpsFix,
    refreshCurrentLocation
  } = useMobileGps({
    autoStart: true,
    enableHighAccuracy: true,
    onLocationUpdate: (point) => {
      updateDriverGpsPoint(point);
    },
    fallbackPoint: {
      lat: 22.5830,
      lng: 88.4350,
      name: 'Sector V Partner Stand',
      address: 'Near SDF Building, Bidhannagar',
      zone: 'Transit Area'
    }
  });

  // Active target ride to show (either pending incoming or accepted active ride)
  const currentRide = pendingDriverRequest || (activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' ? activeRide : null);

  // Mobile Android/iOS System Back Navigation Handlers
  useBackHandler('driver:modal:chat', isDriverChatOpen, () => setIsDriverChatOpen(false), 20);
  useBackHandler('driver:modal:celebration', showCelebrationModal, () => setShowCelebrationModal(false), 20);
  useBackHandler('driver:modal:upiQr', showUpiQrModal, () => setShowUpiQrModal(false), 20);
  useBackHandler('driver:banner:request', showRequestBanner, () => setShowRequestBanner(false), 15);
  useBackHandler('driver:tab:rides', activeNavTab === 'rides', () => setActiveNavTab('home'), 10);
  useBackHandler('driver:tab:profile', activeNavTab === 'profile', () => setActiveNavTab('home'), 10);

  // Bottom Navigation listeners
  useEffect(() => {
    const handleOpenProfile = () => setActiveNavTab('profile');
    const handleOpenHistory = () => setActiveNavTab('rides');
    const handleCloseAll = () => {
      setActiveNavTab('home');
      setIsDriverChatOpen(false);
      setShowCelebrationModal(false);
      setShowUpiQrModal(false);
    };

    window.addEventListener('openProfileSettings', handleOpenProfile);
    window.addEventListener('openRideHistory', handleOpenHistory);
    window.addEventListener('closeAllModals', handleCloseAll);

    return () => {
      window.removeEventListener('openProfileSettings', handleOpenProfile);
      window.removeEventListener('openRideHistory', handleOpenHistory);
      window.removeEventListener('closeAllModals', handleCloseAll);
    };
  }, [setActiveNavTab]);

  // Set just accepted indicator
  useEffect(() => {
    if (activeRide && activeRide.status === 'driver_assigned') {
      setJustAccepted(true);
    }
  }, [activeRide?.status]);

  // --------------------------------------------------------------------------
  // FEATURE 1: Real-time Ride Request Notification Banner
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOnline || !driver?.id) {
      setShowRequestBanner(false);
      setIncomingRequest(null);
      return;
    }

    // Listen to 'rideRequests' where status is 'searching'
    const unsubscribe = appDb.subscribe<RideRequestDoc>('rideRequests', (allRequests) => {
      const matches = allRequests.filter(
        (data) => data.status === 'searching' && (data.driverId === driver.id || data.driverId === 'all')
      );

      if (matches.length > 0) {
        matches.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const newest = matches[0];

        // Trigger banner alert
        setIncomingRequest(newest);
        setShowRequestBanner(true);
        setBannerCountdown(12);
        triggerSound('alert');
      }
    });

    return () => unsubscribe();
  }, [isOnline, driver?.id]);

  // Banner countdown timer (disappears after a few seconds)
  useEffect(() => {
    if (showRequestBanner) {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
      bannerTimerRef.current = setInterval(() => {
        setBannerCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(bannerTimerRef.current!);
            setShowRequestBanner(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    }

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [showRequestBanner]);

  // Handle Driver Acknowledges Banner
  const handleAcknowledgeBanner = async () => {
    if (!incomingRequest) return;
    triggerSound('success');
    setShowRequestBanner(false);

    try {
      // 1. Mark request as accepted in store
      appDb.update('rideRequests', incomingRequest.id, {
        status: 'accepted',
        acceptedByDriverId: driver?.id || 'drv_general',
        acceptedAt: new Date().toISOString()
      });
    } catch {
      // Non-blocking
    }

    // 2. Accept ride in context
    driverAcceptRide(incomingRequest.rideId);
    setJustAccepted(true);
  };

  // --------------------------------------------------------------------------
  // FEATURE 2: Upgraded Earnings Summary dynamically derived from 'trips'
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!driver?.id) return;

    // Real-time listener for trips in Supabase-ready store
    const unsubscribe = appDb.subscribe<TripRecord>('trips', (allTrips) => {
      const records: TripRecord[] = [];
      let total = 0;
      let today = 0;
      const todayStr = new Date().toDateString();

      allTrips.forEach((trip) => {
        if (trip.status === 'completed' && (
          trip.driverId === driver.id || 
          trip.driverId === 'all' || 
          (driver.id === 'drv_subhashish' && trip.driverId === 'drv_subhashish')
        )) {
          records.push(trip);
          const amount = Number(trip.fare) || 0;
          total += amount;

          if (trip.completedAt && new Date(trip.completedAt).toDateString() === todayStr) {
            today += amount;
          }
        }
      });

      records.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      setCompletedTrips(records);

      // Real earnings calculation from trips or driver profile
      const effectiveTotal = records.length > 0 ? total : (driver.totalEarnings || 0);
      const effectiveToday = records.length > 0 ? today : (driver.todayEarnings || 0);
      setDashboardTotalEarnings(effectiveTotal);
      setDashboardTodayEarnings(effectiveToday);
    });

    return () => unsubscribe();
  }, [driver?.id, driver?.todayEarnings, driver?.totalEarnings]);

  // Handle Online/Offline Status Toggle Switch and persist
  const handleToggleAvailability = async (forcedStatus?: boolean) => {
    if (isUpdatingStatus) return;
    const nextStatus = typeof forcedStatus === 'boolean' ? forcedStatus : !isOnline;
    setIsUpdatingStatus(true);
    triggerSound('beep');
    try {
      await setDriverOnlineStatus(nextStatus);
    } catch (err) {
      console.error('Failed to update driver status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Accept with atomic double-accept protection
  const handleAccept = async () => {
    const targetRide = pendingDriverRequest || currentRide;
    if (targetRide) {
      setDoubleAcceptWarning(null);
      const res = await driverAcceptRide(targetRide.id);
      if (res && !res.success) {
        setDoubleAcceptWarning(res.message || 'Ride already accepted by another Captain');
        setTimeout(() => setDoubleAcceptWarning(null), 5000);
      } else {
        setJustAccepted(true);
      }
    }
  };

  // Handle Decline / Cancel
  const handleDecline = () => {
    const targetRide = pendingDriverRequest || currentRide;
    if (targetRide) {
      driverDeclineRide(targetRide.id);
      setJustAccepted(false);
    }
  };

  // Refresh feed - purely syncs location, never generates fake rides
  const handleRefreshClick = () => {
    triggerSound('beep');
    if (driverGpsPoint && updateDriverGpsPoint) {
      updateDriverGpsPoint(driverGpsPoint);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    const result = await driverStartRideWithOtp(otpInput);
    if (!result.success) {
      setOtpError(result.message);
      triggerSound('alert');
    } else {
      setOtpInput('');
      setJustAccepted(false);
    }
  };

  // Handle Ride Complete with Celebratory Confirmation Modal
  const handleCompleteRide = () => {
    const targetRide = activeRide || currentRide;
    if (targetRide) {
      setCelebratedTripData({
        id: targetRide.id,
        passengerName: targetRide.userName || 'Passenger',
        passengerPhone: targetRide.userPhone,
        pickupName: targetRide.pickup.name,
        dropoffName: targetRide.dropoff.name,
        distanceKm: targetRide.distanceKm || 2.4,
        totalFare: targetRide.totalFare,
        driverEarnings: targetRide.driverEarnings || Math.round(targetRide.totalFare * 0.95),
        paymentMethod: targetRide.paymentMethod || 'cash',
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
    triggerSound('success');
    driverCompleteRide();
    setShowCelebrationModal(true);
    setJustAccepted(false);
  };

  return (
    <div className={`w-full mx-auto font-sans select-none flex-1 transition-all ${
      activeNavTab === 'rides'
        ? 'max-w-2xl py-1 sm:py-3 px-1.5 sm:px-4'
        : activeNavTab === 'profile'
        ? 'max-w-xl py-1 sm:py-3 px-1.5 sm:px-4'
        : 'max-w-lg py-2 px-2.5 sm:px-4 space-y-4'
    }`}>
      {activeNavTab === 'rides' ? (
        <DriverTripsPage
          trips={completedTrips}
          totalEarnings={dashboardTotalEarnings}
          onNavigateHome={() => setActiveNavTab('home')}
        />
      ) : activeNavTab === 'profile' ? (
        <DriverProfilePage
          onNavigateHome={() => setActiveNavTab('home')}
        />
      ) : (
        <>
          {/* -------------------------------------------------------------------------- */}
          {/* FEATURE 1: REAL PASSENGER RIDE REQUEST NOTIFICATION BANNER (Top of Screen)  */}
          {/* -------------------------------------------------------------------------- */}
          {pendingDriverRequest && isOnline && (!activeRide || activeRide.status === 'completed' || activeRide.status === 'cancelled') && (
            <div 
              id="driver-real-ride-request-banner"
              className="bg-[#181818] text-white rounded-3xl p-4 shadow-2xl border-2 border-[#FF6B2C] animate-in slide-in-from-top-4 duration-300 space-y-3"
            >
              {/* Top Banner Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-3.5 w-3.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B2C] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF6B2C]"></span>
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-[#FF6B2C] flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5" />
                      <span>NEW RIDE REQUEST!</span>
                    </div>
                    <div className="text-sm font-extrabold text-white truncate">
                      ₹{pendingDriverRequest.totalFare} · {pendingDriverRequest.userName || 'Passenger'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-[#FF824D] bg-[#FF6B2C]/20 border border-[#FF6B2C]/40 px-2 py-0.5 rounded-full font-bold">
                    {pendingDriverRequest.vehicleType?.toUpperCase() || 'TOTO'}
                  </span>
                  <button
                    type="button"
                    onClick={() => driverDeclineRide(pendingDriverRequest.id)}
                    className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer transition-colors"
                    title="Dismiss Request"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Route Info: Pickup & Destination */}
              <div className="bg-neutral-900/90 rounded-2xl p-3 text-xs space-y-2 border border-neutral-800">
                <div className="flex items-center gap-2.5 truncate text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B2C] shrink-0" />
                  <span className="truncate font-medium">Pickup: <strong className="text-white">{pendingDriverRequest.pickup.name || pendingDriverRequest.pickup.address}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 truncate text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 shrink-0" />
                  <span className="truncate font-medium">Dropoff: <strong className="text-white font-bold">{pendingDriverRequest.dropoff.name || pendingDriverRequest.dropoff.address}</strong></span>
                </div>
              </div>

              {/* Actions: ACCEPT and REJECT */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => driverDeclineRide(pendingDriverRequest.id)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 rounded-2xl text-xs font-bold cursor-pointer transition-all"
                >
                  REJECT
                </button>
                <button
                  id="captain-accept-request-btn"
                  type="button"
                  onClick={handleAccept}
                  className="flex-2 py-3 bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-95 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>ACCEPT RIDE (₹{pendingDriverRequest.totalFare})</span>
                </button>
              </div>
            </div>
          )}

          {/* Double Accept or Expiration Warning Notice */}
          {doubleAcceptWarning && (
            <div 
              id="double-accept-warning-banner"
              className="bg-red-900/90 text-white rounded-3xl p-3.5 shadow-2xl border-2 border-red-500 animate-in slide-in-from-top-4 duration-300 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-red-300 uppercase tracking-wide">Notice</div>
                  <div className="text-xs sm:text-sm font-extrabold text-white truncate">{doubleAcceptWarning}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDoubleAcceptWarning(null)}
                className="w-7 h-7 rounded-full bg-red-800 hover:bg-red-700 flex items-center justify-center text-white shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

      {showRequestBanner && incomingRequest && isOnline && !pendingDriverRequest && (
        <div 
          id="driver-ride-request-banner"
          className="bg-[#181818] text-white rounded-3xl p-4 shadow-2xl border-2 border-[#FF6B2C] animate-in slide-in-from-top-4 duration-300 space-y-3"
        >
          {/* Top Banner Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B2C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF6B2C]"></span>
              </span>
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#FF6B2C] flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  <span>NEW RIDE REQUEST!</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  ₹{incomingRequest.fare} · {incomingRequest.passengerName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                {bannerCountdown}s
              </span>
              <button
                type="button"
                onClick={() => setShowRequestBanner(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer transition-colors"
                title="Dismiss Banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Route Info */}
          <div className="bg-neutral-900 rounded-2xl p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-2 truncate text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-[#FF6B2C] shrink-0" />
              <span className="truncate">{incomingRequest.pickupName}</span>
            </div>
            <div className="flex items-center gap-2 truncate text-neutral-300">
              <span className="w-2 h-2 rounded-xs bg-white shrink-0" />
              <span className="truncate font-semibold text-white">{incomingRequest.dropoffName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setShowRequestBanner(false)}
              className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 rounded-2xl text-xs font-semibold cursor-pointer transition-all"
            >
              Dismiss
            </button>
            <button
              id="acknowledge-banner-btn"
              type="button"
              onClick={handleAcknowledgeBanner}
              className="flex-2 py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-95 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Acknowledge & Accept</span>
            </button>
          </div>
        </div>
      )}



      {/* Real-Time Duty Availability Switch Card */}
      <div 
        id="driver-duty-switch-card"
        className={`p-4 rounded-3xl border transition-all duration-300 shadow-xs flex items-center justify-between gap-3.5 ${
          isOnline 
            ? 'bg-emerald-50/80 border-emerald-200/80' 
            : 'bg-neutral-100/90 border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
            isOnline 
              ? 'bg-emerald-500 text-white shadow-xs' 
              : 'bg-neutral-300 text-neutral-600'
          }`}>
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#111111]">
                {isOnline ? 'You are Online' : 'You are Offline'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                isOnline 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-neutral-200 text-neutral-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                <span>{isOnline ? 'ACCEPTING RIDES' : 'OFF DUTY'}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isOnline 
                ? 'Broadcasting live Toto beacon to nearby passengers' 
                : 'Turn on to start receiving passenger ride bookings'}
            </p>
          </div>
        </div>

        {/* Real-time Toggle Switch */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            id="driver-availability-toggle-switch"
            role="switch"
            aria-checked={isOnline}
            aria-label="Toggle driver availability online or offline"
            disabled={isUpdatingStatus}
            onClick={() => handleToggleAvailability()}
            type="button"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#FF6B2C] focus:ring-offset-2 disabled:opacity-50 ${
              isOnline ? 'bg-emerald-500' : 'bg-neutral-300'
            }`}
          >
            <span className="sr-only">Toggle availability</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isOnline ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {isUpdatingStatus ? (
                <RotateCw className="w-3 h-3 text-neutral-500 animate-spin" />
              ) : (
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
              )}
            </span>
          </button>
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
            {isUpdatingStatus ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* FEATURE 2: UPGRADED EARNINGS SUMMARY CARD                                  */}
      {/* -------------------------------------------------------------------------- */}
      <div 
        id="driver-earnings-summary-card"
        className="bg-[#141414] rounded-3xl p-5 text-white shadow-xs space-y-4 border border-neutral-800"
      >
        {/* Top row: Label & Sync status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888888]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TOTAL EARNINGS</span>
          </div>


        </div>

        {/* Big Earnings Amount */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-1">
              <span>₹{dashboardTotalEarnings}</span>
            </div>
            <div className="text-xs text-[#AAAAAA] mt-1 flex items-center gap-2">
              <span>Today: <strong className="text-white">₹{dashboardTodayEarnings}</strong></span>
              <span>•</span>
              <span>{completedTrips.length || driver?.totalTrips || 8} rides completed</span>
            </div>
          </div>


        </div>


      </div>



      {/* Section Title & Quick Simulator */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base font-bold text-[#111111]">
          {currentRide ? 'Active Request' : 'Live Area Radar'}
        </h2>
        <div className="flex items-center gap-2">


          <button
            type="button"
            onClick={handleRefreshClick}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#C8622A] hover:bg-neutral-100 active:rotate-180 transition-all cursor-pointer"
            title="Refresh Network Feed"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View 1: Active Incoming / Accepted Ride */}
      {isOnline && currentRide && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <InteractiveMap
            pickup={currentRide.pickup}
            dropoff={currentRide.dropoff}
            activeRide={activeRide}
            mode="driver"
            driverGpsState={gpsState}
            userGpsState={userGpsPoint ? {
              lat: userGpsPoint.lat,
              lng: userGpsPoint.lng,
              accuracy: 12,
              speedKmH: 0,
              timestamp: Date.now(),
              isWatching: true
            } : null}
            onCenterGps={refreshCurrentLocation}
            heightClass="h-[180px] sm:h-[200px]"
          />

          {/* Passenger Request Card */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#EDE8E0] space-y-4">
            {pendingDriverRequest && (
              <div className="bg-[#FFF4ED] border border-[#FFD8C2] rounded-2xl p-3 flex items-center justify-between text-xs text-[#C8622A] animate-pulse">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B2C] animate-ping" />
                  <span>Passenger selected your Toto bid!</span>
                </div>
                {currentRide.selectedOfferTag && (
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold border border-[#FFD8C2] text-[#C8622A]">
                    {currentRide.selectedOfferTag}
                  </span>
                )}
              </div>
            )}

            {/* Passenger Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#FDE8DC] text-[#C8622A] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {currentRide.userName ? currentRide.userName.charAt(0) : 'A'}
                </div>

                <div>
                  <div className="text-sm font-bold text-[#111111]">
                    {currentRide.userName || 'Ananya Sharma'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a 
                      href={`tel:${currentRide.userPhone || '+919000012345'}`}
                      className="text-xs text-[#1F7A3E] font-medium flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3 text-[#1F7A3E] fill-[#1F7A3E]" />
                      <span>{currentRide.userPhone || '+91 90000 12345'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsDriverChatOpen(true)}
                      className="px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Chat with Passenger"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fare Display */}
              <div className="text-right">
                <div className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">
                  FARE
                </div>
                <div className="text-xl font-extrabold text-[#111111]">
                  ₹{currentRide.totalFare || 89}
                </div>
              </div>
            </div>

            {/* Route Box */}
            <div className="bg-[#F6F4F0] rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#111111] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FF7A1A] shrink-0" />
                <span className="line-clamp-1">{currentRide.pickup.name}</span>
              </div>
              <div className="pl-1 -my-1">
                <div className="w-px h-3 bg-[#DCD6CC]" />
              </div>
              <div className="flex items-center gap-2 text-[#111111] font-medium">
                <span className="w-2 h-2 bg-[#111111] rounded-xs shrink-0" />
                <span className="line-clamp-1">{currentRide.dropoff.name}</span>
              </div>
            </div>

            {/* Bottom Actions Row (Cancel vs. Accept ride) */}
            {activeRide?.status !== 'in_progress' && activeRide?.status !== 'driver_arrived' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecline}
                    className="flex-1 py-3 px-4 bg-[#F0EEEA] hover:bg-[#E5E2DC] active:scale-[0.98] text-[#222222] font-semibold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={activeRide?.status === 'driver_assigned'}
                    className="flex-2 py-3 px-4 bg-[#23864A] hover:bg-[#1E7740] active:scale-[0.98] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-90"
                  >
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                    <span>Accept ride</span>
                  </button>
                </div>

                {(justAccepted || activeRide?.status === 'driver_assigned') && (
                  <div className="text-center">
                    <span className="text-xs font-semibold text-[#23864A]">
                      Ride accepted.
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Interactive Ride Progression Controls (Arrive -> OTP -> Complete) */}
            {activeRide && (activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arrived' || activeRide.status === 'in_progress') && (
              <div className="pt-2 border-t border-neutral-100 space-y-3">
                {activeRide.status === 'driver_assigned' && (
                  <button
                    type="button"
                    onClick={driverArriveAtPickup}
                    className="w-full py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Tap When Arrived at Pickup</span>
                  </button>
                )}

                {activeRide.status === 'driver_arrived' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">Enter Passenger's 4-Digit PIN</span>
                      <span className="text-[11px] text-gray-400 font-medium">Ask passenger for their code</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit OTP"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="flex-1 bg-[#F6F4F0] border border-neutral-200 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest rounded-2xl focus:outline-none focus:border-black"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#23864A] hover:bg-[#1E7740] text-white font-bold text-xs rounded-2xl shadow-xs cursor-pointer"
                      >
                        Start Trip
                      </button>
                    </div>

                    {otpError && (
                      <p className="text-[11px] text-red-600 font-semibold">{otpError}</p>
                    )}
                  </form>
                )}

                {activeRide.status === 'in_progress' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowUpiQrModal(true)}
                      className="w-full py-2 bg-[#F6F4F0] hover:bg-[#EAE6DE] text-gray-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#FF6B2C]" />
                      <span>Show UPI QR Code to Passenger</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteRide}
                      className="w-full py-3 bg-[#23864A] hover:bg-[#1E7740] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Complete Ride & Collect ₹{activeRide.totalFare}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Idle State (Checking for nearby rides with live map) */}
      {isOnline && !currentRide && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <InteractiveMap
            mode="driver"
            driverGpsState={gpsState}
            onCenterGps={refreshCurrentLocation}
            heightClass="h-[200px] sm:h-[220px]"
          />

          <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-xs flex flex-col items-center justify-center space-y-3 text-center">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 rounded-full border-2 border-[#FDE8DC] border-t-[#FF6B2C] animate-spin" />
            </div>

            <div className="text-sm font-bold text-[#111111] tracking-tight">
              Checking for nearby rides
            </div>
            <p className="text-xs text-gray-500 max-w-xs">
              Broadcasting your live Toto beacon to passengers in your sector. When a ride is requested, you'll get an alert banner right here!
            </p>
          </div>
        </div>
      )}

      {/* View 3: Offline State */}
      {!isOnline && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 font-bold text-lg">
            OFF
          </div>
          <h3 className="font-bold text-base text-[#111111]">You are currently offline</h3>
          <p className="text-xs text-gray-500 max-w-xs">
            Toggle your duty switch above to start receiving ride requests in your vicinity.
          </p>
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleToggleAvailability(true)}
            className="mt-2 px-6 py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] text-white font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUpdatingStatus ? 'Syncing Status...' : 'Go Online Now'}
          </button>
        </div>
      )}
        </>
      )}

      {/* UPI QR Payment Modal */}
      {showUpiQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-[#111111]">Scan & Pay ₹{activeRide?.totalFare || 89}</h3>
              <button onClick={() => setShowUpiQrModal(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-neutral-200 flex flex-col items-center">
              {(() => {
                const driverVpa = driver?.upiId || (driver?.phone ? `${driver.phone.replace(/\D/g, '')}@upi` : '9874522019@upi');
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${driverVpa}&pn=${driver?.name || 'Toto Captain'}&am=${activeRide?.totalFare || 89}&cu=INR`)}`;
                return (
                  <>
                    <img
                      src={qrUrl}
                      alt="UPI Payment QR Code"
                      className="w-40 h-40 rounded-xl bg-white p-1 border border-neutral-100 shadow-2xs"
                    />
                    <div className="mt-2 text-center">
                      <div className="text-[11px] font-mono font-bold text-[#111111] bg-white px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {driverVpa}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium block mt-1">
                        Accepts GPay, PhonePe, Paytm, BHIM
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={() => setShowUpiQrModal(false)}
              className="w-full py-2.5 bg-[#181818] text-white font-bold text-xs rounded-2xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Celebratory Trip Completion & Transaction Confirmation Modal */}
      <TripCelebrationModal
        isOpen={showCelebrationModal}
        onClose={() => setShowCelebrationModal(false)}
        tripData={celebratedTripData}
        onReadyForNextRide={() => {
          setShowCelebrationModal(false);
          setCelebratedTripData(null);
        }}
      />

      {/* Driver Chat Modal with Passenger */}
      {activeRide && (
        <ChatModal
          isOpen={isDriverChatOpen}
          onClose={() => setIsDriverChatOpen(false)}
          rideId={activeRide.id}
          senderRole="driver"
          currentUserId={driver?.id || 'drv_captain'}
          currentUserName={driver?.name || 'Captain'}
          partnerName={activeRide.userName || 'Passenger'}
          partnerPhone={activeRide.userPhone}
        />
      )}
    </div>
  );
};
