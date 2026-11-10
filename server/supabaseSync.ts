import { serverSupabase } from './supabase';
import type { AuthoritativeRide, DriverRecord, DriverLedgerEntry, Vehicle } from './businessEngine';

/**
 * Server-authoritative Supabase PostgreSQL synchronizer.
 * Provides resilient background mirroring to PostgreSQL tables.
 * Fails safely with warnings if remote database is unreachable or offline.
 */

let isSupabaseHealthy = true;
let lastSupabaseErrorTime = 0;

export async function syncRideToSupabase(ride: AuthoritativeRide): Promise<void> {
  if (!serverSupabase) return;

  // Rate-limit connection errors to avoid flooding logs
  if (!isSupabaseHealthy && Date.now() - lastSupabaseErrorTime < 30000) {
    return;
  }

  try {
    const payload = {
      id: ride.id,
      user_id: ride.userId,
      user_name: ride.userName,
      user_phone: ride.userPhone,
      driver_id: ride.driverId || null,
      driver_name: ride.driverName || null,
      driver_phone: ride.driverPhone || null,
      vehicle_number: ride.vehicleNumber || null,
      vehicle_type: ride.vehicleType || 'toto',
      pickup_address: ride.pickup.address || ride.pickup.name,
      pickup_lat: ride.pickup.lat,
      pickup_lng: ride.pickup.lng,
      dropoff_address: ride.dropoff.address || ride.dropoff.name,
      dropoff_lat: ride.dropoff.lat,
      dropoff_lng: ride.dropoff.lng,
      fare: ride.finalFare,
      base_fare: ride.baseFare,
      distance_fare: ride.distanceFare,
      time_fare: ride.timeFare,
      waiting_charge: ride.waitingCharge,
      platform_commission: ride.platformCommission,
      driver_earnings: ride.driverEarnings,
      distance_km: ride.distanceKm,
      status: ride.status,
      payment_method: ride.paymentMethod || 'cash',
      payment_status: ride.paymentStatus || 'pending',
      otp: ride.otp,
      created_at: ride.createdAt || new Date().toISOString(),
      accepted_at: ride.acceptedAt || null,
      arrived_at: ride.arrivedAt || null,
      started_at: ride.startedAt || null,
      completed_at: ride.completedAt || null,
      cancelled_at: ride.cancelledAt || null,
      cancellation_reason: ride.cancellationReason || null
    };

    const { error } = await serverSupabase
      .from('rides')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      isSupabaseHealthy = false;
      lastSupabaseErrorTime = Date.now();
    } else {
      isSupabaseHealthy = true;
    }
  } catch (_err) {
    // Network, fetch or DNS failure handled silently
    isSupabaseHealthy = false;
    lastSupabaseErrorTime = Date.now();
  }
}

export async function syncDriverToSupabase(driver: DriverRecord, vehicle?: Vehicle): Promise<void> {
  if (!serverSupabase) return;

  if (!isSupabaseHealthy && Date.now() - lastSupabaseErrorTime < 30000) {
    return;
  }

  try {
    const payload = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
      availability: driver.availability,
      account_status: driver.accountStatus,
      pin: driver.pin,
      current_lat: driver.currentLat,
      current_lng: driver.currentLng,
      heading: driver.heading,
      speed: driver.speed,
      rating: driver.rating,
      total_trips: driver.totalTrips,
      wallet_balance: driver.walletBalance,
      today_earnings: driver.todayEarnings,
      cancellation_count: driver.cancellationCount,
      vehicle_id: driver.vehicleId || null,
      vehicle_number: vehicle?.registration_number || null,
      vehicle_model: vehicle?.vehicle_model || null,
      vehicle_type: vehicle?.vehicle_type || 'toto',
      last_location_update: driver.lastLocationUpdate ? new Date(driver.lastLocationUpdate).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await serverSupabase
      .from('drivers')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      isSupabaseHealthy = false;
      lastSupabaseErrorTime = Date.now();
    } else {
      isSupabaseHealthy = true;
    }
  } catch (_err) {
    isSupabaseHealthy = false;
    lastSupabaseErrorTime = Date.now();
  }
}

export async function syncLedgerEntryToSupabase(entry: DriverLedgerEntry): Promise<void> {
  if (!serverSupabase) return;

  if (!isSupabaseHealthy && Date.now() - lastSupabaseErrorTime < 30000) {
    return;
  }

  try {
    const payload = {
      id: entry.id,
      driver_id: entry.driverId,
      ride_id: entry.rideId || null,
      type: entry.type,
      amount: entry.amount,
      balance_after: entry.balanceAfter,
      description: entry.description,
      status: entry.status,
      created_at: entry.timestamp
    };

    const { error } = await serverSupabase
      .from('driver_ledger')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      isSupabaseHealthy = false;
      lastSupabaseErrorTime = Date.now();
    } else {
      isSupabaseHealthy = true;
    }
  } catch (_err) {
    isSupabaseHealthy = false;
    lastSupabaseErrorTime = Date.now();
  }
}
