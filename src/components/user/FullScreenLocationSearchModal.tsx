import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  ArrowLeft, 
  X, 
  ArrowUpDown, 
  Clock, 
  Home, 
  Briefcase, 
  Building2, 
  Train, 
  Plane, 
  ShoppingBag, 
  HeartPulse, 
  Landmark, 
  Loader2, 
  Check, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { GeoPoint, SavedPlaceItem } from '../../types';
import { POPULAR_LOCATIONS } from '../../data/appData';
import { searchPlacesOnline, calculateDistanceKm } from '../../utils/geoUtils';

interface FullScreenLocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickup: GeoPoint | null;
  dropoff: GeoPoint | null;
  onSelectPickup: (point: GeoPoint) => void;
  onSelectDropoff: (point: GeoPoint) => void;
  userGpsPoint?: { lat: number; lng: number; address?: string; name?: string } | null;
  onUseLiveGps: () => void;
  savedPlaces?: SavedPlaceItem[];
  triggerSound?: (type: 'beep' | 'success' | 'alert' | 'click') => void;
}

export const FullScreenLocationSearchModal: React.FC<FullScreenLocationSearchModalProps> = ({
  isOpen,
  onClose,
  pickup,
  dropoff,
  onSelectPickup,
  onSelectDropoff,
  userGpsPoint,
  onUseLiveGps,
  savedPlaces = [],
  triggerSound
}) => {
  // Which field is currently active/focused: 'pickup' | 'dropoff'
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff'>('dropoff');
  const [pickupQuery, setPickupQuery] = useState(pickup?.name || '');
  const [dropoffQuery, setDropoffQuery] = useState(dropoff?.name || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlineResults, setOnlineResults] = useState<GeoPoint[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  // Sync inputs when pickup or dropoff change externally
  useEffect(() => {
    if (pickup) {
      setPickupQuery(pickup.name);
    }
  }, [pickup]);

  useEffect(() => {
    if (dropoff) {
      setDropoffQuery(dropoff.name);
    }
  }, [dropoff]);

  // When modal opens, focus the dropoff field by default (or pickup if empty)
  useEffect(() => {
    if (isOpen) {
      setPickupQuery(pickup?.name || '');
      setDropoffQuery(dropoff?.name || '');
      setOnlineResults([]);
      setSelectedCategory('all');

      setTimeout(() => {
        if (!pickup) {
          setActiveField('pickup');
          pickupInputRef.current?.focus();
        } else {
          setActiveField('dropoff');
          dropoffInputRef.current?.focus();
        }
      }, 200);
    }
  }, [isOpen, pickup, dropoff]);

  const activeQuery = activeField === 'pickup' ? pickupQuery : dropoffQuery;

  // Real-time debounced search across all-India addresses
  useEffect(() => {
    const trimmed = activeQuery.trim();
    if (trimmed.length < 2) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const centerLat = userGpsPoint?.lat || pickup?.lat || 22.5804;
        const centerLng = userGpsPoint?.lng || pickup?.lng || 88.4378;
        const results = await searchPlacesOnline(trimmed, centerLat, centerLng);
        setOnlineResults(results);
      } catch (err) {
        console.debug('Search error:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeQuery, userGpsPoint, pickup]);

  // Filtered places combining local all-India hubs + online search results
  const suggestedPlaces = useMemo(() => {
    const query = activeQuery.trim().toLowerCase();

    // 1. Filter local popular catalog
    const localMatches = POPULAR_LOCATIONS.filter((loc) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const zone = (loc.zone || '').toLowerCase();
        const name = loc.name.toLowerCase();
        if (selectedCategory === 'metro' && !zone.includes('metro') && !name.includes('metro')) return false;
        if (selectedCategory === 'railway' && !zone.includes('railway') && !zone.includes('airport') && !name.includes('station') && !name.includes('airport')) return false;
        if (selectedCategory === 'it' && !zone.includes('it') && !zone.includes('tech') && !name.includes('park') && !name.includes('cyber') && !name.includes('towers')) return false;
        if (selectedCategory === 'mall' && !zone.includes('shopping') && !name.includes('mall') && !name.includes('centre') && !name.includes('market')) return false;
        if (selectedCategory === 'hospital' && !zone.includes('health') && !name.includes('hospital') && !name.includes('clinic')) return false;
      }

      if (!query) return true;

      const nameMatch = loc.name.toLowerCase().includes(query);
      const addressMatch = loc.address.toLowerCase().includes(query);
      const landmarkMatch = (loc.landmark || '').toLowerCase().includes(query);
      const zoneMatch = (loc.zone || '').toLowerCase().includes(query);

      return nameMatch || addressMatch || landmarkMatch || zoneMatch;
    });

    // 2. Append online results if search query active, avoiding duplicate names
    const existingNames = new Set(localMatches.map((l) => l.name.toLowerCase()));
    const additionalOnline = onlineResults.filter(
      (onlineLoc) => !existingNames.has(onlineLoc.name.toLowerCase())
    );

    return [...localMatches, ...additionalOnline];
  }, [activeQuery, selectedCategory, onlineResults]);

  // Place Icon Helper
  const getPlaceIcon = (loc: GeoPoint) => {
    const text = `${loc.name} ${loc.zone || ''} ${loc.address}`.toLowerCase();
    if (text.includes('airport') || text.includes('terminal')) {
      return <Plane className="w-4 h-4 text-sky-600 shrink-0" />;
    }
    if (text.includes('metro') || text.includes('subway') || text.includes('transit')) {
      return <Train className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (text.includes('station') || text.includes('railway') || text.includes('terminus') || text.includes('junction')) {
      return <Landmark className="w-4 h-4 text-amber-700 shrink-0" />;
    }
    if (text.includes('park') || text.includes('tech') || text.includes('cyber') || text.includes('dlf') || text.includes('tower') || text.includes('office')) {
      return <Building2 className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (text.includes('mall') || text.includes('centre') || text.includes('market') || text.includes('shopping')) {
      return <ShoppingBag className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (text.includes('hospital') || text.includes('health') || text.includes('clinic') || text.includes('medical')) {
      return <HeartPulse className="w-4 h-4 text-rose-600 shrink-0" />;
    }
    return <MapPin className="w-4 h-4 text-[#FF7A1A] shrink-0" />;
  };

  // Distance computation
  const getDistanceLabel = (loc: GeoPoint) => {
    const refPoint = userGpsPoint || pickup;
    if (!refPoint || !refPoint.lat || !refPoint.lng || !loc.lat || !loc.lng) return null;
    const distKm = calculateDistanceKm(
      { lat: refPoint.lat, lng: refPoint.lng },
      { lat: loc.lat, lng: loc.lng }
    );
    if (distKm < 1) {
      return `${Math.round(distKm * 1000)} m`;
    }
    return `${distKm.toFixed(1)} km`;
  };

  // Handle selecting a place
  const handleSelectLocation = (loc: GeoPoint) => {
    triggerSound?.('success');
    if (activeField === 'pickup') {
      onSelectPickup(loc);
      setPickupQuery(loc.name);
      // Automatically advance to dropoff if not set yet
      if (!dropoff) {
        setActiveField('dropoff');
        setTimeout(() => dropoffInputRef.current?.focus(), 150);
      } else {
        onClose();
      }
    } else {
      onSelectDropoff(loc);
      setDropoffQuery(loc.name);
      onClose();
    }
  };

  // Swap pickup and dropoff
  const handleSwapLocations = () => {
    triggerSound?.('beep');
    if (pickup && dropoff) {
      const tempPickup = pickup;
      onSelectPickup(dropoff);
      onSelectDropoff(tempPickup);
      setPickupQuery(dropoff.name);
      setDropoffQuery(tempPickup.name);
    } else if (pickup && !dropoff) {
      onSelectDropoff(pickup);
      setDropoffQuery(pickup.name);
      setPickupQuery('');
      setActiveField('pickup');
      pickupInputRef.current?.focus();
    }
  };

  // Use Live GPS
  const handleUseCurrentGps = () => {
    triggerSound?.('click');
    onUseLiveGps();
    if (userGpsPoint) {
      const livePoint: GeoPoint = {
        lat: userGpsPoint.lat,
        lng: userGpsPoint.lng,
        name: userGpsPoint.name || 'My Current GPS Location',
        address: userGpsPoint.address || `Coordinates: ${userGpsPoint.lat.toFixed(4)}, ${userGpsPoint.lng.toFixed(4)}`,
        zone: 'Live GPS'
      };
      if (activeField === 'pickup') {
        onSelectPickup(livePoint);
        setPickupQuery(livePoint.name);
        if (!dropoff) {
          setActiveField('dropoff');
          setTimeout(() => dropoffInputRef.current?.focus(), 150);
        } else {
          onClose();
        }
      } else {
        onSelectDropoff(livePoint);
        setDropoffQuery(livePoint.name);
        onClose();
      }
    }
  };

  // Custom free-form location submission
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = activeQuery.trim();
    if (!query) return;

    const baseLat = (activeField === 'pickup' ? pickup?.lat : dropoff?.lat) || userGpsPoint?.lat || 22.5804;
    const baseLng = (activeField === 'pickup' ? pickup?.lng : dropoff?.lng) || userGpsPoint?.lng || 88.4378;

    const customPoint: GeoPoint = {
      lat: baseLat,
      lng: baseLng,
      name: query,
      address: `${query}, India`,
      zone: 'Custom Address'
    };

    handleSelectLocation(customPoint);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="fullscreen-location-search-modal"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 bg-[#FAF8F5] text-[#111111] flex flex-col justify-start select-none overflow-hidden"
          style={{ height: '100dvh' }}
        >
          {/* Top Navigation Bar */}
          <div className="w-full bg-white border-b border-[#EDE8E0] px-3.5 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 sm:py-3.5 flex items-center justify-between shadow-2xs z-10 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerSound?.('click');
                  onClose();
                }}
                className="w-10 h-10 rounded-full hover:bg-neutral-100 active:bg-neutral-200 flex items-center justify-center text-neutral-800 transition-colors cursor-pointer"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">
                  Where to next?
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#15803D]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time All-India Locations</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerSound?.('click');
                onClose();
              }}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-800 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>

          {/* Expanded Route Inputs Card (Matching 1.jpeg) */}
          <div className="p-3.5 sm:p-4 bg-white border-b border-[#EDE8E0] shadow-xs shrink-0">
            <div className="max-w-2xl mx-auto">
              <div 
                id="expanded-route-card"
                className="rounded-3xl bg-[#F8F9FA] border border-[#E2E8F0] p-3.5 sm:p-4.5 shadow-2xs flex items-center gap-3 sm:gap-4 relative transition-all"
              >
                {/* Left: Route Track Indicator (Green halo dot, dashed line, terracotta dot from 1.jpeg) */}
                <div className="flex flex-col items-center justify-between py-1 shrink-0 self-stretch select-none">
                  {/* Top: Pickup Green Concentric Indicator with soft halo */}
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0 shadow-2xs">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#15803D] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  {/* Vertical Dashed Line */}
                  <div className="w-[2px] flex-1 my-1 border-l-2 border-dashed border-[#64748B] min-h-[22px] sm:min-h-[26px]" />

                  {/* Bottom: Drop Terracotta Concentric Indicator */}
                  <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-[#9A3412] flex items-center justify-center shrink-0 shadow-2xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>

                {/* Right: Input fields for Pickup and Drop location */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  {/* Row 1: Pickup Location */}
                  <div 
                    onClick={() => {
                      setActiveField('pickup');
                      pickupInputRef.current?.focus();
                    }}
                    className={`py-1 flex items-center justify-between min-h-[38px] rounded-xl px-2 transition-all ${
                      activeField === 'pickup' ? 'bg-white ring-2 ring-emerald-500/30' : 'hover:bg-neutral-100/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <input
                        ref={pickupInputRef}
                        type="text"
                        value={pickupQuery}
                        onChange={(e) => setPickupQuery(e.target.value)}
                        onFocus={() => setActiveField('pickup')}
                        placeholder="Pickup location"
                        className="w-full bg-transparent text-sm sm:text-base font-semibold text-[#111111] placeholder:text-[#64748B] focus:outline-none tracking-tight"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pickupQuery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPickupQuery('');
                            pickupInputRef.current?.focus();
                          }}
                          className="w-5 h-5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseCurrentGps();
                        }}
                        title="Use current GPS location"
                        className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-700 transition-colors"
                      >
                        <Navigation className="w-4 h-4 rotate-45 fill-emerald-600 text-emerald-600" />
                      </button>
                    </div>
                  </div>

                  {/* Subtle Horizontal Divider Line */}
                  <div className="h-[1px] bg-[#E2E8F0] my-1 sm:my-1.5" />

                  {/* Row 2: Drop Location */}
                  <div 
                    onClick={() => {
                      setActiveField('dropoff');
                      dropoffInputRef.current?.focus();
                    }}
                    className={`py-1 flex items-center justify-between min-h-[38px] rounded-xl px-2 transition-all ${
                      activeField === 'dropoff' ? 'bg-white ring-2 ring-[#FF6B2C]/30' : 'hover:bg-neutral-100/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <input
                        ref={dropoffInputRef}
                        type="text"
                        value={dropoffQuery}
                        onChange={(e) => setDropoffQuery(e.target.value)}
                        onFocus={() => setActiveField('dropoff')}
                        placeholder="Drop location"
                        className="w-full bg-transparent text-sm sm:text-base font-semibold text-[#111111] placeholder:text-[#64748B] focus:outline-none tracking-tight"
                      />
                    </div>
                    {dropoffQuery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropoffQuery('');
                          dropoffInputRef.current?.focus();
                        }}
                        className="w-5 h-5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Swap Pickup & Drop Button */}
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  title="Swap pickup and dropoff"
                  className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] hover:bg-neutral-50 active:scale-95 shadow-2xs flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-all cursor-pointer shrink-0 self-center"
                >
                  <ArrowUpDown className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* Quick Shortcuts Bar */}
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar text-xs">
                {/* 1. Live GPS button */}
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF8F1] hover:bg-[#DDF4E7] text-[#15803D] font-bold shrink-0 border border-[#D1FAE5] transition-colors cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5 rotate-45 fill-[#15803D]" />
                  <span>Use Live GPS Location</span>
                </button>

                {/* 2. Saved Home Shortcut */}
                {savedPlaces.some((p) => p.type === 'home') && (
                  <button
                    type="button"
                    onClick={() => {
                      const home = savedPlaces.find((p) => p.type === 'home');
                      if (home) handleSelectLocation(home);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Home className="w-3.5 h-3.5 text-amber-700" />
                    <span>Home</span>
                  </button>
                )}

                {/* 3. Saved Work Shortcut */}
                {savedPlaces.some((p) => p.type === 'work') && (
                  <button
                    type="button"
                    onClick={() => {
                      const work = savedPlaces.find((p) => p.type === 'work');
                      if (work) handleSelectLocation(work);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-blue-700" />
                    <span>Work</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Filter Pills (All-India transit categories) */}
          <div className="bg-[#FAF8F5] px-4 py-2 border-b border-[#EDE8E0] shrink-0">
            <div className="max-w-2xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {[
                { id: 'all', label: '✨ All India Hubs' },
                { id: 'metro', label: '🚇 Metro Stations' },
                { id: 'railway', label: '🚆 Rail & Airports' },
                { id: 'it', label: '🏢 Tech & IT Parks' },
                { id: 'mall', label: '🛍️ Malls & Markets' },
                { id: 'hospital', label: '🏥 Hospitals' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    triggerSound?.('click');
                  }}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#181818] text-white shadow-xs'
                      : 'bg-white border border-[#E5DFD4] text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Results & Suggestions Container */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 max-w-2xl mx-auto w-full">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400 px-1">
              <span>
                {activeQuery.trim()
                  ? isSearchingOnline
                    ? 'SEARCHING ALL-INDIA ADDRESSES...'
                    : `MATCHING LOCATIONS (${suggestedPlaces.length})`
                  : `POPULAR ${activeField === 'pickup' ? 'PICKUP' : 'DROP'} DESTINATIONS ACROSS INDIA`}
              </span>
              {isSearchingOnline ? (
                <span className="flex items-center gap-1 text-[#FF6B2C]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live search
                </span>
              ) : (
                <span className="text-neutral-400 font-normal lowercase">tap to select</span>
              )}
            </div>

            {/* Suggestions list */}
            {suggestedPlaces.length > 0 ? (
              <div className="space-y-1.5">
                {suggestedPlaces.map((loc, idx) => {
                  const dist = getDistanceLabel(loc);
                  return (
                    <button
                      key={`${loc.name}-${idx}`}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left p-3 rounded-2xl bg-white hover:bg-[#F9F7F4] active:bg-[#F0EEEA] border border-[#EAE4DA] hover:border-neutral-300 flex items-start gap-3 transition-all cursor-pointer group shadow-2xs"
                    >
                      {/* Place Icon */}
                      <div className="w-9 h-9 rounded-xl bg-[#F6F4F0] group-hover:bg-white group-hover:shadow-2xs flex items-center justify-center shrink-0 mt-0.5 border border-[#EDE8E0] transition-colors">
                        {getPlaceIcon(loc)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-sm font-bold text-[#111111] group-hover:text-[#FF6B2C] truncate transition-colors">
                            {loc.name}
                          </span>
                          {dist && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                              {dist}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          {loc.address}
                        </p>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {loc.zone && (
                            <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.2 rounded-md">
                              {loc.zone}
                            </span>
                          )}
                          {loc.landmark && (
                            <span className="text-[10px] text-[#C8622A] font-medium truncate">
                              📍 {loc.landmark}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-600 shrink-0 self-center" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 px-4 text-center space-y-3 bg-white rounded-3xl border border-dashed border-[#E5DFD4] shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-neutral-400 flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800">
                    No matching location found
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                    Could not find "{activeQuery}". You can set it as a custom address or try a landmark.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="px-4 py-2 bg-[#181818] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Set "{activeQuery}" as {activeField === 'pickup' ? 'Pickup' : 'Dropoff'}
                </button>
              </div>
            )}
          </div>

          {/* Bottom Confirmation Bar when both locations are chosen */}
          {pickup && dropoff && (
            <div className="p-3.5 bg-white border-t border-[#EDE8E0] shadow-md shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase font-bold text-neutral-400">Route Ready</div>
                  <div className="text-xs font-bold text-[#111111] truncate">
                    {pickup.name} → {dropoff.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerSound?.('click');
                    onClose();
                  }}
                  className="min-h-[44px] px-5 py-2.5 bg-[#181818] hover:bg-[#FF6B2C] text-white text-xs font-bold rounded-2xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirm Route</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
