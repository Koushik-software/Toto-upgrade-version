import { useState, useEffect, useRef, useCallback } from 'react';
import { GpsLocationState, GeoPoint } from '../types';
import { reverseGeocodeCoords, calculateBearing } from '../utils/geoUtils';

interface UseMobileGpsOptions {
  autoStart?: boolean;
  enableHighAccuracy?: boolean;
  onLocationUpdate?: (point: GeoPoint, state: GpsLocationState) => void;
  fallbackPoint?: GeoPoint;
}

const DEFAULT_FALLBACK_POINT: GeoPoint = {
  lat: 22.5804,
  lng: 88.4378,
  name: 'Salt Lake Sector V',
  address: 'Bidhannagar, Kolkata, West Bengal',
  zone: 'Transit Hub'
};

export function useMobileGps(options: UseMobileGpsOptions = {}) {
  const {
    autoStart = true,
    enableHighAccuracy = true,
    onLocationUpdate,
    fallbackPoint = DEFAULT_FALLBACK_POINT
  } = options;

  const [gpsState, setGpsState] = useState<GpsLocationState>(() => ({
    lat: fallbackPoint.lat,
    lng: fallbackPoint.lng,
    accuracy: 12,
    altitude: 15,
    altitudeAccuracy: null,
    heading: 45,
    speed: 0,
    speedKmH: 0,
    timestamp: Date.now(),
    address: fallbackPoint.address,
    name: fallbackPoint.name,
    isWatching: false,
    error: null,
  }));

  const [hasRealGpsFix, setHasRealGpsFix] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  
  const watchIdRef = useRef<number | null>(null);
  const lastGeocodeCoordsRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastNotifiedCoordsRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const onLocationUpdateRef = useRef(onLocationUpdate);
  onLocationUpdateRef.current = onLocationUpdate;

  const currentAddressRef = useRef(fallbackPoint.address);
  const currentNameRef = useRef(fallbackPoint.name);
  const wakeLockRef = useRef<any>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const acquireWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {}
  }, []);

  // Online / Offline reconnect listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshCurrentLocation();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check Permissions API if available
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setPermissionStatus(status.state);
          status.onchange = () => setPermissionStatus(status.state);
        })
        .catch(() => {
          // Permissions API query not supported for geolocation in some browsers
        });
    } else if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
    }
  }, []);

  const handlePositionSuccess = useCallback(async (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading, speed, altitude, altitudeAccuracy } = pos.coords;
    
    let computedHeading = heading;
    if (computedHeading === null && prevCoordsRef.current) {
      computedHeading = calculateBearing(
        prevCoordsRef.current.lat,
        prevCoordsRef.current.lng,
        latitude,
        longitude
      );
    }
    prevCoordsRef.current = { lat: latitude, lng: longitude };

    const speedKmH = speed !== null ? Math.round(speed * 3.6) : 0;
    
    // Check if we should reverse geocode (if moved > 0.0004 deg ~ 45m from last geocoded point)
    const distDiff = Math.hypot(
      latitude - lastGeocodeCoordsRef.current.lat,
      longitude - lastGeocodeCoordsRef.current.lng
    );

    let address = currentAddressRef.current;
    let name = currentNameRef.current;

    if (distDiff > 0.0004 || !lastGeocodeCoordsRef.current.lat) {
      lastGeocodeCoordsRef.current = { lat: latitude, lng: longitude };
      try {
        const geoInfo = await reverseGeocodeCoords(latitude, longitude);
        address = geoInfo.address;
        name = geoInfo.name;
        currentAddressRef.current = address;
        currentNameRef.current = name;
      } catch (e) {
        console.debug('Geocode fallback error:', e);
      }
    }

    const updatedState: GpsLocationState = {
      lat: latitude,
      lng: longitude,
      accuracy: Math.round(accuracy),
      altitude,
      altitudeAccuracy,
      heading: computedHeading,
      speed,
      speedKmH,
      timestamp: pos.timestamp || Date.now(),
      address,
      name,
      isWatching: true,
      error: null,
    };

    setGpsState(updatedState);
    setHasRealGpsFix(true);
    setIsLocating(false);

    // Only notify listener if coordinates moved by at least 0.00005 (~5m) or first time
    const notifyDiff = Math.hypot(
      latitude - lastNotifiedCoordsRef.current.lat,
      longitude - lastNotifiedCoordsRef.current.lng
    );

    if (notifyDiff > 0.00005 || !lastNotifiedCoordsRef.current.lat) {
      lastNotifiedCoordsRef.current = { lat: latitude, lng: longitude };
      if (onLocationUpdateRef.current) {
        const point: GeoPoint = {
          lat: latitude,
          lng: longitude,
          name: name || `Live GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          address: address || `Live GPS Location`,
          zone: 'Real-time GPS'
        };
        onLocationUpdateRef.current(point, updatedState);
      }
    }
  }, []);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    setIsLocating(false);
    let errorMessage = 'Unable to retrieve location';
    if (err.code === 1) {
      errorMessage = 'Location permission denied. Please allow location access in your browser/device settings.';
      setPermissionStatus('denied');
    } else if (err.code === 2) {
      errorMessage = 'GPS position unavailable. Using nearest network location.';
    } else if (err.code === 3) {
      errorMessage = 'GPS request timed out. Retrying with cached fix.';
    }

    setGpsState((prev) => ({
      ...prev,
      error: errorMessage,
      isWatching: watchIdRef.current !== null,
    }));
  }, []);

  const startWatchingGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
      }));
      return;
    }

    setIsLocating(true);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const watchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy,
        timeout: 15000,
        maximumAge: 3000,
      }
    );

    watchIdRef.current = watchId;
    setGpsState((prev) => ({ ...prev, isWatching: true, error: null }));
    acquireWakeLock();
  }, [enableHighAccuracy, handlePositionSuccess, handlePositionError, acquireWakeLock]);

  const stopWatchingGps = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    setGpsState((prev) => ({ ...prev, isWatching: false }));
  }, [releaseWakeLock]);

  const refreshCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handlePositionSuccess, handlePositionError]);

  // Set manual coordinates (for testing / simulated routes)
  const setManualLocation = useCallback(async (lat: number, lng: number, name?: string, address?: string) => {
    let finalName = name;
    let finalAddress = address;
    if (!finalName || !finalAddress) {
      const info = await reverseGeocodeCoords(lat, lng);
      finalName = info.name;
      finalAddress = info.address;
    }

    currentAddressRef.current = finalAddress;
    currentNameRef.current = finalName;

    const updatedState: GpsLocationState = {
      lat,
      lng,
      accuracy: 8,
      heading: 90,
      speed: 0,
      speedKmH: 0,
      timestamp: Date.now(),
      address: finalAddress,
      name: finalName,
      isWatching: true,
      error: null
    };

    setGpsState(updatedState);
    setHasRealGpsFix(true);

    if (onLocationUpdateRef.current) {
      onLocationUpdateRef.current(
        {
          lat,
          lng,
          name: finalName,
          address: finalAddress,
          zone: 'Manual GPS'
        },
        updatedState
      );
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startWatchingGps();
    }
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [autoStart, startWatchingGps]);

  return {
    gpsState,
    hasRealGpsFix,
    isLocating,
    permissionStatus,
    isOnline,
    startWatchingGps,
    stopWatchingGps,
    refreshCurrentLocation,
    setManualLocation,
  };
}
