export type AppRole = 'user' | 'driver' | 'admin';

export type RideStatus = 
  | 'idle'
  | 'searching'
  | 'SEARCHING_DRIVER'
  | 'driver_assigned'
  | 'DRIVER_ASSIGNED'
  | 'driver_accepted'
  | 'DRIVER_ACCEPTED'
  | 'driver_arriving'
  | 'DRIVER_ARRIVING'
  | 'driver_arrived'
  | 'DRIVER_ARRIVED'
  | 'in_progress'
  | 'RIDE_STARTED'
  | 'RIDE_IN_PROGRESS'
  | 'completed'
  | 'RIDE_COMPLETED'
  | 'cancelled'
  | 'CUSTOMER_CANCELLED'
  | 'DRIVER_CANCELLED'
  | 'no_driver_accepted'
  | 'NO_DRIVER_ACCEPTED'
  | 'expired';

export interface GeoPoint {
  lat: number;
  lng: number;
  address: string;
  name: string;
  landmark?: string;
  zone?: string;
}

export interface RouteDetails {
  coordinates: [number, number][];
  distanceKm: number;
  durationMins: number;
  summary?: string;
}

export interface VehicleOption {
  id: 'toto' | 'bike' | 'toto_express' | 'auto';
  name: string;
  tagline: string;
  iconType: 'toto' | 'bike' | 'auto' | 'express';
  capacity: string;
  etaMins: number;
  baseFare: number;
  perKmRate: number;
  ecoFriendly?: boolean;
  badge?: string;
  description: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  totalRides: number;
  savedPlaces?: {
    home?: GeoPoint;
    work?: GeoPoint;
  };
  walletBalance: number;
  avatarUrl: string;
  createdAt?: string;
  status?: 'active' | 'blocked';
  notes?: string;
  upiId?: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'toto' | 'bike' | 'auto';
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColor?: string;
  pin?: string; // 4-digit security PIN for one-time driver login
  accessPin?: string; // PIN alias for fleet table
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  registeredAt?: string;
  approvedAt?: string;
  rating: number;
  totalTrips: number;
  totalRides?: number; // Trips alias
  todayRides?: number;
  batteryPercentage: number;
  todayEarnings: number;
  totalEarnings?: number;
  acceptanceRate: number;
  isOnline: boolean;
  avatarUrl: string;
  photoUrl?: string; // Photo alias
  driverPhoto?: string;
  totoPhoto?: string;
  totoPhotos?: string[];
  kycVerified: boolean;
  currentLat?: number;
  currentLng?: number;
  heading?: number;
  locationAccuracy?: number;
  lastLocationUpdate?: number | string;
  availabilityStatus?: 'available' | 'busy' | 'offline' | 'online' | 'inactive';
  currentRideId?: string | null;
  upiId?: string; // Driver personal UPI VPA (e.g. 9830145289@paytm or captain@okhdfcbank)
  updatedAt?: string;
}

export interface DriverApprovalRequest {
  id: string;
  driverName: string;
  phone: string;
  vehicleType: 'toto' | 'bike' | 'auto';
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColor: string;
  driverPhoto?: string;
  totoPhotos?: string[];
  status: 'pending' | 'approved' | 'rejected';
  generatedPin?: string;
  upiId?: string;
  createdAt: string;
  approvedAt?: string;
  updatedAt?: string;
  adminNotes?: string;
}

export interface TripRecord {
  id: string;
  driverId: string;
  rideId?: string;
  fare: number;
  status: 'completed' | 'cancelled';
  pickupName: string;
  pickupAddress?: string;
  dropoffName: string;
  dropoffAddress?: string;
  distanceKm: number;
  completedAt: string;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  passengerName?: string;
}

export interface RideRequestDoc {
  id: string;
  rideId: string;
  driverId: string; // specific driver ID or 'all'
  passengerName: string;
  passengerPhone?: string;
  pickupName: string;
  dropoffName: string;
  fare: number;
  distanceKm: number;
  status: 'searching' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
}

export interface TotoPartnerOffer {
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverPhoto: string;
  vehicleNumber: string;
  vehicleModel: string;
  rating: number;
  totalTrips: number;
  batteryPercentage: number;
  distanceMeters: number;
  etaMins: number;
  price: number;
  originalPrice: number;
  discount: number;
  offerTag: string; // e.g. 'Lowest Fare 🏷️', 'Fastest Pickup ⚡', 'Top Rated 🌟', 'Eco Deluxe 🌿'
  driverLat: number;
  driverLng: number;
}

export interface ActiveRide {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userRating: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  vehicleNumber?: string;
  driverVehicleNumber?: string;
  vehicleModel?: string;
  vehicleType: 'toto' | 'bike' | 'toto_express' | 'auto';
  pickup: GeoPoint;
  dropoff: GeoPoint;
  distanceKm: number;
  estimatedMins: number;
  estimatedDurationMins?: number;
  basePrice: number;
  discount: number;
  couponDiscount?: number;
  totalFare: number;
  fare?: number;
  driverEarnings: number;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  paymentStatus: 'pending' | 'paid';
  status: RideStatus;
  otp: string;
  bookedAt: string;
  createdAt?: string;
  expiresAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  driverLocation?: { lat: number; lng: number; heading?: number; timestamp?: number };
  routeCoordinates?: { lat: number; lng: number }[] | [number, number][];
  passengerRating?: number;
  passengerFeedback?: string;
  selectedOfferTag?: string;
}

