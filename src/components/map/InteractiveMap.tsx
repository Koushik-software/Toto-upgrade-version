import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeoPoint, SimulatedDriverMarker, ActiveRide, GpsLocationState } from '../../types';
import { calculateBearing, fetchRouteBetweenPoints } from '../../utils/geoUtils';
import { 
  Plus, 
  Minus, 
  Navigation, 
  Zap, 
  MapPin,
  Compass,
  Layers,
  Route,
  WifiOff,
  Crosshair,
  AlertCircle
} from 'lucide-react';
import L from 'leaflet';

interface InteractiveMapProps {
  pickup?: GeoPoint | null;
  dropoff?: GeoPoint | null;
  activeRide?: ActiveRide | null;
  drivers?: SimulatedDriverMarker[];
  mode?: 'user' | 'driver' | 'admin' | 'compact';
  userGpsState?: GpsLocationState | null;
  driverGpsState?: GpsLocationState | null;
  onSelectLocation?: (point: GeoPoint, type: 'pickup' | 'dropoff') => void;
  heightClass?: string;
  onCenterGps?: () => void;
  isWatchingGps?: boolean;
  isFullScreen?: boolean;
  edgeToEdgeTop?: boolean;
  children?: React.ReactNode;
}

// Optional CARTO API Key if provided in environment
const envCartoKey = ((import.meta as any).env?.VITE_CARTO_API_KEY as string | undefined);
const CARTO_API_KEY = envCartoKey && envCartoKey.trim() !== '' ? envCartoKey.trim() : undefined;

type MapTileStyle = 'voyager' | 'positron' | 'osm';

function getTileLayerConfig(style: MapTileStyle) {
  if (style === 'osm') {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abc',
        maxZoom: 19,
      }
    };
  }

  const path = style === 'positron' ? 'light_all' : 'rastertiles/voyager';
  const keyParam = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : '';
  return {
    url: `https://{s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}{r}.png${keyParam}`,
    options: {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  };
}

// Generate realistic E-Rickshaw (Toto) SVG marker HTML with rotatable inner container
function createTotoSvgIcon(heading = 0, isAvailable = true, label = 'Toto', isAssigned = false, vehicleId = 'toto') {
  const accentColor = isAssigned ? '#10B981' : (isAvailable ? '#FF6B2C' : '#6B7280');
  const bgBadge = isAssigned ? 'bg-emerald-600' : 'bg-[#181818]';

  return `
    <div id="marker-vehicle-${vehicleId}" class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none group cursor-pointer" style="width: 46px; height: 46px;">
      ${isAssigned ? `
        <div class="absolute inset-0 rounded-full animate-ping opacity-40 bg-emerald-500" style="animation-duration: 2s;"></div>
      ` : (isAvailable ? `
        <div class="absolute inset-0 rounded-full animate-ping opacity-25 bg-orange-500" style="animation-duration: 3s;"></div>
      ` : '')}
      
      <!-- Vehicle Body with heading rotation -->
      <div class="vehicle-rotator relative w-11 h-11 flex items-center justify-center will-change-transform drop-shadow-md" style="transform: rotate(${heading}deg);">
        <svg viewBox="0 0 64 64" class="w-11 h-11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow Base -->
          <ellipse cx="32" cy="34" rx="20" ry="15" fill="black" fill-opacity="0.22"/>
          <!-- Chassis Underbody -->
          <rect x="21" y="14" width="22" height="36" rx="9" fill="#1F2937" stroke="#374151" stroke-width="1.5"/>
          <!-- Rear Wheels -->
          <rect x="17" y="36" width="4" height="11" rx="2" fill="#111827"/>
          <rect x="43" y="36" width="4" height="11" rx="2" fill="#111827"/>
          <!-- Front Wheel -->
          <rect x="30" y="8" width="4" height="10" rx="2" fill="#111827"/>
          <!-- Front Canopy / Hood -->
          <path d="M22 22 L32 12 L42 22 Z" fill="${accentColor}"/>
          <!-- Main Canopy Roof -->
          <rect x="22" y="20" width="20" height="26" rx="5" fill="${accentColor}" stroke="#FFFFFF" stroke-width="1.2"/>
          <!-- Roof Solar / Eco Stripe -->
          <rect x="25" y="24" width="14" height="18" rx="3" fill="#FFFFFF" fill-opacity="0.3"/>
          <line x1="32" y1="24" x2="32" y2="42" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Windshield Glass -->
          <rect x="24" y="16" width="16" height="5" rx="1.5" fill="#93C5FD" fill-opacity="0.85"/>
          <!-- Dual Headlights with high-beam effect -->
          <circle cx="26" cy="11" r="2.2" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.5"/>
          <circle cx="38" cy="11" r="2.2" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.5"/>
        </svg>
      </div>

      <!-- Driver Tag Pill (always upright, unaffected by rotation) -->
      <div class="absolute -bottom-4 z-20 ${bgBadge} text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-white/25 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-emerald-300 animate-pulse' : 'bg-amber-400'}"></span>
        <span class="tracking-tight">${label}</span>
      </div>
    </div>
  `;
}

