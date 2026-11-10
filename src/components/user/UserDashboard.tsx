import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { POPULAR_LOCATIONS, VEHICLE_OPTIONS } from '../../data/appData';
import { GeoPoint, TotoPartnerOffer, ActiveRide, CouponItem } from '../../types';
import { InteractiveMap } from '../map/InteractiveMap';
import { useMobileGps } from '../../hooks/useMobileGps';
import { searchPlacesOnline, calculateDistanceKm } from '../../utils/geoUtils';
import { 
  Search, 
  Check, 
  Phone, 
  Star, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Plus,
  Package,
  Bike,
  Car,
  Layers,
  X, 
  ShieldCheck, 
  Navigation,
  CreditCard,
  QrCode,
  Wallet,
  LocateFixed,
  Radio,
  Sparkles,
  Building2,
  Train,
  ShoppingBag,
  HeartPulse,
  Landmark,
  Compass,
  Loader2,
  RotateCw,
  BatteryCharging,
  Clock,
  ArrowRight,
  BellRing,
  Tag,
  Zap,
  MessageSquare,
  Share2,
  AlertTriangle,
  FileText,
  Bookmark,
  History,
  LifeBuoy,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShareTripModal } from '../modals/ShareTripModal';
import { RideReceiptModal } from '../modals/RideReceiptModal';
import { RatingModal } from '../modals/RatingModal';
import { WalletModal } from '../modals/WalletModal';
import { ScheduleRideModal } from '../modals/ScheduleRideModal';
import { SupportModal } from '../modals/SupportModal';
import { SavedPlacesModal } from '../modals/SavedPlacesModal';
import { SafetyCenterModal } from '../modals/SafetyCenterModal';
import { ChatModal } from '../modals/ChatModal';
import { SosModal } from '../modals/SosModal';
import { FareBreakdownModal } from '../modals/FareBreakdownModal';
import { CouponsModal } from '../modals/CouponsModal';
import { FullScreenLocationSearchModal } from './FullScreenLocationSearchModal';
import { RideHistoryPage } from './RideHistoryPage';
import { ProfileSettingsPage } from './ProfileSettingsPage';
import { WaitingCaptainToast } from './WaitingCaptainToast';
import { PersistentDriverCard } from './PersistentDriverCard';
import { useBackHandler } from '../../hooks/useBackHandler';

const TotoRickshawIcon = ({ className = "w-5 h-5", color = "#FF6B2C" }: { className?: string; color?: string }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-label="E-Rickshaw Toto Icon"
  >
    {/* Chassis & Body */}
    <path d="M10 28H38L42 34H6L10 28Z" fill={color} />
    {/* Canopy Roof */}
    <path d="M8 12C8 10.8954 8.89543 10 10 10H38C39.1046 10 40 10.8954 40 12V16H8V12Z" fill="#181818" />
    {/* Pillars */}
    <path d="M11 16V28M24 16V28M37 16V28" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
    {/* Front Windshield Angle */}
    <path d="M37 16L41 28" stroke="#181818" strokeWidth="2" strokeLinecap="round" />
    {/* Driver Seat & Handle */}
    <path d="M30 24H35" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
    {/* Rear Wheels */}
    <circle cx="14" cy="36" r="5" fill="#181818" />
    <circle cx="14" cy="36" r="2.2" fill="#FFFFFF" />
    <circle cx="34" cy="36" r="5" fill="#181818" />
    <circle cx="34" cy="36" r="2.2" fill="#FFFFFF" />
    {/* Front Single Steer Wheel */}
    <circle cx="42" cy="36" r="3.5" fill="#181818" />
    <circle cx="42" cy="36" r="1.5" fill="#FFFFFF" />
    {/* Electric Bolt Accent on Body */}
    <path d="M22 29L20 32H24L22 35" stroke="#FFE600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CitySkylineArt = () => (
  <div className="w-full pt-4 pb-1 flex justify-center opacity-30 select-none pointer-events-none overflow-hidden">
    <svg viewBox="0 0 400 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs sm:max-w-sm h-10 stroke-neutral-400">
      <line x1="0" y1="46" x2="400" y2="46" strokeWidth="1" strokeDasharray="4 3" />
      {/* Monument Gate */}
      <path d="M50 46V25H70V46M56 46V32H64V46M46 25H74" strokeWidth="1.2" strokeLinecap="round" />
      {/* Tree */}
      <circle cx="100" cy="30" r="7" strokeWidth="1" />
      <line x1="100" y1="37" x2="100" y2="46" strokeWidth="1.2" />
      {/* Car Outline */}
      <path d="M140 46H165C167 46 168 44 169 41L173 41C175 41 177 38 178 36L184 36C187 36 189 39 191 42L194 42C195 42 196 44 196 46" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="150" cy="46" r="2.5" strokeWidth="1.2" />
      <circle cx="186" cy="46" r="2.5" strokeWidth="1.2" />
      {/* City Bridge Arches */}
      <path d="M220 46C225 35 240 35 245 46C250 35 265 35 270 46" strokeWidth="1.2" />
      {/* Toto Silhouette */}
      <path d="M305 46H328L331 38H310L305 46Z" strokeWidth="1.2" />
      <path d="M308 38V30H327V38" strokeWidth="1.2" />
      <circle cx="310" cy="46" r="2.5" strokeWidth="1.2" />
      <circle cx="325" cy="46" r="2.5" strokeWidth="1.2" />
    </svg>
  </div>
);