export interface GpsLocationState {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  speedKmH?: number;
  timestamp: number;
  address?: string;
  name?: string;
  isWatching: boolean;
  error?: string | null;
}

export interface DriverMarker {
  id: string;
  name: string;
  vehicleType: 'toto' | 'bike' | 'auto';
  vehicleNumber: string;
  lat: number;
  lng: number;
  heading: number;
  isAvailable: boolean;
  rating?: number;
  batteryPercentage?: number;
  lastUpdated?: number | string;
}

export type SimulatedDriverMarker = DriverMarker;

export interface ChatMsg {
  id: string;
  rideId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'driver';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface SavedPlaceItem {
  id: string;
  userId: string;
  type: 'home' | 'work' | 'other';
  name: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'driver';
  rideId?: string;
  category: 'ride' | 'payment' | 'driver' | 'lost_item' | 'safety' | 'account' | 'other';
  subject: string;
  description: string;
  itemDetails?: string; // For lost item recovery
  status: 'open' | 'in_progress' | 'resolved';
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponItem {
  id?: string;
  code: string;
  title: string;
  discountPct: number;
  maxDiscount: number;
  minFare: number;
  desc: string;
  isActive: boolean;
  expiresAt?: string;
}

export interface ScheduledRide {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  scheduledDate: string;
  scheduledTime: string;
  vehicleType: string;
  estimatedFare: number;
  status: 'scheduled' | 'dispatched' | 'cancelled';
  createdAt: string;
}

export interface DriverWithdrawal {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  method: 'upi' | 'bank';
  payoutDetails: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  details: string;
}

export interface SystemSettings {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
  waitingFeePerMin: number;
  cancellationFee: number;
  peakSurgeMultiplier: number;
  platformCommissionPct: number;
  serviceRadiusKm: number;
  gpsStaleTimeoutSec: number;
  toto1PersonRate: number;
  totoPremiumRate: number;
  totoDeluxeRate: number;
  fullReserveRate: number;
  ownerUpiId?: string;
  ownerPayeeName?: string;
  ownerSettlementBank?: string;
}

export interface RideEventLog {
  id: string;
  rideId: string;
  event: string;
  timestamp: string;
  actor: string;
  details?: string;
}

export type StrictRideStatus =
  | 'IDLE'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'OTP_REQUIRED'
  | 'RIDE_STARTED'
  | 'RIDE_IN_PROGRESS'
  | 'DESTINATION_CHANGED'
  | 'RIDE_COMPLETING'
  | 'RIDE_COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'RATING_PENDING'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'CUSTOMER_CANCELLED'
  | 'DRIVER_CANCELLED'
  | 'NO_DRIVER_AVAILABLE'
  | 'NO_DRIVER_FOUND'
  | 'NO_DRIVER_ACCEPTED'
  | 'EXPIRED'
  | 'ADMIN_CANCELLED'
  | 'PAYMENT_FAILED';

export type DriverStatus = 
  | 'OFFLINE'
  | 'ONLINE'
  | 'SEARCHING'
  | 'RIDE_ASSIGNED'
  | 'ACCEPTED'
  | 'GOING_TO_PICKUP'
  | 'ARRIVED'
  | 'RIDE_STARTED'
  | 'RIDE_IN_PROGRESS'
  | 'COMPLETING'
  | 'RIDE_COMPLETED'
  | 'SUSPENDED';

export type VehicleStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface Vehicle {
  vehicle_id: string;
  driver_id: string;
  vehicle_type: 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto';
  registration_number: string;
  vehicle_model: string;
  vehicle_color: string;
  capacity: number;
  verification_status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export type LedgerTransactionType = 
  | 'RIDE_EARNING' 
  | 'COMMISSION' 
  | 'INCENTIVE' 
  | 'REFUND_ADJUSTMENT' 
  | 'WITHDRAWAL'
  | 'WALLET_TOPUP';

export interface DriverLedgerEntry {
  id: string;
  driverId: string;
  rideId?: string;
  type: LedgerTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface ServiceArea {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isActive: boolean;
  description?: string;
}

export interface RatingRecord {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'customer' | 'driver';
  toRole: 'customer' | 'driver';
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface RideInvoice {
  invoiceNumber: string;
  rideId: string;
  dateTime: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleType: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMins: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingCharge: number;
  bookingFee: number;
  tax: number;
  discount: number;
  finalFare: number;
  platformCommission: number;
  driverEarnings: number;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
}

export interface TotoVehiclePricing {
  serviceType: 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto';
  name: string;
  baseFare: number;
  minimumFare: number;
  perKmRate: number;
  perMinuteRate: number;
  waitingRatePerMin: number;
  commissionPct: number;
  capacity: number;
  bookingFee: number;
}

export interface AuthoritativeRide {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  vehicleType: string;
  pickup: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  distanceKm: number;
  estimatedDurationMins: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingCharge: number;
  bookingFee: number;
  tax: number;
  discount: number;
  finalFare: number;
  platformCommission: number;
  driverEarnings: number;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  status: StrictRideStatus;
  otp: string;
  driverId?: string | null;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'driver' | 'admin' | 'system';
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    timestamp: number;
  };
}