// Calculate shortest angular difference between two angles (wrapping around 360)
function getShortestAngleDelta(target: number, current: number): number {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;
  return diff;
}

// Perpendicular distance from a point to a line segment in meters (approx)
function pointToSegmentDistanceMeters(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot((px - x1) * 111320, (py - y1) * 110540 * Math.cos(px * Math.PI / 180));
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot((px - projX) * 111320, (py - projY) * 110540 * Math.cos(px * Math.PI / 180));
}

// Minimum distance from a point to any segment along a polyline
function minDistanceToPolylineMeters(pt: { lat: number; lng: number }, coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let minD = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = pointToSegmentDistanceMeters(
      pt.lat, pt.lng,
      coords[i][0], coords[i][1],
      coords[i + 1][0], coords[i + 1][1]
    );
    if (d < minD) minD = d;
  }
  return minD;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  dropoff,
  activeRide,
  drivers = [],
  mode = 'user',
  userGpsState,
  driverGpsState,
  onSelectLocation,
  heightClass = 'h-[360px] sm:h-[420px] md:h-[480px]',
  onCenterGps,
  isWatchingGps = true,
  isFullScreen = false,
  edgeToEdgeTop = false,
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const staticMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const activeDriverLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const bgRouteLayerRef = useRef<L.Polyline | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  
  // Dedicated persistent Leaflet marker for the Captain
  const captainMarkerRef = useRef<L.Marker | null>(null);
  const captainAnimFrameRef = useRef<number | null>(null);
  const captainCurrentStateRef = useRef<{ lat: number; lng: number; heading: number } | null>(null);

  // Other nearby drivers markers map for smooth movement
  const nearbyMarkersMapRef = useRef<Map<string, { marker: L.Marker; lat: number; lng: number; heading: number }>>(new Map());

  const [mapStyle, setMapStyle] = useState<MapTileStyle>('voyager');
  const [autoFollow, setAutoFollow] = useState(true);
  const [liveRoadCoords, setLiveRoadCoords] = useState<[number, number][]>([]);
  const [navSummary, setNavSummary] = useState<{ distanceKm: number; etaMins: number; label: string } | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isStaleGps, setIsStaleGps] = useState(false);

  // Route recalculation throttler
  const lastRouteFetchTimeRef = useRef<number>(0);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute primary center based on available positions
  const getCenterCoordinates = useCallback((): [number, number] => {
    if (mode === 'driver' && driverGpsState?.lat && driverGpsState?.lng) {
      return [driverGpsState.lat, driverGpsState.lng];
    }
    if (activeRide?.driverLocation?.lat && activeRide?.driverLocation?.lng) {
      return [activeRide.driverLocation.lat, activeRide.driverLocation.lng];
    }
    if (userGpsState?.lat && userGpsState?.lng) {
      return [userGpsState.lat, userGpsState.lng];
    }
    if (pickup?.lat && pickup?.lng) {
      return [pickup.lat, pickup.lng];
    }
    return [22.5804, 88.4378]; // Default city hub (Salt Lake Sector V, Kolkata)
  }, [mode, driverGpsState, activeRide, userGpsState, pickup]);

  // Stale GPS detection (> 15 seconds)
  useEffect(() => {
    const checkStale = () => {
      const ts = mode === 'driver' 
        ? driverGpsState?.timestamp 
        : (activeRide?.driverLocation?.timestamp || userGpsState?.timestamp);
      if (ts && Date.now() - ts > 15000) {
        setIsStaleGps(true);
      } else {
        setIsStaleGps(false);
      }
    };
    const interval = setInterval(checkStale, 3000);
    checkStale();
    return () => clearInterval(interval);
  }, [mode, driverGpsState, activeRide?.driverLocation, userGpsState]);

  // Determine Navigation Routing endpoints based on Rapido State Machine
  const calculateNavigationEndpoints = useCallback(() => {
    const driverPos = (driverGpsState?.lat && driverGpsState?.lng)
      ? { lat: driverGpsState.lat, lng: driverGpsState.lng }
      : (activeRide?.driverLocation?.lat && activeRide?.driverLocation?.lng)
      ? { lat: activeRide.driverLocation.lat, lng: activeRide.driverLocation.lng }
      : null;

    // 1. If Captain is assigned or arriving: Route from Captain -> Pickup point
    if (
      activeRide && 
      (activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arriving') &&
      driverPos &&
      pickup?.lat && pickup?.lng
    ) {
      return {
        start: driverPos,
        end: { lat: pickup.lat, lng: pickup.lng },
        type: 'captain_to_pickup' as const,
        label: 'Captain Arriving'
      };
    }

    // 2. If Ride is in progress: Route from Captain -> Drop-off point
    if (
      activeRide &&
      activeRide.status === 'in_progress' &&
      driverPos &&
      dropoff?.lat && dropoff?.lng
    ) {
      return {
        start: driverPos,
        end: { lat: dropoff.lat, lng: dropoff.lng },
        type: 'pickup_to_destination' as const,
        label: 'En Route to Destination'
      };
    }

    // 3. Normal / Booking preview mode: Route from Pickup -> Drop-off
    if (pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng) {
      return {
        start: { lat: pickup.lat, lng: pickup.lng },
        end: { lat: dropoff.lat, lng: dropoff.lng },
        type: 'standard_trip' as const,
        label: 'Trip Route'
      };
    }

    return null;
  }, [activeRide?.status, activeRide?.driverLocation, driverGpsState, pickup, dropoff]);

  // Load and update road polyline route
  const refreshRoute = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRouteFetchTimeRef.current < 4000) {
      return;
    }
    lastRouteFetchTimeRef.current = now;

    const nav = calculateNavigationEndpoints();
    if (!nav) {
      setLiveRoadCoords([]);
      setNavSummary(null);
      return;
    }

    try {
      const route = await fetchRouteBetweenPoints(nav.start, nav.end);
      if (route && route.coordinates && route.coordinates.length > 0) {
        setLiveRoadCoords(route.coordinates);
        const distanceKm = route.distanceKm;
        const etaMins = route.durationMins;
        setNavSummary({ distanceKm, etaMins, label: nav.label });
      }
    } catch {
      // Fallback: draw direct straight coordinates if routing server is slow
      setLiveRoadCoords([[nav.start.lat, nav.start.lng], [nav.end.lat, nav.end.lng]]);
    }
  }, [calculateNavigationEndpoints]);

  // Effect to load route when ride status or endpoints change
  useEffect(() => {
    refreshRoute(true);
  }, [activeRide?.status, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, refreshRoute]);

  // Automatic Off-Route Recalculation (> 65m deviation)
  useEffect(() => {
    if (!activeRide || (activeRide.status !== 'driver_assigned' && activeRide.status !== 'in_progress')) {
      return;
    }
    const currentLoc = driverGpsState?.lat && driverGpsState?.lng
      ? { lat: driverGpsState.lat, lng: driverGpsState.lng }
      : activeRide?.driverLocation
      ? { lat: activeRide.driverLocation.lat, lng: activeRide.driverLocation.lng }
      : null;

    if (currentLoc && liveRoadCoords.length > 2) {
      const devDistance = minDistanceToPolylineMeters(currentLoc, liveRoadCoords);
      if (devDistance > 65) {
        // Driver is off the previous route by > 65m -> Recalculate road route from current position!
        refreshRoute(true);
      }
    }
  }, [driverGpsState?.lat, driverGpsState?.lng, activeRide?.driverLocation?.lat, activeRide?.driverLocation?.lng, activeRide?.status, liveRoadCoords, refreshRoute]);

  // Helper to verify Leaflet map pane and container validity before performing operations
  const isMapValid = useCallback((m: L.Map | null): boolean => {
    if (!m || !mapContainerRef.current || !mapContainerRef.current.isConnected) return false;
    const mapPane = (m as any)._mapPane;
    if (!mapPane) return false;
    if (!mapPane._leaflet_pos) {
      try {
        L.DomUtil.setPosition(mapPane, new L.Point(0, 0));
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = getCenterCoordinates();

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: false,
      zoomAnimation: true,
    });

    if ((map as any)._mapPane && !(map as any)._mapPane._leaflet_pos) {
      L.DomUtil.setPosition((map as any)._mapPane, new L.Point(0, 0));
    }

    const initialConfig = getTileLayerConfig('voyager');
    L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);

    const staticGroup = L.layerGroup().addTo(map);
    const driverGroup = L.layerGroup().addTo(map);
    staticMarkersGroupRef.current = staticGroup;
    activeDriverLayerRef.current = driverGroup;
    mapInstanceRef.current = map;

    // Handle user tapping on map to select or adjust location
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectLocation) {
        const targetType = dropoff ? 'pickup' : 'dropoff';
        const point: GeoPoint = {
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
          name: `Pinned ${targetType === 'pickup' ? 'Pickup' : 'Drop-off'} (${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`,
          address: `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`,
          zone: 'Map Pin'
        };
        onSelectLocation(point, targetType);
      }
    });

    // Disable auto-follow when user manually drags or touches the map
    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (isMapValid(mapInstanceRef.current)) {
        try {
          mapInstanceRef.current!.invalidateSize();
        } catch {}
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      if (captainAnimFrameRef.current) {
        cancelAnimationFrame(captainAnimFrameRef.current);
      }
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {}
      }
      mapInstanceRef.current = null;
      staticMarkersGroupRef.current = null;
      activeDriverLayerRef.current = null;
      captainMarkerRef.current = null;
      nearbyMarkersMapRef.current.clear();
    };
  }, []);

  // Update map layer tiles when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isMapValid(map)) return;

    try {
      map!.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          layer.remove();
        }
      });

      const config = getTileLayerConfig(mapStyle);
      L.tileLayer(config.url, config.options).addTo(map!);
    } catch {}
  }, [mapStyle, isMapValid]);

  // Invalidate map size when full-screen mode toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMapValid(mapInstanceRef.current)) {
        try {
          mapInstanceRef.current!.invalidateSize();
        } catch {}
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullScreen, isMapValid]);

  // -----------------------------------------------------------------------------
  // RAPIDO-STYLE SMOOTH CAPTAIN MARKER INTERPOLATION & HEADING ROTATION
  // -----------------------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    const driverGroup = activeDriverLayerRef.current;
    if (!map || !driverGroup) return;

    const targetLat = driverGpsState?.lat || activeRide?.driverLocation?.lat;
    const targetLng = driverGpsState?.lng || activeRide?.driverLocation?.lng;
    const targetHeading = driverGpsState?.heading ?? activeRide?.driverLocation?.heading ?? 0;

    if (!targetLat || !targetLng) {
      if (captainMarkerRef.current) {
        captainMarkerRef.current.remove();
        captainMarkerRef.current = null;
        captainCurrentStateRef.current = null;
      }
      return;
    }

    const isAssigned = !!(activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled');
    const driverLabel = mode === 'driver' ? 'YOU (DRIVER)' : (activeRide?.driverName ? activeRide.driverName.split(' ')[0] : 'Toto Captain');

    // Create marker if it does not yet exist
    if (!captainMarkerRef.current) {
      const initialIconHtml = createTotoSvgIcon(targetHeading, true, driverLabel, isAssigned, 'captain');
      const icon = L.divIcon({
        html: initialIconHtml,
        className: 'custom-captain-toto-marker',
        iconSize: [0, 0],
      });

      const marker = L.marker([targetLat, targetLng], { icon, zIndexOffset: 1000 }).addTo(driverGroup);
      marker.bindTooltip(
        `<b>${activeRide?.driverName || 'Toto Captain'}</b><br/>${activeRide?.vehicleModel || 'E-Rickshaw'} · ${activeRide?.vehicleNumber || 'WB-08-2048'}`,
        { direction: 'top', offset: [0, -24] }
      );
      captainMarkerRef.current = marker;
      captainCurrentStateRef.current = { lat: targetLat, lng: targetLng, heading: targetHeading };
      return;
    }

    // Smoothly Interpolate marker position & rotation using requestAnimationFrame
    const startPos = captainCurrentStateRef.current || { lat: targetLat, lng: targetLng, heading: targetHeading };
    const marker = captainMarkerRef.current;

    if (captainAnimFrameRef.current) {
      cancelAnimationFrame(captainAnimFrameRef.current);
    }

    const startTime = performance.now();
    const duration = 900; // 900ms smooth gliding duration between 1s GPS updates
    const angleDelta = getShortestAngleDelta(targetHeading, startPos.heading);

    const animateGlide = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const curLat = startPos.lat + (targetLat - startPos.lat) * ease;
      const curLng = startPos.lng + (targetLng - startPos.lng) * ease;
      const curHeading = startPos.heading + angleDelta * ease;

      marker.setLatLng([curLat, curLng]);
      captainCurrentStateRef.current = { lat: curLat, lng: curLng, heading: curHeading };

      // Rotate inner SVG element directly in DOM for 60fps buttery smoothness
      const el = marker.getElement();
      if (el) {
        const rotator = el.querySelector('.vehicle-rotator') as HTMLElement | null;
        if (rotator) {
          rotator.style.transform = `rotate(${curHeading}deg)`;
        }
      }

      if (progress < 1) {
        captainAnimFrameRef.current = requestAnimationFrame(animateGlide);
      }
    };

    captainAnimFrameRef.current = requestAnimationFrame(animateGlide);

    return () => {
      if (captainAnimFrameRef.current) {
        cancelAnimationFrame(captainAnimFrameRef.current);
      }
    };
  }, [
    driverGpsState?.lat,
    driverGpsState?.lng,
    driverGpsState?.heading,
    activeRide?.driverLocation?.lat,
    activeRide?.driverLocation?.lng,
    activeRide?.driverLocation?.heading,
    activeRide?.status,
    activeRide?.driverName,
    mode
  ]);

  // -----------------------------------------------------------------------------
  // STATIC MARKERS, PASSENGER PIN, DESTINATION, AND ROUTE POLYLINES
  // -----------------------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    const staticGroup = staticMarkersGroupRef.current;
    if (!map || !staticGroup) return;

    // Clear static elements
    staticGroup.clearLayers();
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (bgRouteLayerRef.current) {
      bgRouteLayerRef.current.remove();
      bgRouteLayerRef.current = null;
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }
    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.remove();
      geofenceCircleRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // 1. Passenger / Pickup GPS Marker
    const userLat = userGpsState?.lat || pickup?.lat;
    const userLng = userGpsState?.lng || pickup?.lng;

    if (userLat && userLng) {
      const userLatLng = L.latLng(userLat, userLng);
      bounds.extend(userLatLng);

      // Accuracy ring if real GPS
      if (userGpsState?.accuracy && userGpsState.accuracy < 200) {
        const circle = L.circle(userLatLng, {
          radius: userGpsState.accuracy,
          color: '#FF6B2C',
          fillColor: '#FF6B2C',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '4, 4'
        }).addTo(staticGroup);
        accuracyCircleRef.current = circle;
      }

      // Pickup Arrival Geofence Indicator (120m)
      if (activeRide?.status === 'driver_assigned' || activeRide?.status === 'driver_arriving' || activeRide?.status === 'driver_arrived') {
        const geoCircle = L.circle(userLatLng, {
          radius: 120,
          color: activeRide.status === 'driver_arrived' ? '#10B981' : '#FF6B2C',
          fillColor: activeRide.status === 'driver_arrived' ? '#10B981' : '#FF6B2C',
          fillOpacity: activeRide.status === 'driver_arrived' ? 0.22 : 0.08,
          weight: 1.5,
          dashArray: '5, 5'
        }).addTo(staticGroup);
        geofenceCircleRef.current = geoCircle;
      }

      const userIconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
          <div class="absolute w-12 h-12 rounded-full bg-orange-500/20 animate-pulse pointer-events-none"></div>
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF6B2C] to-[#FFA066] text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-orange-500/30">
            <svg class="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
            </svg>
          </div>
          <div class="absolute -bottom-5 bg-[#181818] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-white/20 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>${mode === 'user' ? 'YOU (PICKUP)' : 'Pickup Spot'}</span>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'custom-user-gps-marker',
        iconSize: [0, 0],
      });

      const userMarker = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 800 }).addTo(staticGroup);
      userMarker.bindTooltip(
        `<b>${pickup?.name || userGpsState?.name || 'Pickup Point'}</b><br/><span style="font-size:10px; color:#666;">${userGpsState?.address || ''}</span>`,
        { direction: 'top', offset: [0, -20] }
      );
    }

    // 2. Drop-off Destination Marker
    if (dropoff?.lat && dropoff?.lng) {
      const dropLatLng = L.latLng(dropoff.lat, dropoff.lng);
      bounds.extend(dropLatLng);

      const dropIconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
          <div class="w-8 h-8 rounded-full bg-[#181818] text-white flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </div>
          <div class="absolute -bottom-5 bg-white text-[#181818] text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-[#EDE8E0]">
            ${dropoff.name ? dropoff.name.slice(0, 18) : 'Destination'}
          </div>
        </div>
      `;

      const dropIcon = L.divIcon({
        html: dropIconHtml,
        className: 'custom-dropoff-marker',
        iconSize: [0, 0],
      });

      const dropMarker = L.marker(dropLatLng, { icon: dropIcon, zIndexOffset: 700 }).addTo(staticGroup);
      dropMarker.bindTooltip(`<b>Drop-off:</b> ${dropoff.name}<br/>${dropoff.address}`, {
        direction: 'top',
        offset: [0, -18],
      });
    }

    // 3. Nearby Available Drivers on Map (when not currently in active ride)
    if ((!activeRide || activeRide.status === 'idle' || activeRide.status === 'searching') && drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        if (activeRide?.driverId && d.id === activeRide.driverId) return;

        const dLatLng = L.latLng(d.lat, d.lng);
        const heading = d.heading || 0;
        const iconHtml = createTotoSvgIcon(heading, d.isAvailable, d.name.split(' ')[0], false, d.id);

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-nearby-toto-marker',
          iconSize: [0, 0],
        });

        const m = L.marker(dLatLng, { icon, zIndexOffset: 500 }).addTo(staticGroup);
        m.bindTooltip(
          `<b>${d.name}</b><br/>${d.vehicleNumber} · ${d.rating ? `★ ${d.rating}` : 'Available'}`,
          { direction: 'top', offset: [0, -18] }
        );
      });
    }

    // 4. Connect Real Road Route Polyline
    if (liveRoadCoords.length > 1) {
      const isCaptainArriving = activeRide?.status === 'driver_assigned' || activeRide?.status === 'driver_arriving';
      const routeColor = isCaptainArriving ? '#10B981' : '#FF6B2C';

      // White outline glow for readability on any map layer
      const bgLine = L.polyline(liveRoadCoords, {
        color: '#FFFFFF',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(staticGroup);
      bgRouteLayerRef.current = bgLine;

      // Primary colored road path
      const mainLine = L.polyline(liveRoadCoords, {
        color: routeColor,
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isCaptainArriving ? '6, 8' : undefined,
      }).addTo(staticGroup);
      routeLayerRef.current = mainLine;

      // Extend bounds to include whole route
      liveRoadCoords.forEach((pt) => {
        bounds.extend(L.latLng(pt[0], pt[1]));
      });
    }

    // Extend bounds to include Captain
    const cLat = driverGpsState?.lat || activeRide?.driverLocation?.lat;
    const cLng = driverGpsState?.lng || activeRide?.driverLocation?.lng;
    if (cLat && cLng) {
      bounds.extend(L.latLng(cLat, cLng));
    }

    // Camera Auto-Follow & Auto-Fit Bounds
    if (autoFollow && isMapValid(map)) {
      try {
        if (bounds.isValid() && bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 100) {
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
        } else {
          const center = getCenterCoordinates();
          map.panTo(center, { animate: true });
        }
      } catch {}
    }
  }, [
    pickup,
    dropoff,
    activeRide,
    drivers,
    mode,
    userGpsState,
    driverGpsState,
    autoFollow,
    liveRoadCoords,
    getCenterCoordinates,
    isMapValid
  ]);

  // Recenter Action handler
  const handleRecenter = () => {
    setAutoFollow(true);
    const map = mapInstanceRef.current;
    if (isMapValid(map)) {
      const center = getCenterCoordinates();
      try {
        map!.flyTo(center, 16, { animate: true, duration: 1 });
      } catch {}
    }
    if (onCenterGps) {
      onCenterGps();
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    const map = mapInstanceRef.current;
    if (isMapValid(map)) {
      try {
        map!.zoomIn();
      } catch {}
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    const map = mapInstanceRef.current;
    if (isMapValid(map)) {
      try {
        map!.zoomOut();
      } catch {}
    }
  };

  const currentSpeed = mode === 'driver' ? driverGpsState?.speedKmH || 0 : userGpsState?.speedKmH || 0;

  return (
    <div 
      id="interactive-map-container"
      className={
        isFullScreen
          ? "fixed inset-0 w-full h-full z-0 overflow-hidden select-none border-0 rounded-none shadow-none transition-all"
          : edgeToEdgeTop
          ? `relative w-full ${heightClass} bg-[#EFEAE2] rounded-none overflow-hidden select-none border-0 shadow-none transition-all`
          : `relative w-full ${heightClass} bg-[#EFEAE2] rounded-3xl overflow-hidden select-none border border-[#E5DFD4] shadow-xs transition-all`
      }
    >
      {/* Real Leaflet Map Viewport */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0 z-0" 
        style={{ background: '#FAF8F5' }}
      />

      {/* Overlaid children (e.g. Search Bar) */}
      {children}

      {/* Top Floating Navigation ETA & Speed HUD - hidden in passenger app */}
      {mode !== 'user' && (
        <div 
          className={`absolute ${edgeToEdgeTop ? 'top-[calc(68px+env(safe-area-inset-top,0px))]' : 'top-3'} left-3 z-10 flex flex-wrap items-center gap-2 max-w-[85%]`}
        >
          {/* Speedometer Badge */}
          {currentSpeed > 0 && (
            <div className="px-2.5 py-1 bg-[#181818] text-white rounded-full text-[11px] font-bold shadow-sm flex items-center gap-1 font-mono animate-in fade-in">
              <Zap className="w-3 h-3 text-[#FF6B2C] fill-[#FF6B2C]" />
              <span>{currentSpeed} km/h</span>
            </div>
          )}

          {/* Live Navigation ETA Badge */}
          {navSummary && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-md text-[#181818] rounded-full text-xs font-bold shadow-md border border-[#EDE8E0] animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{navSummary.label}:</span>
              <span className="text-[#FF6B2C] font-extrabold">{navSummary.etaMins} mins</span>
              <span className="text-gray-400">({navSummary.distanceKm} km)</span>
            </div>
          )}

          {/* Stale GPS Signal warning badge */}
          {isStaleGps && (
            <div className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Locating Captain...</span>
            </div>
          )}

          {/* Network offline reconnect indicator */}
          {isOffline && (
            <div className="px-2.5 py-1 bg-red-600 text-white rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 animate-pulse">
              <WifiOff className="w-3 h-3" />
              <span>Offline • Reconnecting GPS...</span>
            </div>
          )}
        </div>
      )}

      {/* Prominent Floating "Recenter" button when user moved map - hidden in passenger app */}
      {mode !== 'user' && !autoFollow && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            id="map-recenter-floating-btn"
            onClick={handleRecenter}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-orange-50 text-[#181818] font-bold text-xs rounded-full shadow-xl border border-orange-300 ring-2 ring-orange-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#FF6B2C] animate-spin" style={{ animationDuration: '4s' }} />
            <span>Recenter View</span>
          </button>
        </div>
      )}

      {/* Controls: Recenter + Zoom + Tile Style - hidden in passenger app */}
      {mode !== 'user' && (
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
          {/* Recenter / GPS Button */}
          <button
            type="button"
            id="map-gps-btn"
            onClick={handleRecenter}
            className={`w-10 h-10 rounded-full bg-white shadow-md border border-[#E5DFD4] flex items-center justify-center transition-all cursor-pointer ${
              autoFollow ? 'text-[#FF6B2C] ring-2 ring-orange-500/30' : 'text-gray-700 hover:bg-orange-50'
            }`}
            title="Pan to My GPS Location"
          >
            <Navigation className={`w-4 h-4 -rotate-45 ${autoFollow ? 'fill-[#FF6B2C] text-[#FF6B2C]' : 'text-gray-700'}`} />
          </button>

          {/* Map Tile Style Toggle (Voyager / Positron / OSM) */}
          <button
            type="button"
            id="map-style-toggle-btn"
            onClick={() => setMapStyle((prev) => (prev === 'voyager' ? 'positron' : prev === 'positron' ? 'osm' : 'voyager'))}
            className="w-10 h-10 rounded-full bg-white text-[#181818] shadow-md border border-[#E5DFD4] flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all cursor-pointer"
            title={`Toggle Map Style (Current: ${mapStyle.toUpperCase()})`}
          >
            <Layers className="w-4 h-4 text-gray-700" />
          </button>

          {/* Zoom In/Out Controls */}
          <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#E5DFD4] overflow-hidden">
            <button
              type="button"
              id="map-zoom-in-btn"
              onClick={handleZoomIn}
              className="w-10 h-8 flex items-center justify-center text-[#181818] hover:bg-gray-100 active:bg-gray-200 transition-colors border-b border-[#EDE8E0] cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="map-zoom-out-btn"
              onClick={handleZoomOut}
              className="w-10 h-8 flex items-center justify-center text-[#181818] hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
