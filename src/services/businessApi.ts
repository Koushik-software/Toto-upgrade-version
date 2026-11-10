import { AuthoritativeRide, DriverLedgerEntry, DriverWithdrawal, RatingRecord, ServiceArea, SupportTicket, Vehicle } from '../types';

/**
 * Clean, authoritative API client for Toto Drive backend services.
 * All state mutations and financial calculations are enforced on the backend.
 */

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {})
  };

  // Attach admin session token if present
  try {
    const adminToken = localStorage.getItem('totodrive_admin_session_token');
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
  } catch (e) {
    // Ignore in non-browser environments
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function calculateAuthoritativeFareApi(params: {
  vehicleType: string;
  distanceKm: number;
  estimatedDurationMins?: number;
  waitingMinutes?: number;
  promoCode?: string;
}) {
  return request<{
    success: boolean;
    fare: {
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
      tier: any;
    };
  }>('/api/fare/calculate', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function createRideRequestApi(params: {
  userId: string;
  userName: string;
  userPhone: string;
  pickup: { lat: number; lng: number; address: string; name: string };
  dropoff: { lat: number; lng: number; address: string; name: string };
  vehicleType: string;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  promoCode?: string;
  targetDriverId?: string;
}) {
  return request<{
    success: boolean;
    ride: AuthoritativeRide;
    assignedDriver?: any;
    message: string;
  }>('/api/rides/request', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getActiveRideApi(params: { userId?: string; driverId?: string }) {
  const query = new URLSearchParams();
  if (params.userId) query.set('userId', params.userId);
  if (params.driverId) query.set('driverId', params.driverId);
  return request<{ success: boolean; activeRide: AuthoritativeRide | null }>(`/api/rides/active?${query.toString()}`);
}

export async function getAllRidesApi() {
  return request<{ success: boolean; rides: AuthoritativeRide[] }>('/api/rides');
}

export async function driverAcceptRideApi(
  rideId: string, 
  driverId: string, 
  fallbackData?: { driver?: any; ride?: any }
) {
  return request<{ success: boolean; ride: AuthoritativeRide; message: string }>(`/api/rides/${rideId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ driverId, ...fallbackData })
  });
}

export async function expireRideApi(rideId: string) {
  return request<{ success: boolean; ride: AuthoritativeRide | null; message: string }>(`/api/rides/${rideId}/expire`, {
    method: 'POST'
  });
}

export async function driverArrivedApi(rideId: string, driverId: string, lat?: number, lng?: number) {
  return request<{ success: boolean; ride: AuthoritativeRide; message: string }>(`/api/rides/${rideId}/arrived`, {
    method: 'POST',
    body: JSON.stringify({ driverId, lat, lng })
  });
}

export async function driverStartRideApi(rideId: string, driverId: string, otp: string) {
  return request<{ success: boolean; ride: AuthoritativeRide; message: string }>(`/api/rides/${rideId}/start`, {
    method: 'POST',
    body: JSON.stringify({ driverId, otp })
  });
}

export async function driverCompleteRideApi(rideId: string, driverId: string, actualDistanceKm?: number, actualDurationMins?: number) {
  return request<{ success: boolean; ride: AuthoritativeRide; invoice: any; message: string }>(`/api/rides/${rideId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ driverId, actualDistanceKm, actualDurationMins })
  });
}

export async function settleRidePaymentApi(rideId: string, paymentMethod: 'cash' | 'upi' | 'wallet') {
  return request<{ success: boolean; ride: AuthoritativeRide; message: string }>(`/api/rides/${rideId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod })
  });
}

export async function cancelRideApi(rideId: string, actor: 'customer' | 'driver' | 'admin', reason?: string) {
  return request<{ success: boolean; ride: AuthoritativeRide; fee: number; message: string }>(`/api/rides/${rideId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ actor, reason })
  });
}

export async function driverToggleOnlineApi(driverId: string, online: boolean, lat?: number, lng?: number) {
  return request<{ success: boolean; message: string; driver?: any }>(`/api/drivers/${driverId}/toggle-online`, {
    method: 'POST',
    body: JSON.stringify({ online, lat, lng })
  });
}

export async function syncDriverRecordApi(driverData: any) {
  return request<{ success: boolean; driver: any; vehicle: Vehicle }>('/api/drivers/sync', {
    method: 'POST',
    body: JSON.stringify(driverData)
  });
}

export async function getDriverLedgerApi(driverId: string) {
  return request<{ success: boolean; balance: number; entries: DriverLedgerEntry[] }>(`/api/drivers/${driverId}/ledger`);
}

export async function requestDriverWithdrawalApi(driverId: string, amount: number, method: 'upi' | 'bank', payoutDetails: string) {
  return request<{ success: boolean; withdrawal: DriverWithdrawal; message: string }>(`/api/drivers/${driverId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ amount, method, payoutDetails })
  });
}

export async function submitRatingApi(params: {
  rideId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'customer' | 'driver';
  rating: number;
  comment?: string;
}) {
  return request<{ success: boolean; ratingRecord: RatingRecord; message: string }>('/api/ratings', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getRatingsApi() {
  return request<{ success: boolean; ratings: RatingRecord[] }>('/api/ratings');
}

export async function validateCouponApi(code: string, fareAmount?: number) {
  return request<{ valid: boolean; code: string; discount: number; coupon: any; message?: string }>('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, fareAmount })
  });
}

export async function getSupportTicketsApi(userId?: string) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return request<{ success: boolean; tickets: SupportTicket[] }>(`/api/support/tickets${q}`);
}

export async function createSupportTicketApi(params: {
  userId: string;
  userName: string;
  userRole: 'user' | 'driver';
  rideId?: string;
  category: string;
  subject: string;
  description: string;
  priority?: string;
}) {
  return request<{ success: boolean; ticket: SupportTicket }>('/api/support/tickets', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function updateSupportTicketApi(ticketId: string, updates: Partial<SupportTicket>) {
  return request<{ success: boolean; ticket: SupportTicket }>(`/api/support/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function getAdminOperationsSummaryApi() {
  return request<{ success: boolean; summary: any }>('/api/admin/operations-summary');
}

export async function getAdminPricingApi() {
  return request<{ success: boolean; pricing: any }>('/api/admin/pricing');
}

export async function updateAdminPricingApi(pricing: any) {
  return request<{ success: boolean; pricing: any; message: string }>('/api/admin/pricing', {
    method: 'POST',
    body: JSON.stringify(pricing)
  });
}

export async function getServiceAreasApi() {
  return request<{ success: boolean; serviceAreas: ServiceArea[] }>('/api/admin/service-areas');
}

export async function createServiceAreaApi(area: Partial<ServiceArea>) {
  return request<{ success: boolean; serviceArea: ServiceArea }>('/api/admin/service-areas', {
    method: 'POST',
    body: JSON.stringify(area)
  });
}

export async function getAdminWithdrawalsApi() {
  return request<{ success: boolean; withdrawals: DriverWithdrawal[] }>('/api/admin/withdrawals');
}

export async function processWithdrawalApi(id: string, action: 'approve' | 'reject', notes?: string) {
  return request<{ success: boolean; message: string }>(`/api/admin/withdrawals/${id}/process`, {
    method: 'POST',
    body: JSON.stringify({ action, notes })
  });
}

export async function getAdminVehiclesApi() {
  return request<{ success: boolean; vehicles: Vehicle[] }>('/api/admin/vehicles');
}

export async function updateVehicleStatusApi(id: string, status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED') {
  return request<{ success: boolean; vehicle: Vehicle; message: string }>(`/api/admin/vehicles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function getDriverApprovalsApi() {
  return request<{ success: boolean; approvals: any[] }>('/api/driver-approvals');
}

export async function createDriverApprovalApi(data: {
  id?: string;
  driverName: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber: string;
  vehicleModel?: string;
  vehicleColor?: string;
  driverPhoto?: string;
  totoPhotos?: string[];
}) {
  return request<{ success: boolean; approval: any; message: string }>('/api/driver-approvals', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function approveDriverRegistrationApi(id: string, pin?: string) {
  return request<{ success: boolean; approval?: any; pin?: string; message: string }>(`/api/driver-approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
}

export async function rejectDriverRegistrationApi(id: string, reason?: string) {
  return request<{ success: boolean; approval?: any; message: string }>(`/api/driver-approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function deleteDriverApprovalApi(id: string) {
  return request<{ success: boolean; message: string }>(`/api/driver-approvals/${id}`, {
    method: 'DELETE'
  });
}

export async function deleteDriverApi(id: string) {
  return request<{ success: boolean; message: string }>(`/api/drivers/${id}`, {
    method: 'DELETE'
  });
}

export async function deleteUserApi(id: string) {
  return request<{ success: boolean; message: string }>(`/api/users/${id}`, {
    method: 'DELETE'
  });
}

export async function deleteRideApi(id: string) {
  return request<{ success: boolean; message: string }>(`/api/rides/${id}`, {
    method: 'DELETE'
  });
}

export async function updateDriverLocationApi(
  driverId: string,
  location: { lat: number; lng: number; heading?: number; speed?: number }
) {
  return request<{ success: boolean; driverLocation?: any; rideUpdated?: boolean }>(
    `/api/drivers/${driverId}/location`,
    {
      method: 'POST',
      body: JSON.stringify(location)
    }
  );
}

export async function getDriversApi() {
  return request<{ success: boolean; drivers: any[] }>('/api/drivers');
}

export async function getUsersApi() {
  return request<{ success: boolean; users: any[] }>('/api/users');
}

export async function syncUserApi(user: any) {
  return request<{ success: boolean; user: any }>('/api/users/sync', {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

// Owner UPI Configuration APIs
export async function getOwnerUpiApi() {
  return request<{ success: boolean; config: any }>('/api/admin/owner-upi');
}

export async function updateOwnerUpiApi(
  token: string,
  payload: {
    ownerUpiId: string;
    ownerPayeeName: string;
    ownerSettlementBank?: string;
  }
) {
  return request<{ success: boolean; config: any; message: string }>('/api/admin/owner-upi', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

// ==============================================================================
// YOUPI PAYMENT GATEWAY & WALLET LEDGER APIS
// ==============================================================================

export interface YouPiSessionResponse {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  status: 'INITIATED' | 'ACTIVE' | 'PROCESSING' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'FAILED' | 'REFUNDED';
  merchantUpiId: string;
  merchantName: string;
  upiIntentUrl: string;
  qrSvg: string;
  merchantDetails?: {
    merchantId: string;
    publishableKey?: string;
    merchantName: string;
    merchantUpiId: string;
    appName: string;
    logoUrl: string;
    contactPhone: string;
    contactEmail: string;
    footerGuarantee: string;
  };
  utrClaim?: string;
  expiresAt: string;
}

export async function createYouPiSessionApi(params: {
  userId: string;
  amount: number;
  type?: 'WALLET_TOPUP' | 'RIDE_PAYMENT';
  rideId?: string;
  captainId?: string;
  notes?: string;
}) {
  return request<{ success: boolean; session: YouPiSessionResponse }>('/api/payments/youpi/create-session', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function submitYouPiUtrApi(params: {
  sessionId: string;
  utr: string;
}) {
  return request<{ success: boolean; session: YouPiSessionResponse; error?: string }>('/api/payments/youpi/submit-utr', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getYouPiSessionApi(sessionId: string) {
  return request<{ success: boolean; session: YouPiSessionResponse }>(`/api/payments/youpi/session/${sessionId}`);
}

export async function fastVerifyYouPiSessionApi(params: {
  sessionId: string;
  notes?: string;
}) {
  // Direct test-mode verification endpoint for testing the complete sovereign settlement flow
  return request<{ success: boolean; session: YouPiSessionResponse; error?: string }>('/api/admin/payments/youpi/review', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: params.sessionId,
      action: 'approve',
      notes: params.notes || 'Instant test-verification approval'
    })
  });
}

export async function getWalletDetailsApi(ownerType: 'user' | 'captain' | 'platform', ownerId: string) {
  return request<{
    success: boolean;
    wallet: {
      id: string;
      ownerType: string;
      ownerId: string;
      balance: number;
      currency: string;
      status: string;
    };
    entries: Array<{
      id: string;
      walletId: string;
      transactionType: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      description: string;
      status: string;
      createdAt: string;
    }>;
  }>(`/api/wallets/${ownerType}/${ownerId}`);
}



