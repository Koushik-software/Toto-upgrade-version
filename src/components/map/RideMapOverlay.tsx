import React, { useState, useMemo, useCallback } from 'react';
import { ActiveRide, GpsLocationState, GeoPoint, SimulatedDriverMarker } from '../../types';
import { calculateDistanceKm } from '../../utils/geoUtils';
import { 
  Clock, 
  Navigation, 
  Compass, 
  Copy, 
  Check, 
  LocateFixed, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Radio, 
  MapPin, 
  Phone,
  ShieldCheck
} from 'lucide-react';

interface RideMapOverlayProps {
  activeRide: ActiveRide;
  driverGpsState?: GpsLocationState | null;
  drivers?: SimulatedDriverMarker[];
  pickup?: GeoPoint | null;
  dropoff?: GeoPoint | null;
  onCenterOnDriver?: (lat: number, lng: number) => void;
}

// Convert bearing degrees into cardinal heading (e.g. 45° -> NE)
function getCardinalDirection(angle: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((angle % 360) + 360) % 360 / 45) % 8;
  return directions[index];
}

export const RideMapOverlay: React.FC<RideMapOverlayProps> = ({
  activeRide,
  driverGpsState,
  drivers = [],
  pickup,
  dropoff,
  onCenterOnDriver,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Determine current live driver coordinates
  const driverCoords = useMemo(() => {
    const lat = 
      activeRide?.driverLocation?.lat ??
      driverGpsState?.lat ??
      (activeRide?.driverId ? drivers.find((d) => d.id === activeRide.driverId)?.lat : undefined) ??
      (pickup?.lat ? pickup.lat + 0.0028 : 22.5832);

    const lng = 
      activeRide?.driverLocation?.lng ??
      driverGpsState?.lng ??
      (activeRide?.driverId ? drivers.find((d) => d.id === activeRide.driverId)?.lng : undefined) ??
      (pickup?.lng ? pickup.lng + 0.0022 : 88.4391);

    const heading = 
      activeRide?.driverLocation?.heading ??
      driverGpsState?.heading ??
      0;

    const speed = 
      driverGpsState?.speedKmH ??
      (activeRide.status === 'in_progress' ? 22 : activeRide.status === 'driver_assigned' ? 18 : 0);

    return {
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      heading: Math.round(heading),
      speed,
    };
  }, [activeRide, driverGpsState, drivers, pickup]);

  // Target destination point: if in progress, target is dropoff; otherwise pickup
  const targetPoint = useMemo(() => {
    if (activeRide.status === 'in_progress') {
      return dropoff || activeRide.dropoff;
    }
    return pickup || activeRide.pickup;
  }, [activeRide.status, activeRide.dropoff, activeRide.pickup, dropoff, pickup]);

  // Calculate live distance from driver to target point in km
  const distanceToTargetKm = useMemo(() => {
    if (!targetPoint || !targetPoint.lat || !targetPoint.lng) {
      return activeRide.distanceKm || 1.8;
    }
    const dist = calculateDistanceKm(
      { lat: driverCoords.lat, lng: driverCoords.lng },
      { lat: targetPoint.lat, lng: targetPoint.lng }
    );
    return Math.max(0.1, Number(dist.toFixed(1)));
  }, [driverCoords, targetPoint, activeRide.distanceKm]);

  // Calculate dynamic Estimated Time of Arrival (ETA) in minutes
  const etaMins = useMemo(() => {
    if (activeRide.status === 'driver_arrived') return 0;
    if (activeRide.status === 'searching') {
      return activeRide.estimatedMins ? Math.min(activeRide.estimatedMins, 4) : 3;
    }
    // E-Rickshaws travel approx 16-20 km/h in city lanes (~3.3 mins per km) + 1 min traffic cushion
    const calculated = Math.max(1, Math.round((distanceToTargetKm / 18) * 60));
    return calculated;
  }, [activeRide.status, activeRide.estimatedMins, distanceToTargetKm]);

  // Formatted arrival clock time (e.g. 2:45 PM)
  const arrivalClockTime = useMemo(() => {
    const targetDate = new Date(Date.now() + etaMins * 60 * 1000);
    return targetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [etaMins]);

  // Formatted DMS coordinates
  const formattedCoords = useMemo(() => {
    const latDir = driverCoords.lat >= 0 ? 'N' : 'S';
    const lngDir = driverCoords.lng >= 0 ? 'E' : 'W';
    return {
      lat: `${Math.abs(driverCoords.lat).toFixed(5)}° ${latDir}`,
      lng: `${Math.abs(driverCoords.lng).toFixed(5)}° ${lngDir}`,
      raw: `${driverCoords.lat.toFixed(5)}, ${driverCoords.lng.toFixed(5)}`,
    };
  }, [driverCoords.lat, driverCoords.lng]);

  const handleCopyCoords = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formattedCoords.raw).catch(() => {});
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  }, [formattedCoords.raw]);

  const handleCenterDriver = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCenterOnDriver) {
      onCenterOnDriver(driverCoords.lat, driverCoords.lng);
    }
  }, [onCenterOnDriver, driverCoords.lat, driverCoords.lng]);

  // Ride status headline & subline
  const statusInfo = useMemo(() => {
    switch (activeRide.status) {
      case 'searching':
        return {
          badge: 'Captain Notified',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          title: 'Estimated Pickup',
          subline: 'Connecting to nearby Toto Partner...',
          etaPrefix: 'Est. Pickup in',
        };
      case 'driver_assigned':
      case 'driver_arriving':
        return {
          badge: 'En Route to Pickup',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: 'Arriving in',
          subline: `Captain is ${distanceToTargetKm} km from your pickup spot`,
          etaPrefix: 'Arriving in',
        };
      case 'driver_arrived':
        return {
          badge: 'Captain Arrived',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          title: 'Captain at Pickup',
          subline: 'Your Toto is waiting at pickup location',
          etaPrefix: 'Arrived at',
        };
      case 'in_progress':
        return {
          badge: 'Trip in Progress',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: 'Destination ETA',
          subline: `${distanceToTargetKm} km to ${targetPoint?.name || 'Drop-off spot'}`,
          etaPrefix: 'Drop-off in',
        };
      default:
        return {
          badge: 'Ride Booked',
          badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
          title: 'Live Tracking',
          subline: 'Tracking Toto location in real-time',
          etaPrefix: 'ETA',
        };
    }
  }, [activeRide.status, distanceToTargetKm, targetPoint?.name]);

  const cardinalHeading = useMemo(() => {
    return getCardinalDirection(driverCoords.heading);
  }, [driverCoords.heading]);

  // Minimized floating compact pill
  if (isMinimized) {
    return (
      <div 
        id="ride-map-overlay-minimized"
        className="absolute top-3 right-3 z-20 animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md hover:bg-white text-[#111111] rounded-2xl shadow-lg border border-[#E5DFD4] transition-all cursor-pointer group hover:scale-[1.02]"
          title="Expand live ride telemetry"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 relative" />
          </div>

          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Clock className="w-3.5 h-3.5 text-[#FF6B2C]" />
            <span>{activeRide.status === 'driver_arrived' ? 'Arrived!' : `${etaMins} mins`}</span>
          </div>

          <span className="text-gray-300 font-light">|</span>

          <div className="flex items-center gap-1 font-mono text-[11px] text-gray-600">
            <Radio className="w-3 h-3 text-emerald-600" />
            <span>{driverCoords.lat.toFixed(3)}, {driverCoords.lng.toFixed(3)}</span>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-black transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="ride-map-overlay-card"
      className="hidden absolute top-12 left-2.5 right-2.5 sm:top-3 sm:left-auto sm:right-3 z-20 sm:w-[320px] max-w-[calc(100%-20px)] bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-lg border border-[#E5DFD4] space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-300 select-none"
    >
      {/* Top Header: Live Status Badge + ETA + Minimize toggle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border tracking-wider ${statusInfo.badgeColor}`}>
              {statusInfo.badge}
            </span>
          </div>

          {/* Primary ETA Display */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
              {activeRide.status === 'driver_arrived' ? 'Arrived' : `${etaMins} mins`}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {activeRide.status === 'driver_arrived' ? 'at pickup spot' : `(${arrivalClockTime})`}
            </span>
          </div>

          <p className="text-[11px] text-gray-600 truncate mt-0.5">
            {statusInfo.subline}
          </p>
        </div>

        {/* Top Right Action: Minimize to Pill */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Minimize overlay"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Driver Coordinates & Live Telemetry Box */}
      <div 
        id="driver-coordinates-box"
        className="bg-[#FAF8F5] border border-[#EBE5DB] rounded-xl p-2.5 space-y-2"
      >
        {/* Box Header: Live Telemetry Label + Center Driver Button */}
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="flex items-center gap-1 text-emerald-700">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>Driver GPS Coordinates</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
            <span>±10m</span>
          </div>
        </div>

        {/* Live Coordinate Values Display */}
        <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-2 border border-[#EDE8E0]">
          <div className="space-y-0.5">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Latitude</div>
            <div className="text-xs font-mono font-bold text-[#111111] tracking-tight">
              {formattedCoords.lat}
            </div>
          </div>

          <div className="space-y-0.5 border-l border-neutral-100 pl-2">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Longitude</div>
            <div className="text-xs font-mono font-bold text-[#111111] tracking-tight">
              {formattedCoords.lng}
            </div>
          </div>
        </div>

        {/* Telemetry Row: Speed, Heading & Action Buttons */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {/* Dynamic Speed & Heading Badge */}
          <div className="flex items-center gap-2 text-[10.5px] font-semibold text-gray-600 min-w-0">
            <div className="flex items-center gap-1 font-mono text-[#111111]">
              <Zap className="w-3 h-3 text-[#FF6B2C] fill-[#FF6B2C] shrink-0" />
              <span>{driverCoords.speed} km/h</span>
            </div>

            <span className="text-gray-300">•</span>

            <div className="flex items-center gap-1 text-gray-600 font-mono truncate" title={`Heading ${driverCoords.heading}°`}>
              <Compass className="w-3 h-3 text-gray-500 shrink-0" />
              <span>{cardinalHeading} ({driverCoords.heading}°)</span>
            </div>
          </div>

          {/* Action Buttons: Copy & Center Map */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Copy Coordinates Button */}
            <button
              type="button"
              onClick={handleCopyCoords}
              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                copiedCoords 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-white text-gray-700 border-[#E2E8F0] hover:bg-gray-50 active:scale-95'
              }`}
              title="Copy latitude & longitude"
            >
              {copiedCoords ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-500" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Center Map on Driver */}
            <button
              type="button"
              onClick={handleCenterDriver}
              className="px-2 py-1 bg-[#141414] hover:bg-black text-white rounded-md text-[10px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              title="Focus map on Toto Captain"
            >
              <LocateFixed className="w-3 h-3 text-[#FF6B2C]" />
              <span>Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* Driver & Vehicle Quick Summary Strip */}
      <div className="flex items-center justify-between text-xs pt-0.5 border-t border-neutral-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#FFF4ED] text-[#C8622A] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#FFD8C2]">
            {activeRide.driverName ? activeRide.driverName.charAt(0) : 'T'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[#111111] truncate text-[11px]">
              {activeRide.driverName || 'Toto Captain'}
            </div>
            <div className="text-[10px] text-gray-500 font-mono truncate">
              {activeRide.vehicleNumber || 'WB-06-ER-4821'}
            </div>
          </div>
        </div>

        {/* PIN OTP Display for Quick Access */}
        {activeRide.otp && (
          <div className="text-right shrink-0 bg-white border border-[#EDE8E0] px-2 py-0.5 rounded-lg">
            <div className="text-[8px] uppercase font-bold text-gray-400">PIN OTP</div>
            <div className="text-xs font-black tracking-widest text-[#111111] font-mono">
              {activeRide.otp}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