export const UserDashboard: React.FC = () => {
  const { 
    user, 
    activeRide, 
    simulatedDrivers, 
    userGpsPoint,
    driverGpsPoint,
    updateUserGpsPoint,
    availableTotoOffers,
    isScanningOffers,
    findNearbyTotoOffers,
    selectTotoOfferAndBook,
    cancelOfferSearch,
    createRideBooking, 
    cancelRide, 
    expireRideBooking,
    dispatchRideRequest,
    rateRide,
    rateRideWithTags,
    settleRidePayment,
    walletBalance,
    addMoneyToWallet,
    savedPlaces,
    addSavedPlace,
    deleteSavedPlace,
    emergencyContacts,
    addEmergencyContact,
    deleteEmergencyContact,
    supportTickets,
    createSupportTicket,
    scheduledRides,
    createScheduledRide,
    completedTrips,
    triggerSound,
    logoutUser,
    activeNavTab,
    setActiveNavTab
  } = useRide();

  const [pickup, setPickup] = useState<GeoPoint>(POPULAR_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState<'pickup' | 'dropoff' | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [selectedPlaceCategory, setSelectedPlaceCategory] = useState<string>('all');
  const [onlineSearchResults, setOnlineSearchResults] = useState<GeoPoint[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'wallet'>('cash');
  const [gpsAutoSynced, setGpsAutoSynced] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [captainAcceptedToast, setCaptainAcceptedToast] = useState(false);

  const hasActiveRide = Boolean(
    activeRide && 
    activeRide.status !== 'completed' && 
    activeRide.status !== 'cancelled' && 
    activeRide.status !== 'idle'
  );

  const isDriverMatched = Boolean(
    activeRide &&
    (activeRide.driverName || activeRide.driverId) &&
    activeRide.status !== 'completed' &&
    (activeRide.status as any) !== 'RIDE_COMPLETED' &&
    activeRide.status !== 'cancelled' &&
    (activeRide.status as any) !== 'CUSTOMER_CANCELLED' &&
    (activeRide.status as any) !== 'DRIVER_CANCELLED' &&
    activeRide.status !== 'idle' &&
    activeRide.status !== 'searching' &&
    (activeRide.status as any) !== 'SEARCHING_DRIVER' &&
    activeRide.status !== 'no_driver_accepted' &&
    (activeRide.status as any) !== 'NO_DRIVER_ACCEPTED' &&
    (activeRide.status as any) !== 'expired'
  );

  // Monitor when activeRide status transitions from 'searching' to 'driver_assigned' to celebrate acceptance
  const prevRideStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeRide?.status === 'driver_assigned' && prevRideStatusRef.current === 'searching') {
      setCaptainAcceptedToast(true);
      triggerSound('success');
      const timer = setTimeout(() => {
        setCaptainAcceptedToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    prevRideStatusRef.current = activeRide?.status || null;
  }, [activeRide?.status, triggerSound]);

  // Server-Authoritative Ride Expiration Countdown (45s window)
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(null);
  useEffect(() => {
    const isWaiting = activeRide && (activeRide.status === 'searching' || (activeRide.status as any) === 'SEARCHING_DRIVER');
    if (!isWaiting) {
      setWaitingCountdown(null);
      return;
    }

    const computeSec = () => {
      if (activeRide.expiresAt) {
        const diffMs = new Date(activeRide.expiresAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diffMs / 1000));
      }
      const created = activeRide.createdAt ? new Date(activeRide.createdAt).getTime() : Date.now();
      const diffMs = (created + 45000) - Date.now();
      return Math.max(0, Math.ceil(diffMs / 1000));
    };

    const initialSec = computeSec();
    setWaitingCountdown(initialSec);

    if (initialSec <= 0) {
      expireRideBooking(activeRide.id);
      return;
    }

    const timer = setInterval(() => {
      const remaining = computeSec();
      setWaitingCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        expireRideBooking(activeRide.id);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRide?.id, activeRide?.status, activeRide?.expiresAt, activeRide?.createdAt, expireRideBooking]);

  const formattedCountdown = waitingCountdown !== null
    ? `00:${waitingCountdown < 10 ? '0' : ''}${waitingCountdown}`
    : '00:45';
  const [notificationToast, setNotificationToast] = useState<{
    driverName: string;
    vehicleNumber: string;
    price: number;
    offerTag: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modals Visibility States
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isFullScreenSearchOpen, setIsFullScreenSearchOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareTripOpen, setIsShareTripOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isFareBreakdownOpen, setIsFareBreakdownOpen] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [receiptRideData, setReceiptRideData] = useState<ActiveRide | null>(null);
  const [supportRideId, setSupportRideId] = useState<string | undefined>(undefined);
  const [isBookingCardCollapsed, setIsBookingCardCollapsed] = useState(false);

  // Mobile Android/iOS System Back Navigation Handlers
  useBackHandler('user:modal:search', isFullScreenSearchOpen, () => setIsFullScreenSearchOpen(false), 25);
  useBackHandler('user:modal:wallet', isWalletOpen, () => setIsWalletOpen(false), 25);
  useBackHandler('user:modal:coupons', isCouponsOpen, () => setIsCouponsOpen(false), 25);
  useBackHandler('user:modal:safety', isSafetyOpen, () => setIsSafetyOpen(false), 25);
  useBackHandler('user:modal:schedule', isScheduleOpen, () => setIsScheduleOpen(false), 25);
  useBackHandler('user:modal:savedPlaces', isSavedPlacesOpen, () => setIsSavedPlacesOpen(false), 25);
  useBackHandler('user:modal:support', isSupportOpen, () => setIsSupportOpen(false), 25);
  useBackHandler('user:modal:sos', isSosOpen, () => setIsSosOpen(false), 30);
  useBackHandler('user:modal:chat', isChatOpen, () => setIsChatOpen(false), 25);
  useBackHandler('user:modal:share', isShareTripOpen, () => setIsShareTripOpen(false), 25);
  useBackHandler('user:modal:receipt', isReceiptOpen, () => setIsReceiptOpen(false), 25);
  useBackHandler('user:modal:rating', isRatingOpen, () => setIsRatingOpen(false), 25);
  useBackHandler('user:modal:fare', isFareBreakdownOpen, () => setIsFareBreakdownOpen(false), 25);
  
  // Back from Ride Select view to Destination Search/Explore view
  useBackHandler(
    'user:ride:select',
    Boolean(dropoff && (!activeRide || activeRide.status === 'cancelled' || activeRide.status === 'idle')),
    () => setDropoff(null),
    15
  );

  // Tabs back handlers (return to 'home' tab)
  useBackHandler('user:tab:rides', activeNavTab === 'rides', () => setActiveNavTab('home'), 10);
  useBackHandler('user:tab:profile', activeNavTab === 'profile', () => setActiveNavTab('home'), 10);
  
  // Real-Time Mobile GPS Tracking Hook
  const {
    gpsState,
    hasRealGpsFix,
    isLocating,
    refreshCurrentLocation,
  } = useMobileGps({
    autoStart: true,
    enableHighAccuracy: true,
    onLocationUpdate: (point) => {
      updateUserGpsPoint(point);
    },
    fallbackPoint: POPULAR_LOCATIONS[0]
  });

  // Live real-time Estimated Time of Arrival (ETA) calculation
  const liveEtaData = useMemo(() => {
    if (!activeRide) return null;

    const status = activeRide.status;
    const driverLoc = activeRide.driverLocation || (activeRide.pickup ? {
      lat: activeRide.pickup.lat + 0.0035,
      lng: activeRide.pickup.lng + 0.0028,
    } : null);

    if (status === 'driver_assigned' || status === 'driver_arriving') {
      let distKm = 0.8;
      if (driverLoc && activeRide.pickup) {
        distKm = calculateDistanceKm(driverLoc, activeRide.pickup);
      }
      const mins = Math.max(1, Math.round(distKm * 3.2));
      const arrivalDate = new Date(Date.now() + mins * 60000);
      const arrivalClock = arrivalDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      return {
        stage: 'pickup',
        badge: 'Captain Arriving',
        etaText: mins <= 1 ? 'Arriving in ~1 min' : `Arriving in ~${mins} mins`,
        etaClock: arrivalClock,
        distanceText: `${distKm.toFixed(1)} km away`,
        fullLabel: `Estimated Time of Arrival: ${arrivalClock} (~${mins} min${mins > 1 ? 's' : ''})`,
      };
    }

    if (status === 'driver_arrived') {
      return {
        stage: 'arrived',
        badge: 'Captain at Pickup',
        etaText: 'Arrived at pickup location',
        etaClock: 'Now',
        distanceText: 'Waiting at spot',
        fullLabel: 'Estimated Time of Arrival: Arrived Now',
      };
    }

    if (status === 'in_progress') {
      let distKm = activeRide.distanceKm || 2.4;
      if (driverLoc && activeRide.dropoff) {
        distKm = calculateDistanceKm(driverLoc, activeRide.dropoff);
      }
      const mins = Math.max(1, Math.round(distKm * 3.2));
      const arrivalDate = new Date(Date.now() + mins * 60000);
      const arrivalClock = arrivalDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      return {
        stage: 'in_progress',
        badge: 'Trip in Progress',
        etaText: mins <= 1 ? 'Reaching destination in < 1 min' : `Reaching in ~${mins} mins`,
        etaClock: arrivalClock,
        distanceText: `${distKm.toFixed(1)} km to dropoff`,
        fullLabel: `Estimated Time of Arrival: ${arrivalClock} (~${mins} min${mins > 1 ? 's' : ''})`,
      };
    }

    return null;
  }, [
    activeRide?.status,
    activeRide?.driverLocation?.lat,
    activeRide?.driverLocation?.lng,
    activeRide?.pickup,
    activeRide?.dropoff,
    activeRide?.distanceKm
  ]);

  useEffect(() => {
    const handleOpenProfile = () => setActiveNavTab('profile');
    const handleOpenHistory = () => setActiveNavTab('rides');
    const handleCloseAll = () => setActiveNavTab('home');

    window.addEventListener('openProfileSettings', handleOpenProfile);
    window.addEventListener('openRideHistory', handleOpenHistory);
    window.addEventListener('closeAllModals', handleCloseAll);
    return () => {
      window.removeEventListener('openProfileSettings', handleOpenProfile);
      window.removeEventListener('openRideHistory', handleOpenHistory);
      window.removeEventListener('closeAllModals', handleCloseAll);
    };
  }, [setActiveNavTab]);

  // When location picker opens, autofocus input and reset query if desired
  useEffect(() => {
    if (showLocationPicker) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setCustomSearchQuery('');
      setOnlineSearchResults([]);
      setSelectedPlaceCategory('all');
      setIsSearchInputFocused(false);
    }
  }, [showLocationPicker]);

  // Debounced online place search
  useEffect(() => {
    const query = customSearchQuery.trim();
    if (query.length < 2) {
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlacesOnline(query, gpsState.lat, gpsState.lng);
        setOnlineSearchResults(results);
      } catch (e) {
        console.debug('Search error:', e);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customSearchQuery, gpsState.lat, gpsState.lng]);

  // Filtered places combining local catalog + online search results
  const suggestedPlaces = useMemo(() => {
    const query = customSearchQuery.trim().toLowerCase();

    // 1. Filter local popular catalog
    let localMatches = POPULAR_LOCATIONS.filter((loc) => {
      // Category filter
      if (selectedPlaceCategory !== 'all') {
        const zone = (loc.zone || '').toLowerCase();
        if (selectedPlaceCategory === 'metro' && !zone.includes('metro') && !loc.name.toLowerCase().includes('metro')) return false;
        if (selectedPlaceCategory === 'it' && !zone.includes('it') && !zone.includes('office') && !loc.name.toLowerCase().includes('park')) return false;
        if (selectedPlaceCategory === 'mall' && !zone.includes('shopping') && !loc.name.toLowerCase().includes('mall') && !loc.name.toLowerCase().includes('centre')) return false;
        if (selectedPlaceCategory === 'hospital' && !zone.includes('health') && !loc.name.toLowerCase().includes('hospital')) return false;
        if (selectedPlaceCategory === 'railway' && !zone.includes('railway') && !loc.name.toLowerCase().includes('station')) return false;
      }

      if (!query) return true;

      const nameMatch = loc.name.toLowerCase().includes(query);
      const addressMatch = loc.address.toLowerCase().includes(query);
      const landmarkMatch = (loc.landmark || '').toLowerCase().includes(query);
      const zoneMatch = (loc.zone || '').toLowerCase().includes(query);

      return nameMatch || addressMatch || landmarkMatch || zoneMatch;
    });

    // 2. Append online results if query active, avoiding duplicate names
    const existingNames = new Set(localMatches.map((l) => l.name.toLowerCase()));
    const additionalOnline = onlineSearchResults.filter(
      (onlineLoc) => !existingNames.has(onlineLoc.name.toLowerCase())
    );

    return [...localMatches, ...additionalOnline];
  }, [customSearchQuery, selectedPlaceCategory, onlineSearchResults]);

  // When first real GPS fix arrives, automatically offer to sync pickup
  useEffect(() => {
    if (hasRealGpsFix && !gpsAutoSynced && gpsState.lat && gpsState.lng) {
      const livePoint: GeoPoint = {
        lat: gpsState.lat,
        lng: gpsState.lng,
        name: gpsState.name || 'My Current GPS Location',
        address: gpsState.address || `Lat: ${gpsState.lat.toFixed(4)}, Lng: ${gpsState.lng.toFixed(4)}`,
        zone: 'Live GPS'
      };
      setPickup(livePoint);
      setGpsAutoSynced(true);
    }
  }, [hasRealGpsFix, gpsAutoSynced, gpsState.lat, gpsState.lng, gpsState.name, gpsState.address]);

  // Helper icon for place category
  const getPlaceIcon = (loc: GeoPoint) => {
    const text = `${loc.name} ${loc.zone || ''} ${loc.address}`.toLowerCase();
    if (text.includes('metro') || text.includes('subway') || text.includes('transit')) {
      return <Train className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (text.includes('park') || text.includes('tech') || text.includes('office') || text.includes('dlf') || text.includes('tower')) {
      return <Building2 className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (text.includes('mall') || text.includes('centre') || text.includes('market') || text.includes('shopping')) {
      return <ShoppingBag className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (text.includes('hospital') || text.includes('health') || text.includes('apollo') || text.includes('clinic')) {
      return <HeartPulse className="w-4 h-4 text-rose-600 shrink-0" />;
    }
    if (text.includes('station') || text.includes('railway') || text.includes('howrah') || text.includes('sealdah')) {
      return <Landmark className="w-4 h-4 text-amber-700 shrink-0" />;
    }
    return <MapPin className="w-4 h-4 text-[#FF7A1A] shrink-0" />;
  };

  // Helper to compute distance from user GPS
  const getDistanceLabel = (loc: GeoPoint) => {
    if (!gpsState.lat || !gpsState.lng || !loc.lat || !loc.lng) return null;
    const distKm = calculateDistanceKm(
      { lat: gpsState.lat, lng: gpsState.lng },
      { lat: loc.lat, lng: loc.lng }
    );
    if (distKm < 1) {
      return `${Math.round(distKm * 1000)} m`;
    }
    return `${distKm.toFixed(1)} km`;
  };

  // Rating states
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('Great eco-friendly toto ride!');

  // Handle Book Toto - Broadcasts ride request to nearby captains
  const handleBookToto = async () => {
    if (!pickup) return;

    // Use current dropoff or default popular destination if not yet chosen
    const targetDropoff = dropoff || POPULAR_LOCATIONS[1];
    if (!dropoff) {
      setDropoff(targetDropoff);
    }

    setIsBroadcasting(true);
    triggerSound('alert');

    try {
      const vehicleType: 'toto' | 'toto_express' | 'bike' | 'auto' = 
        selectedTier.id === 'bike' ? 'toto' :
        selectedTier.id === 'personal_toto' ? 'toto_express' :
        selectedTier.id === 'cab_non_ac' ? 'auto' : 'toto';

      const newRide = await createRideBooking(
        pickup,
        targetDropoff,
        vehicleType,
        paymentMethod,
        appliedCoupon?.code
      );

      // Automatically broadcast request to nearby captains in Firestore
      if (dispatchRideRequest) {
        await dispatchRideRequest({
          rideId: newRide.id,
          driverId: 'all',
          passengerName: user?.name || 'Passenger',
          pickupName: pickup.name,
          dropoffName: targetDropoff.name,
          fare: newRide.totalFare,
          distanceKm: estimatedDistanceKm,
          status: 'searching'
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error broadcasting Toto booking:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Handle passenger selecting a specific Toto Partner and price
  const handleSelectPartnerOffer = (offer: TotoPartnerOffer) => {
    if (!pickup || !dropoff) return;
    triggerSound('alert');
    selectTotoOfferAndBook(offer, pickup, dropoff, paymentMethod);
    setNotificationToast({
      driverName: offer.driverName,
      vehicleNumber: offer.vehicleNumber,
      price: offer.price,
      offerTag: offer.offerTag
    });
    // Auto-dismiss notification after 7s
    setTimeout(() => {
      setNotificationToast(null);
    }, 7000);
  };

  // Instant apply current live GPS to pickup
  const handleApplyCurrentGpsToPickup = () => {
    refreshCurrentLocation();
    triggerSound('success');
    const livePoint: GeoPoint = {
      lat: gpsState.lat,
      lng: gpsState.lng,
      name: gpsState.name || 'My Current GPS Location',
      address: gpsState.address || `Coordinates: ${gpsState.lat.toFixed(4)}, ${gpsState.lng.toFixed(4)}`,
      zone: 'Real-time Mobile GPS'
    };
    if (showLocationPicker === 'dropoff') {
      setDropoff(livePoint);
    } else {
      setPickup(livePoint);
    }
    setShowLocationPicker(null);
  };

  // Submit custom entered location
  const handleSelectCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchQuery.trim()) return;
    const newPoint: GeoPoint = {
      lat: (showLocationPicker === 'pickup' ? pickup?.lat : dropoff?.lat) || 22.5804,
      lng: (showLocationPicker === 'pickup' ? pickup?.lng : dropoff?.lng) || 88.4378,
      name: customSearchQuery.trim(),
      address: `${customSearchQuery.trim()}, City Area`,
      zone: 'Custom Address'
    };
    if (showLocationPicker === 'pickup') {
      setPickup(newPoint);
    } else {
      setDropoff(newPoint);
    }
    setCustomSearchQuery('');
    setShowLocationPicker(null);
    triggerSound('beep');
  };

  // Submit review
  const handleRateSubmit = () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    rateRide(ratingScore, ratingComment);
  };

  // Vehicle Tiers matching user specified categories
  const VEHICLE_TIERS = useMemo(() => [
    {
      id: 'bike',
      name: 'E-Rickshaw',
      badge: 'FASTEST',
      badgeColor: 'bg-[#D8F3DC] text-[#1B4332]',
      description: 'Quick shared & point-to-point ride',
      capacity: '1-4',
      etaMins: 2,
      baseFare: 25,
      perKmRate: 11,
      type: 'e_rickshaw' as const,
    },
    {
      id: 'personal_toto',
      name: 'Toto Premium',
      badge: 'POPULAR',
      badgeColor: 'bg-[#FFF4ED] text-[#C8622A]',
      description: 'Comfortable private electric ride',
      capacity: '1-4',
      etaMins: 3,
      baseFare: 40,
      perKmRate: 14,
      originalMultiplier: 1.15,
      type: 'toto_premium' as const,
    },
    {
      id: 'cab_non_ac',
      name: 'Toto Deluxe',
      badge: 'EXTRA COMFORT',
      badgeColor: 'bg-[#F0F4F8] text-[#243B53]',
      description: 'Spacious cushioned seating & smooth ride',
      capacity: '1-4',
      etaMins: 4,
      baseFare: 55,
      perKmRate: 16,
      type: 'toto_deluxe' as const,
    },
    {
      id: 'cab_ac_priority',
      name: 'Full Reserve Toto',
      badge: 'RESERVED',
      isPriority: true,
      badgeColor: 'bg-[#FEF3C7] text-[#92400E]',
      description: 'Private dedicated Toto for you & family',
      capacity: '4-6',
      etaMins: 2,
      baseFare: 75,
      perKmRate: 20,
      type: 'full_reserve_toto' as const,
    },
  ], []);

  const [selectedTierId, setSelectedTierId] = useState<string>('bike');

  const selectedTier = useMemo(() => {
    return VEHICLE_TIERS.find((t) => t.id === selectedTierId) || VEHICLE_TIERS[0];
  }, [VEHICLE_TIERS, selectedTierId]);

  // Calculate estimated distance & fare
  const estimatedDistanceKm = useMemo(() => {
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) return 2.2;
    const d = calculateDistanceKm(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng }
    );
    return Math.max(0.8, Number(d.toFixed(1)));
  }, [pickup, dropoff]);

  const baseFare = selectedTier.baseFare;
  const distanceCharge = Math.round(estimatedDistanceKm * selectedTier.perKmRate);
  const timeCharge = 0;
  const rawFare = baseFare + distanceCharge;

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const disc = Math.round((rawFare * appliedCoupon.discountPct) / 100);
    return Math.min(disc, appliedCoupon.maxDiscount);
  }, [appliedCoupon, rawFare]);

  const currentFare = activeRide?.totalFare || Math.max(15, rawFare - couponDiscount);

  return (
    <div 
      id="user-dashboard-root-container"
      className={`mx-auto flex-1 flex flex-col pointer-events-auto w-full transition-all relative ${
        activeNavTab === 'rides'
          ? 'max-w-3xl py-1 sm:py-3 px-1.5 sm:px-4'
          : activeNavTab === 'profile'
          ? 'max-w-2xl py-1 sm:py-3 px-1.5 sm:px-4'
          : 'w-full m-0 p-0'
      }`}
    >
      {/* Non-blocking Waiting for Captain Toast with 15s Countdown and Server Response Updates */}
      <WaitingCaptainToast
        activeRide={activeRide}
        currentFare={currentFare}
        onCancelRequest={() => {
          cancelRide('Cancelled while waiting for captain');
          triggerSound('beep');
        }}
        onRetryRequest={() => {
          if (activeRide) {
            createRideBooking(activeRide.pickup, activeRide.dropoff, activeRide.vehicleType, activeRide.paymentMethod);
            triggerSound('alert');
          }
        }}
        onDismiss={() => {
          setCaptainAcceptedToast(false);
        }}
      />
      {activeNavTab === 'rides' ? (
        <RideHistoryPage
          activeRide={activeRide}
          completedTrips={completedTrips}
          onBookAgain={(pName, dName) => {
            const matchedPickup = POPULAR_LOCATIONS.find((l) => l.name === pName) || {
              name: pName,
              address: pName,
              lat: 22.5804,
              lng: 88.4378
            };
            const matchedDropoff = POPULAR_LOCATIONS.find((l) => l.name === dName) || {
              name: dName,
              address: dName,
              lat: 22.5867,
              lng: 88.4178
            };
            setPickup(matchedPickup);
            setDropoff(matchedDropoff);
            setActiveNavTab('home');
            triggerSound('beep');
          }}
          onOpenReceipt={(trip) => {
            const rideItem: ActiveRide = {
              id: trip.rideId || trip.id,
              userId: user?.id || 'usr_passenger',
              userName: user?.name || trip.passengerName || 'Passenger',
              userPhone: user?.phone || '+91 98311 02458',
              userRating: 4.9,
              pickup: { name: trip.pickupName, lat: 22.5804, lng: 88.4378, address: trip.pickupName },
              dropoff: { name: trip.dropoffName, lat: 22.5867, lng: 88.4178, address: trip.dropoffName },
              vehicleType: 'toto',
              totalFare: trip.fare,
              basePrice: 20,
              discount: 0,
              driverEarnings: Math.round(trip.fare * 0.85),
              distanceKm: trip.distanceKm,
              estimatedMins: Math.round(trip.distanceKm * 4),
              paymentMethod: trip.paymentMethod || 'cash',
              paymentStatus: 'paid',
              status: 'completed',
              otp: '8492',
              driverName: 'Subhashish Mondal',
              vehicleNumber: 'WB-06-ER-4821',
              driverPhone: '+91 98745 22019',
              bookedAt: trip.completedAt || new Date().toISOString()
            };
            setReceiptRideData(rideItem);
            setIsReceiptOpen(true);
            triggerSound('click');
          }}
          onReportIssue={(tripId) => {
            setSupportRideId(tripId);
            setIsSupportOpen(true);
            triggerSound('click');
          }}
          onNavigateHome={() => setActiveNavTab('home')}
        />
      ) : activeNavTab === 'profile' ? (
        <ProfileSettingsPage
          user={user}
          walletBalance={walletBalance}
          completedRidesCount={completedTrips.length}
          onOpenWallet={() => setIsWalletOpen(true)}
          onOpenSchedule={() => setIsScheduleOpen(true)}
          onOpenSavedPlaces={() => setIsSavedPlacesOpen(true)}
          onOpenHistory={() => setActiveNavTab('rides')}
          onOpenSafety={() => setIsSafetyOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
          onOpenCoupons={() => setIsCouponsOpen(true)}
          onLogout={() => {
            logoutUser();
            triggerSound('beep');
          }}
          onNavigateHome={() => setActiveNavTab('home')}
        />
      ) : (
        <>
          {/* Real-time Interactive Leaflet Map with Mobile GPS Tracking - Edge to Edge on Left, Right, Top */}
          <InteractiveMap
            pickup={pickup}
            dropoff={dropoff}
            activeRide={activeRide}
            drivers={simulatedDrivers}
            mode="user"
            userGpsState={gpsState}
            driverGpsState={driverGpsPoint ? {
              lat: driverGpsPoint.lat,
              lng: driverGpsPoint.lng,
              accuracy: 10,
              speedKmH: 22,
              timestamp: Date.now(),
              isWatching: true
            } : null}
            onSelectLocation={(point, type) => {
              if (type === 'pickup') setPickup(point);
              else setDropoff(point);
              triggerSound('beep');
            }}
            onCenterGps={refreshCurrentLocation}
            edgeToEdgeTop={true}
            heightClass="h-[340px] xs:h-[360px] sm:h-[400px] md:h-[430px]"
          >
            {/* Map overlays when dropoff is selected */}
            {dropoff && (
              <>
                {/* Top-Left Back Button to return to destination search */}
                <button
                  type="button"
                  onClick={() => {
                    setDropoff(null);
                    triggerSound('beep');
                  }}
                  className="absolute top-[calc(64px+env(safe-area-inset-top,0px))] left-3 sm:top-[calc(72px+env(safe-area-inset-top,0px))] z-20 w-10 h-10 rounded-full bg-white text-gray-800 shadow-md border border-[#E5DFD4] flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  title="Clear destination and return to search"
                >
                  <ArrowLeft className="w-5 h-5 text-[#181818]" />
                </button>

                {/* Top Center-Right Dropoff Location Pill */}
                <div
                  onClick={() => {
                    triggerSound('beep');
                    setIsFullScreenSearchOpen(true);
                  }}
                  className="absolute top-[calc(64px+env(safe-area-inset-top,0px))] left-16 right-3 sm:right-auto sm:max-w-xs sm:top-[calc(72px+env(safe-area-inset-top,0px))] z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-[#E5DFD4] shadow-md flex items-center justify-between gap-2 cursor-pointer hover:bg-white transition-colors select-none"
                  title="Tap to change destination"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {dropoff.name || dropoff.address}
                    </span>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                </div>

                {/* Bottom Left Pickup Pill & Add Stop */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 max-w-[calc(100%-64px)]">
                  <div 
                    onClick={() => {
                      triggerSound('beep');
                      setIsFullScreenSearchOpen(true);
                    }}
                    className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E5DFD4] shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-white transition-colors min-w-0 select-none"
                    title="Tap to change pickup"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-[160px]">
                      {pickup?.name || pickup?.address || 'Pickup'}
                    </span>
                    <Pencil className="w-3 h-3 text-gray-400 shrink-0" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerSound('beep');
                      setIsFullScreenSearchOpen(true);
                    }}
                    className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#E5DFD4] shadow-md flex items-center gap-1 text-[11px] font-bold text-gray-700 hover:bg-white shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-gray-600" />
                    <span>Add stop</span>
                  </button>
                </div>
              </>
            )}
          </InteractiveMap>

          {/* Persistent Driver Info Card (Profile, Fare, ETA) directly beneath the Map Container */}
          {isDriverMatched && activeRide && (
            <PersistentDriverCard
              activeRide={activeRide}
              liveEtaData={liveEtaData}
              currentFare={currentFare}
              onCall={() => {
                window.location.href = `tel:${activeRide.driverPhone || '+919874522019'}`;
              }}
              onChat={() => {
                setIsChatOpen(true);
                triggerSound('beep');
              }}
              onShare={() => {
                setIsShareTripOpen(true);
                triggerSound('beep');
              }}
              onSos={() => {
                setIsSosOpen(true);
                triggerSound('alert');
              }}
              onSafety={() => {
                setIsSafetyOpen(true);
                triggerSound('beep');
              }}
              onCancel={() => {
                cancelRide('Passenger requested cancellation');
                triggerSound('beep');
              }}
            />
          )}

          {/* Lower Dashboard Controls & Cards Container */}
          <div 
            id="user-dashboard-content-container"
            className="w-full max-w-none px-0 sm:px-4 sm:max-w-xl md:max-w-2xl sm:mx-auto space-y-3.5 flex-1 flex flex-col mt-0 relative z-10"
          >
            {/* Route & Booking Card (Only shown when not in an active or completed ride) */}
            {(!activeRide || activeRide.status === 'cancelled' || activeRide.status === 'idle') && (
            <div 
              id="route-booking-card"
              className="w-full bg-white rounded-t-[32px] sm:rounded-3xl p-4 sm:p-5 pb-24 sm:pb-20 shadow-[0_-6px_25px_rgba(0,0,0,0.06)] border-t border-[#EDE8E0] sm:border space-y-4"
            >
              {/* Centered Drag Handle with smooth scroll support */}
              <div 
                onClick={() => {
                  document.getElementById('route-booking-card')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-12 h-1.5 rounded-full bg-[#D6D1C7] hover:bg-neutral-400 mx-auto shrink-0 mb-2 mt-0.5 cursor-pointer transition-colors"
                title="Scroll down to options"
              />

              {!dropoff ? (
                /* STEP 1: Destination Search & Explore Options (Matching after login .jpeg & design.jpeg) */
                <>
                  {/* Dynamic Animated Destination Search Bar */}
                  <div
                    id="dynamic-animated-search-bar"
                    onClick={() => {
                      triggerSound('beep');
                      setIsFullScreenSearchOpen(true);
                    }}
                    className="w-full bg-white rounded-full border border-[#E2E8F0] hover:border-amber-300 shadow-[0_4px_16px_rgba(0,0,0,0.06)] py-3 sm:py-3.5 px-4 sm:px-5 flex items-center justify-between gap-3 transition-all cursor-pointer group relative overflow-hidden select-none"
                    title="Tap to search drop-off location"
                  >
                    {/* Subtle animated warm golden/amber glow line along bottom */}
                    <div className="absolute -bottom-px left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#FFC000] to-transparent opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Search className="w-5 h-5 text-[#111111] shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="text-[15px] sm:text-base font-extrabold text-[#111111] tracking-tight truncate">
                        Where do you want to go?
                      </span>
                    </div>
                  </div>

                  {/* Explore Section */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#111111] tracking-tight">Explore</h3>
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setIsFullScreenSearchOpen(true);
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>View All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {/* Parcel on Toto */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setIsFullScreenSearchOpen(true);
                        }}
                        className="flex flex-col items-center text-center p-2 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF6E5] border border-[#FFE2A6] flex items-center justify-center text-[#B87214] shadow-xs group-hover:shadow-sm transition-all mb-1.5">
                          <Package className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">
                          Parcel on Toto
                        </span>
                      </button>

                      {/* Toto */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setSelectedTierId('personal_toto');
                          setIsFullScreenSearchOpen(true);
                        }}
                        className="flex flex-col items-center text-center p-2 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#E8F8EE] border border-[#C2EED4] flex items-center justify-center text-[#1E7E34] shadow-xs group-hover:shadow-sm transition-all mb-1.5">
                          <TotoRickshawIcon className="w-6 h-6" color="#16A34A" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">
                          Toto
                        </span>
                      </button>

                      {/* Toto Reserve */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setSelectedTierId('cab_ac_priority');
                          setIsFullScreenSearchOpen(true);
                        }}
                        className="flex flex-col items-center text-center p-2 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#F0F4F8] border border-[#D9E2EC] flex items-center justify-center text-[#243B53] shadow-xs group-hover:shadow-sm transition-all mb-1.5">
                          <TotoRickshawIcon className="w-6 h-6" color="#1E293B" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">
                          Toto Reserve
                        </span>
                      </button>

                      {/* Bulk Bookings */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setIsScheduleOpen(true);
                        }}
                        className="flex flex-col items-center text-center p-2 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#F4EFFE] border border-[#E0D1FC] flex items-center justify-center text-[#6B46C1] shadow-xs group-hover:shadow-sm transition-all mb-1.5">
                          <Layers className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">
                          Bulk Bookings
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Banner Section */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#111111] tracking-tight">Banner</h3>
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setIsFullScreenSearchOpen(true);
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>View All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Toto Reserve Card */}
                      <div
                        onClick={() => {
                          triggerSound('beep');
                          setSelectedTierId('personal_toto');
                          setIsFullScreenSearchOpen(true);
                        }}
                        className="bg-[#E8F1FD] border border-[#D2E3FC] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between min-h-[95px] cursor-pointer hover:shadow-xs transition-all select-none group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="text-xs sm:text-sm font-black text-[#1E293B] group-hover:text-blue-700 transition-colors">
                              Toto Reserve
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium">
                              Hourly private rides
                            </div>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
                            <TotoRickshawIcon className="w-4 h-4" color="#2563EB" />
                          </div>
                        </div>
                        <div className="pt-2">
                          <span className="inline-block text-[9.5px] font-extrabold text-blue-700 bg-white/90 px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                            Flexi Rides
                          </span>
                        </div>
                      </div>

                      {/* Bulk Bookings Card */}
                      <div
                        onClick={() => {
                          triggerSound('beep');
                          setIsScheduleOpen(true);
                        }}
                        className="bg-[#2D3748] text-white border border-[#4A5568] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between min-h-[95px] cursor-pointer hover:shadow-xs transition-all select-none group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                              Bulk Bookings
                            </div>
                            <div className="text-[10px] text-gray-300 font-medium">
                              Events & tours
                            </div>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-neutral-700/80 flex items-center justify-center shrink-0 shadow-2xs">
                            <TotoRickshawIcon className="w-4 h-4" color="#10B981" />
                          </div>
                        </div>
                        <div className="pt-2">
                          <span className="inline-block text-[9.5px] font-extrabold text-white bg-neutral-700 px-2 py-0.5 rounded-full border border-neutral-600 shadow-2xs">
                            Fleet Discounts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skyline watermark illustration at bottom of sheet */}
                  <CitySkylineArt />
                </>
              ) : (
                /* STEP 2: Ride Selection Options (Matching after select drop location.jpeg) */
                <>
                  {/* Top Header with Ride Selector Title */}
                  <div className="flex items-center justify-between pb-1 border-b border-[#F4EFE6]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF6B2C]" />
                      <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">
                        Available Rides
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDropoff(null);
                        triggerSound('beep');
                      }}
                      className="text-xs text-gray-500 hover:text-black font-semibold flex items-center gap-1 py-1 px-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                      title="Change destination"
                    >
                      <span>Change</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Vehicle / Ride Tier Selection Buttons (Matching after select drop location.jpeg) */}
                  <div 
                    id="vehicle-tier-selection-list" 
                    className="space-y-2.5 pt-0.5 w-full max-h-[240px] xs:max-h-[270px] sm:max-h-[320px] md:max-h-none overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch] touch-pan-y [scrollbar-width:thin] [scrollbar-color:#D6D1C7_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D6D1C7] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#B8B2A6]"
                  >
                    {VEHICLE_TIERS.map((tier) => {
                      const isSelected = selectedTierId === tier.id;
                      const tierFare = Math.max(15, tier.baseFare + Math.round(estimatedDistanceKm * tier.perKmRate) - couponDiscount);
                      const originalFare = Math.round(tierFare * (tier.originalMultiplier || 1.14));
                      const tripDurationMins = Math.max(3, Math.round(estimatedDistanceKm * 3));
                      const dropTime = new Date(Date.now() + (tier.etaMins + tripDurationMins) * 60000)
                        .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();

                      return (
                        <div
                          key={tier.id}
                          id={`vehicle-tier-${tier.id}`}
                          onClick={() => {
                            setSelectedTierId(tier.id);
                            triggerSound('beep');
                          }}
                          className={`w-full p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                            isSelected
                              ? 'border-2 border-[#111111] bg-white shadow-xs'
                              : 'border border-[#E5E5E5] bg-white hover:border-neutral-300 hover:bg-[#FAFAFA]'
                          }`}
                        >
                          {/* Left: Vehicle Icon */}
                          <div className="shrink-0 flex items-center justify-center w-10 sm:w-11">
                            {tier.id === 'bike' ? (
                              <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] border border-[#C2EED4] flex items-center justify-center shadow-2xs">
                                <TotoRickshawIcon className="w-6 h-6" color="#16A34A" />
                              </div>
                            ) : tier.id === 'personal_toto' ? (
                              <div className="w-10 h-10 rounded-2xl bg-[#FFF4ED] border border-[#FFD8C2] flex items-center justify-center shadow-2xs">
                                <TotoRickshawIcon className="w-6 h-6" color="#FF6B2C" />
                              </div>
                            ) : tier.id === 'cab_non_ac' ? (
                              <div className="w-10 h-10 rounded-2xl bg-[#F0F4F8] border border-[#D9E2EC] flex items-center justify-center shadow-2xs">
                                <TotoRickshawIcon className="w-6 h-6" color="#243B53" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center shadow-2xs relative">
                                <TotoRickshawIcon className="w-6 h-6" color="#92400E" />
                                <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-2xs">★</span>
                              </div>
                            )}
                          </div>

                          {/* Middle: Name, Badge, Description, ETA & Drop Time */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-sm sm:text-[15px] font-bold tracking-tight ${
                                isSelected ? 'text-[#111111]' : 'text-[#1F1F1F]'
                              }`}>
                                {tier.name}
                              </span>
                              {tier.badge && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider ${tier.badgeColor || 'bg-[#D8F3DC] text-[#1B4332]'}`}>
                                  {tier.badge}
                                </span>
                              )}
                              {tier.isPriority && (
                                <span className="text-[11px] text-amber-500 font-bold">✓</span>
                              )}
                            </div>
                            <div className="text-[11px] sm:text-xs text-neutral-500 font-normal truncate">
                              {tier.description}
                            </div>
                            <div className="text-[10.5px] sm:text-[11px] text-neutral-600 font-medium pt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{tier.etaMins} mins away</span>
                              <span>•</span>
                              <span>Drop {dropTime}</span>
                              {tier.capacity && (
                                <>
                                  <span>•</span>
                                  <span>👤 {tier.capacity}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Fare */}
                          <div className="text-right shrink-0">
                            {tier.originalMultiplier && (
                              <div className="text-[11px] text-gray-400 line-through">
                                ₹{originalFare}
                              </div>
                            )}
                            <div className="text-base sm:text-lg font-black text-[#111111]">
                              ₹{tierFare}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Section: Scanning Active Toto Partners */}
                  {isScanningOffers && (
                    <div className="pt-1 border-t border-neutral-100 animate-in fade-in duration-200 space-y-2.5">
                      <div className="bg-[#FAF8F5] border border-[#EBE5DB] rounded-2xl p-3 sm:p-3.5 text-center space-y-2">
                        <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-[#FF6B2C]/15 animate-ping" />
                          <div className="w-9 h-9 rounded-xl bg-[#FFF4ED] border border-[#FFD8C2] text-[#FF6B2C] flex items-center justify-center shadow-xs">
                            <TotoRickshawIcon className="w-5 h-5 animate-bounce" color="#FF6B2C" />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-[#111111] flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Scanning Active Nearby Captains...</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Fetching live driver price bids near pickup
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Section: Active Nearby Toto Partners & Real-Time Price Offers */}
                  {!isScanningOffers && availableTotoOffers.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-[#FFF4ED] border border-[#FFD8C2] flex items-center justify-center shrink-0 shadow-2xs">
                            <TotoRickshawIcon className="w-4 h-4" color="#FF6B2C" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-extrabold text-[#111111] tracking-tight truncate">
                              Nearby Captain Bids
                            </h3>
                            <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="truncate">{availableTotoOffers.length} Online Drivers • Live</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={cancelOfferSearch}
                          className="text-[11px] text-gray-500 hover:text-black font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
                        >
                          <span>Hide</span>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2 pr-0.5">
                        {availableTotoOffers.map((offer) => (
                          <div
                            key={offer.driverId}
                            className="bg-[#FAF8F5] hover:bg-white border border-[#E5DFD4] hover:border-[#FF6B2C] rounded-2xl p-2.5 sm:p-3 space-y-2 transition-all shadow-2xs group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={offer.driverPhoto}
                                    alt={offer.driverName}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-full object-cover border border-neutral-200 shadow-2xs"
                                  />
                                  <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-2xs border border-neutral-100">
                                    <TotoRickshawIcon className="w-3 h-3" color="#FF6B2C" />
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-[#111111] flex items-center gap-1">
                                    <span className="truncate">{offer.driverName}</span>
                                    <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                                      ✓
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono leading-tight truncate">
                                    {offer.vehicleNumber}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="inline-block text-[8.5px] font-bold px-1.5 py-0.5 bg-[#FFF4ED] text-[#C8622A] border border-[#FFD8C2] rounded-full mb-0.5">
                                  {offer.offerTag}
                                </span>
                                <div className="flex items-baseline justify-end gap-1">
                                  <span className="text-[11px] text-gray-400 line-through">
                                    ₹{offer.originalPrice}
                                  </span>
                                  <span className="text-base font-black text-[#111111]">
                                    ₹{offer.price}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectPartnerOffer(offer)}
                              className="w-full min-h-[38px] py-1.5 px-3 bg-[#181818] group-hover:bg-[#FF6B2C] active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <TotoRickshawIcon className="w-4 h-4 shrink-0" color="#FFFFFF" />
                              <span className="truncate">Select Partner • ₹{offer.price}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Method & Offers Quick Row (Matching after select drop location.jpeg) */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod((prev) => (prev === 'cash' ? 'upi' : prev === 'upi' ? 'wallet' : 'cash'));
                        triggerSound('beep');
                      }}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                      title="Change payment method"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-gray-700" />
                      <span className="capitalize">{paymentMethod}</span>
                      <ChevronRight className="w-3 h-3 text-gray-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCouponsOpen(true);
                        triggerSound('beep');
                      }}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                      title="View discount coupons"
                    >
                      <Tag className="w-3.5 h-3.5 text-[#FF6B2C]" />
                      <span>{appliedCoupon ? `${appliedCoupon.code} (-₹${couponDiscount})` : '% Offers'}</span>
                      <ChevronRight className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>

                  {/* Primary Bright Yellow Booking Button (Matching after select drop location.jpeg) */}
                  <button
                    id="find-ride-btn"
                    type="button"
                    onClick={handleBookToto}
                    disabled={isBroadcasting || Boolean(activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' && activeRide.status !== 'idle')}
                    className="w-full min-h-[50px] bg-[#FFC000] hover:bg-[#F5B400] active:scale-[0.99] text-black font-black text-base py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                    title={`Book ${selectedTier.name}`}
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-5 h-5 text-black animate-spin" />
                        <span>Connecting to Nearby Captains...</span>
                      </>
                    ) : (
                      <span>Book {selectedTier.name}</span>
                    )}
                  </button>
                </>
              )}
            </div>
            )}

      {/* Active Ride & Captain Details Section */}
      {activeRide && activeRide.status !== 'cancelled' && activeRide.status !== 'idle' && (
        <div 
          id="active-ride-card"
          className="w-full space-y-3 shadow-xs animate-in fade-in duration-300 px-2.5 sm:px-0"
        >
          {/* Status 1: Ride Requested / Searching for Nearby Captains */}
          {(activeRide.status === 'searching' || (activeRide.status as any) === 'SEARCHING_DRIVER') && (
            <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-[#EDE8E0] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-2xl bg-[#FFF4ED] border border-[#FFD8C2] flex items-center justify-center shrink-0 shadow-xs">
                    <span className="absolute inset-0 rounded-2xl bg-[#FF6B2C]/20 animate-ping" />
                    <Radio className="w-5 h-5 text-[#FF6B2C] animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-extrabold text-[#111111] truncate">
                      Broadcasting to Nearby Captains
                    </h3>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      Request sent to nearby Toto partners
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Total Fare</div>
                  <div className="text-base sm:text-lg font-black text-[#111111]">
                    ₹{activeRide.totalFare || currentFare}
                  </div>
                </div>
              </div>

              {/* Broadcast Progress Bar */}
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-[#FF6B2C] rounded-full animate-pulse w-3/4" />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-neutral-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>Waiting for captain to accept</span>
                  <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full font-bold">
                    Expires in {formattedCountdown}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelRide('Cancelled while waiting for captain');
                    triggerSound('beep');
                  }}
                  className="py-2 px-3.5 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          )}

          {/* Status 1B: No Captain Accepted the Ride (Expired State) */}
          {(activeRide.status === 'no_driver_accepted' || (activeRide.status as any) === 'NO_DRIVER_ACCEPTED' || (activeRide.status as any) === 'expired') && (
            <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-amber-200 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-[#111111]">
                    No Captain accepted the ride
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Nearby Toto captains are currently busy or out of range. You can retry your request or cancel.
                  </p>
                </div>
              </div>

              <div className="bg-[#F8F7F4] rounded-2xl p-3 flex items-center justify-between text-xs">
                <span className="text-neutral-600 font-medium">Estimated Fare:</span>
                <span className="font-extrabold text-[#111111] text-sm">₹{activeRide.totalFare || currentFare}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    cancelRide('Booking cancelled after timeout');
                    triggerSound('beep');
                  }}
                  className="py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = activeRide.pickup;
                    const d = activeRide.dropoff;
                    const v = activeRide.vehicleType;
                    const pm = activeRide.paymentMethod;
                    createRideBooking(p, d, v, pm);
                    triggerSound('alert');
                  }}
                  className="py-3 px-4 rounded-2xl bg-[#FF6B2C] hover:bg-[#E55A1F] text-white font-extrabold text-xs transition-colors cursor-pointer shadow-xs text-center flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry Booking</span>
                </button>
              </div>
            </div>
          )}

          {/* Status 3: Ride Completed & Rating / Payment / Receipt */}
          {activeRide.status === 'completed' && (
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#EDE8E0] space-y-4">
              <div className="text-center space-y-1">
                <div className={`w-12 h-12 rounded-full ${activeRide.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center mx-auto mb-2 shadow-2xs`}>
                  {activeRide.paymentStatus === 'paid' ? (
                    <Check className="w-6 h-6 stroke-[3]" />
                  ) : (
                    <Clock className="w-6 h-6 stroke-[2.5]" />
                  )}
                </div>
                <h3 className="font-extrabold text-base text-[#111111]">
                  {activeRide.paymentStatus === 'paid' ? 'Trip Completed & Settled!' : 'Trip Completed — Payment Due'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Total fare of <strong className="text-[#111111]">₹{activeRide.totalFare}</strong>
                  {activeRide.paymentStatus === 'paid' ? (
                    <> settled via <span className="font-bold text-emerald-700">{activeRide.paymentMethod.toUpperCase()}</span></>
                  ) : (
                    <> awaiting settlement via <span className="font-bold text-amber-700">{activeRide.paymentMethod.toUpperCase()}</span></>
                  )}
                </p>
              </div>

              {/* Payment Settlement Options */}
              {activeRide.paymentStatus !== 'paid' && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          Trip Payment Due
                        </div>
                        <div className="text-[10px] text-emerald-700">Choose your preferred payment method</div>
                      </div>
                    </div>
                    <span className="font-black text-sm text-emerald-950">₹{activeRide.totalFare}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await settleRidePayment(activeRide.id, 'wallet');
                          triggerSound('success');
                        } catch (e: any) {
                          alert(e.message || 'Wallet payment failed. Please recharge your wallet.');
                        }
                      }}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Pay with Wallet</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await settleRidePayment(activeRide.id, 'cash');
                          triggerSound('success');
                        } catch (e: any) {
                          alert(e.message || 'Payment update failed');
                        }
                      }}
                      className="py-2.5 px-3 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs rounded-xl border border-emerald-200/70 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Pay Cash</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setReceiptRideData(activeRide);
                    setIsReceiptOpen(true);
                    triggerSound('beep');
                  }}
                  className="py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#111111] font-bold text-xs rounded-2xl border border-neutral-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#FF6B2C]" />
                  <span>Tax Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRatingOpen(true);
                    triggerSound('beep');
                  }}
                  className="py-2.5 px-3 bg-[#FFF4ED] hover:bg-[#FFE5D3] text-[#C8622A] font-bold text-xs rounded-2xl border border-[#FFD8C2] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-[#FF6B2C] text-[#FF6B2C]" />
                  <span>Rate Captain</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  cancelRide('Completed and reset');
                  triggerSound('success');
                }}
                className="w-full py-3 bg-[#111111] hover:bg-black text-white font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer"
              >
                Book Next Ride
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Location Picker Modal / Sheet */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-[#111111]">
                Select {showLocationPicker === 'pickup' ? 'Pickup Location' : 'Destination'}
              </h3>
              <button 
                onClick={() => setShowLocationPicker(null)} 
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Locate Me Button */}
            <button
              type="button"
              onClick={handleApplyCurrentGpsToPickup}
              disabled={isLocating}
              className="w-full py-2.5 px-3 bg-[#FDE8DC] hover:bg-[#FCD8C4] text-[#C8622A] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 fill-[#C8622A] rotate-45" />
              <span>{isLocating ? 'Acquiring GPS fix...' : 'Use My Current Live GPS Location'}</span>
            </button>

            {/* Search Input with Clear Button, Category Filter & Live Suggestions */}
            <div className="space-y-2.5">
              <form onSubmit={handleSelectCustomLocation} className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
                  {isSearchingOnline ? (
                    <Loader2 className="w-4 h-4 text-[#FF6B2C] animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                <input
                  ref={searchInputRef}
                  id="place-search-input"
                  type="text"
                  value={customSearchQuery}
                  onFocus={() => setIsSearchInputFocused(true)}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  placeholder="Search place, metro, landmark, street..."
                  className="w-full bg-[#F6F4F0] border border-[#E5DFD4] hover:border-[#D5CFC4] focus:border-[#111111] focus:bg-white rounded-2xl pl-10 pr-20 py-2.5 text-xs font-semibold text-[#111111] placeholder-gray-400 focus:outline-none transition-all shadow-2xs"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {customSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSearchQuery('');
                        setOnlineSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-[#181818] hover:bg-black text-white text-[11px] font-bold rounded-xl shadow-2xs transition-transform active:scale-95 cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              </form>

              {/* Quick Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {[
                  { id: 'all', label: '✨ All Places' },
                  { id: 'metro', label: '🚇 Metro Stations' },
                  { id: 'it', label: '🏢 Tech & IT' },
                  { id: 'mall', label: '🛍️ Malls' },
                  { id: 'hospital', label: '🏥 Hospitals' },
                  { id: 'railway', label: '🚆 Railway' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceCategory(cat.id);
                      triggerSound('beep');
                    }}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-all cursor-pointer ${
                      selectedPlaceCategory === cat.id
                        ? 'bg-[#181818] text-white shadow-xs'
                        : 'bg-[#F2ECE3] text-gray-700 hover:bg-[#EAE4D9]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Suggestions List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 px-1 pt-1">
                <span>
                  {customSearchQuery
                    ? isSearchingOnline
                      ? 'Searching places...'
                      : `Matching Suggestions (${suggestedPlaces.length})`
                    : 'Recommended Spots'}
                </span>
                {suggestedPlaces.length > 0 && (
                  <span className="text-gray-400 font-normal lowercase">tap to select</span>
                )}
              </div>

              {suggestedPlaces.length > 0 ? (
                suggestedPlaces.map((loc, idx) => {
                  const dist = getDistanceLabel(loc);
                  return (
                    <button
                      key={`${loc.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (showLocationPicker === 'pickup') {
                          setPickup(loc);
                        } else {
                          setDropoff(loc);
                        }
                        setShowLocationPicker(null);
                        triggerSound('success');
                      }}
                      className="w-full text-left p-2.5 rounded-2xl bg-white hover:bg-[#F9F7F4] border border-transparent hover:border-[#EAE4DA] flex items-start gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#F6F4F0] group-hover:bg-white group-hover:shadow-2xs flex items-center justify-center shrink-0 mt-0.5 border border-[#EDE8E0]">
                        {getPlaceIcon(loc)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-bold text-[#111111] truncate group-hover:text-[#FF6B2C] transition-colors">
                            {loc.name}
                          </div>
                          {dist && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0">
                              {dist}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                          {loc.address}
                        </div>

                        {loc.landmark && (
                          <div className="text-[9px] text-[#C8622A] font-medium mt-0.5">
                            📍 {loc.landmark}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 px-4 text-center space-y-2 bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E5DFD4]">
                  <p className="text-xs text-gray-500">
                    No matching landmark found for "{customSearchQuery}"
                  </p>
                  <button
                    type="button"
                    onClick={handleSelectCustomLocation}
                    className="px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl hover:bg-black transition-all cursor-pointer"
                  >
                    Set "{customSearchQuery}" as custom location
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast when Passenger Selects a Toto Partner & Dispatches Request */}
      {notificationToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-[#181818] text-white p-4 rounded-3xl shadow-2xl border border-neutral-700 flex items-start gap-3.5 animate-in slide-in-from-top-4 duration-300">
          <div className="w-9 h-9 rounded-2xl bg-[#FF6B2C] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Request Dispatched to Partner</span>
                <span className="text-[9px] bg-[#23864A] text-white font-mono px-1.5 py-0.2 rounded-full">
                  LIVE
                </span>
              </h4>
              <button 
                onClick={() => setNotificationToast(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Selected <strong>{notificationToast.driverName}</strong> ({notificationToast.vehicleNumber}) for <strong className="text-[#FF6B2C]">₹{notificationToast.price}</strong>.
            </p>
            <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Partner has received your offer notification!</span>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* MODALS SUITE */}

      {/* Full-Screen Mobile-Optimized Location Search Modal */}
      <FullScreenLocationSearchModal
        isOpen={isFullScreenSearchOpen}
        onClose={() => setIsFullScreenSearchOpen(false)}
        pickup={pickup}
        dropoff={dropoff}
        onSelectPickup={(point) => setPickup(point)}
        onSelectDropoff={(point) => setDropoff(point)}
        userGpsPoint={gpsState.lat && gpsState.lng ? {
          lat: gpsState.lat,
          lng: gpsState.lng,
          address: gpsState.address,
          name: gpsState.name
        } : null}
        onUseLiveGps={handleApplyCurrentGpsToPickup}
        savedPlaces={savedPlaces}
        triggerSound={triggerSound}
      />

      {/* 1. Wallet Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        balance={walletBalance}
        onAddMoney={addMoneyToWallet}
      />

      {/* 2. Schedule Ride Modal */}
      <ScheduleRideModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        currentPickup={pickup}
        currentDropoff={dropoff}
        userId={user?.id || 'usr_passenger'}
        userName={user?.name || 'Passenger'}
        userPhone={user?.phone || '+91 98311 02458'}
        onConfirmSchedule={createScheduledRide}
      />

      {/* 3. Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedPlacesOpen}
        onClose={() => setIsSavedPlacesOpen(false)}
        savedPlaces={savedPlaces}
        onAddPlace={addSavedPlace}
        onDeletePlace={deleteSavedPlace}
        onSelectPlace={(point) => {
          setDropoff(point);
          triggerSound('success');
        }}
      />

      {/* 5. Safety Center Modal */}
      <SafetyCenterModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
        onOpenSos={() => {
          setIsSafetyOpen(false);
          setIsSosOpen(true);
        }}
      />

      {/* 6. Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setSupportRideId(undefined);
        }}
        userId={user?.id || 'usr_passenger'}
        userName={user?.name || 'Passenger'}
        userRole="user"
        userEmail={user?.email || 'halderkoushik120@gmail.com'}
        activeRideId={supportRideId || activeRide?.id}
        onSubmitTicket={createSupportTicket}
      />

      {/* 7. Live SOS Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        rideId={activeRide?.id || 'emergency_alert'}
        userId={user?.id || 'usr_passenger'}
        userName={user?.name || 'Passenger'}
        driverId={activeRide?.driverId}
        driverName={activeRide?.driverName}
        vehicleNumber={activeRide?.driverVehicleNumber}
        currentLocation={pickup}
        emergencyContacts={emergencyContacts}
        onAddContact={addEmergencyContact}
      />

      {/* 8. Live In-Ride Chat Modal */}
      {activeRide && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          rideId={activeRide.id}
          senderRole="user"
          currentUserId={user?.id || 'usr_passenger'}
          currentUserName={user?.name || 'Passenger'}
          partnerName={activeRide.driverName || 'Captain'}
          partnerPhone={activeRide.driverPhone}
        />
      )}

      {/* 9. Share Trip Modal */}
      {activeRide && (
        <ShareTripModal
          isOpen={isShareTripOpen}
          onClose={() => setIsShareTripOpen(false)}
          ride={activeRide}
        />
      )}

      {/* 10. Printable Tax Receipt Modal */}
      {receiptRideData && (
        <RideReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setReceiptRideData(null);
          }}
          ride={receiptRideData}
          customerName={user?.name || 'Passenger'}
          customerEmail={user?.email || 'halderkoushik120@gmail.com'}
        />
      )}

      {/* 11. Rating Modal */}
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        driverName={activeRide?.driverName || 'Toto Captain'}
        vehicleNumber={activeRide?.driverVehicleNumber || 'WB-06-ER-4821'}
        onSubmitRating={rateRideWithTags}
      />

      {/* 12. Fare Breakdown Modal */}
      <FareBreakdownModal
        isOpen={isFareBreakdownOpen}
        onClose={() => setIsFareBreakdownOpen(false)}
        baseFare={baseFare}
        distanceCharge={distanceCharge}
        timeCharge={timeCharge}
        couponDiscount={couponDiscount}
        totalFare={currentFare}
        distanceKm={Number(estimatedDistanceKm.toFixed(1))}
        durationMins={Math.round(estimatedDistanceKm * 4)}
        vehicleName={selectedTier.name}
        appliedCouponCode={appliedCoupon?.code}
      />

      {/* 13. Coupons & Offers Modal */}
      <CouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        currentFare={rawFare}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={(coupon) => {
          setAppliedCoupon(coupon);
          triggerSound('success');
        }}
        onRemoveCoupon={() => {
          setAppliedCoupon(null);
          triggerSound('beep');
        }}
      />
    </div>
  );
};
