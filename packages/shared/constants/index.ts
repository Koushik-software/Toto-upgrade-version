/**
 * TOTO DRIVE — SHARED SYSTEM CONSTANTS
 * Defines core municipal operational bounds, default pricing tariffs, and ride states.
 */

export const TOTO_PLATFORM_CONFIG = {
  APP_NAME: 'TOTO Drive',
  DEFAULT_CITY: 'Kolkata',
  REGION: 'West Bengal, India',
  MUNICIPALITY_ZONES: [
    'Salt Lake Sector V',
    'New Town Action Area I',
    'New Town Action Area II',
    'Ultadanga / Bidhannagar',
    'Kestopur / VIP Road',
    'Dum Dum Cantonment',
    'Howrah Station Hub'
  ],
  BASE_FARE: 20,
  PER_KM_RATE: 12,
  SURGE_MULTIPLIER_MAX: 2.5,
  GEOFENCE_ARRIVAL_METERS: 120,
  OTP_LENGTH: 4,
  COMMISSION_PERCENTAGE: 10,
  CAPTAIN_EARNING_PERCENTAGE: 90
} as const;
