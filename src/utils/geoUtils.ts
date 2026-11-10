import { GeoPoint, RouteDetails, DriverMarker } from '../types';

export function calculateDistanceKm(p1: GeoPoint | { lat: number; lng: number }, p2: GeoPoint | { lat: number; lng: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDist = R * c;
  // Apply road curvature multiplier
  const roadDist = Math.max(0.6, Number((rawDist * 1.25).toFixed(2)));
  return roadDist;
}

export function calculateEstimatedMinutes(distanceKm: number, vehicleType: string): number {
  let minsPerKm = 3.2;
  let baseWait = 2;
  if (vehicleType === 'bike') {
    minsPerKm = 2.2;
    baseWait = 1;
  } else if (vehicleType === 'auto') {
    minsPerKm = 2.5;
    baseWait = 2;
  } else if (vehicleType === 'toto_express') {
    minsPerKm = 2.8;
    baseWait = 1;
  }
  return Math.max(2, Math.round(distanceKm * minsPerKm + baseWait));
}

export function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const geocodeCache = new Map<string, { name: string; address: string; zone?: string }>();

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim with fast fallback & in-memory cache
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{ name: string; address: string; zone?: string }> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { 
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addressParts = data.address || {};
        const road = addressParts.road || addressParts.pedestrian || addressParts.suburb || addressParts.neighbourhood || addressParts.quarter || 'Current Location';
        const city = addressParts.city || addressParts.town || addressParts.village || addressParts.state_district || 'City Area';
        const suburb = addressParts.suburb || addressParts.neighbourhood || '';
        
        const result = {
          name: suburb ? `${road}, ${suburb}` : road,
          address: data.display_name.split(',').slice(0, 4).join(',').trim(),
          zone: city
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.debug('Reverse geocode error or timeout:', err);
  }
  
  const fallback = {
    name: `Live Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
    address: `Kolkata Metro Transit Hub (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    zone: 'Transit Area'
  };
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Fetch real-road routing polyline and metrics
 */
export async function fetchRouteBetweenPoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteDetails> {
  // First try backend proxy /api/route for reliability & caching
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `/api/route?startLat=${start.lat}&startLng=${start.lng}&endLat=${end.lat}&endLng=${end.lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.coordinates && Array.isArray(data.coordinates) && data.coordinates.length > 0) {
        return {
          coordinates: data.coordinates,
          distanceKm: data.distanceKm,
          durationMins: data.durationMins,
          summary: `${data.distanceKm} km · ${data.durationMins} min`
        };
      }
    }
  } catch {
    // Attempt direct OSRM fallback
  }

  // Direct client OSRM attempt
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const durationMins = Math.max(1, Math.round(route.duration / 60));

        return {
          coordinates,
          distanceKm,
          durationMins,
          summary: `${distanceKm} km · ${durationMins} min`
        };
      }
    }
  } catch {
    // Generate curved roadway geometry fallback
  }

  // High-fidelity fallback curve route if online router is unreachable
  const points: [number, number][] = [];
  const steps = 16;
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const perpLat = -dLng * 0.08;
  const perpLng = dLat * 0.08;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * (i % 2 === 0 ? 1 : 0.85);
    const lat = start.lat + dLat * t + perpLat * curve;
    const lng = start.lng + dLng * t + perpLng * curve;
    points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }

  const directDist = Math.hypot(dLat, dLng) * 111;
  const roadDistanceKm = Number(Math.max(0.5, directDist * 1.25).toFixed(1));
  const estMinutes = Math.max(2, Math.round(roadDistanceKm * 3.2));

  return {
    coordinates: points,
    distanceKm: roadDistanceKm,
    durationMins: estMinutes,
    summary: `${roadDistanceKm} km · ${estMinutes} min`
  };
}

/**
 * Filter out stale driver locations (e.g. older than 10 minutes)
 */
export function isDriverLocationFresh(lastUpdate?: number | string | null, maxMinutes = 10): boolean {
  if (!lastUpdate) return true; // Default fallback drivers
  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate).getTime() : lastUpdate;
  if (isNaN(updateTime)) return true;
  return Date.now() - updateTime < maxMinutes * 60 * 1000;
}

/**
 * Filter available drivers by proximity and active status
 */
export function filterNearbyAvailableDrivers(
  drivers: DriverMarker[],
  center: { lat: number; lng: number },
  maxRadiusKm = 6
): (DriverMarker & { distanceKm: number })[] {
  return drivers
    .filter((d) => d.isAvailable && isDriverLocationFresh(d.lastUpdated))
    .map((d) => ({
      ...d,
      distanceKm: calculateDistanceKm(center, { lat: d.lat, lng: d.lng })
    }))
    .filter((d) => d.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Smoothly interpolate coordinates for vehicle movement animation
 */
export function interpolatePosition(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  fraction: number
): { lat: number; lng: number } {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * fraction,
    lng: p1.lng + (p2.lng - p1.lng) * fraction
  };
}

/**
 * Search places online across India using OpenStreetMap Nominatim with fast timeout and fallback
 */
export async function searchPlacesOnline(query: string, userLat?: number, userLng?: number): Promise<GeoPoint[]> {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // Bias towards user's current city/region without strictly restricting (bounded=0)
    let viewboxParam = '';
    if (userLat && userLng) {
      const offset = 0.8;
      viewboxParam = `&viewbox=${userLng - offset},${userLat + offset},${userLng + offset},${userLat - offset}&bounded=0`;
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&limit=10&addressdetails=1${viewboxParam}`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          const addr = item.address || {};
          const name = item.name || item.display_name.split(',')[0].trim();
          const road = addr.road || addr.suburb || addr.neighbourhood || '';
          const city = addr.city || addr.town || addr.state_district || addr.state || 'India';
          const fullAddress = item.display_name.split(',').slice(0, 4).join(',').trim();

          return {
            name: name,
            address: fullAddress,
            landmark: road ? `Near ${road}` : undefined,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            zone: city || item.type || 'India'
          };
        });
      }
    }
  } catch (err) {
    console.debug('Search places online error or timeout:', err);
  }

  return [];
}

