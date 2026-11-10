import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { 
  UserProfile, 
  SavedPlaceItem, 
  EmergencyContact, 
  ScheduledRide, 
  SupportTicket, 
  TripRecord, 
  ActiveRide, 
  DriverApprovalRequest, 
  DriverProfile 
} from '../types';

/**
 * Supabase Database Service
 * Provides typed CRUD operations directly against Supabase PostgreSQL tables
 * with automatic user scoping (user_id = auth.uid()) and graceful fallbacks.
 */

// ==============================================================================
// 1. User Profiles (public.profiles)
// ==============================================================================

export async function getSupabaseProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name || 'Passenger',
      email: data.email || '',
      phone: data.phone || '',
      avatarUrl: data.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${data.id}`,
      walletBalance: Number(data.wallet_balance ?? 250),
      rating: Number(data.rating ?? 4.95),
      totalRides: Number(data.total_rides ?? 0),
      createdAt: data.created_at,
    };
  } catch (_err) {
    return null;
  }
}

export async function upsertSupabaseProfile(profile: Partial<UserProfile> & { id: string }): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      avatar_url: profile.avatarUrl,
      wallet_balance: profile.walletBalance,
      rating: profile.rating,
      total_rides: profile.totalRides,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  } catch (_err) {}
}

export async function updateSupabaseWalletBalance(userId: string, newBalance: number): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (_err) {}
}

// ==============================================================================
// 2. Saved Places (public.saved_places)
// ==============================================================================

export async function getSupabaseSavedPlaces(userId: string): Promise<SavedPlaceItem[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      address: row.address,
      lat: Number(row.lat),
      lng: Number(row.lng),
      type: row.type || 'other',
      createdAt: row.created_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function insertSupabaseSavedPlace(
  place: Omit<SavedPlaceItem, 'id' | 'createdAt'>,
  userId: string
): Promise<SavedPlaceItem | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .insert([
        {
          user_id: userId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          type: place.type,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      address: data.address,
      lat: Number(data.lat),
      lng: Number(data.lng),
      type: data.type,
      createdAt: data.created_at,
    };
  } catch (_err) {
    return null;
  }
}

export async function deleteSupabaseSavedPlace(placeId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('id', placeId)
      .eq('user_id', userId);

    return !error;
  } catch (_err) {
    return false;
  }
}

// ==============================================================================
// 3. Emergency Contacts (public.emergency_contacts)
// ==============================================================================

export async function getSupabaseEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      relationship: row.relationship,
      createdAt: row.created_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function insertSupabaseEmergencyContact(
  contact: Omit<EmergencyContact, 'id' | 'createdAt'>,
  userId: string
): Promise<EmergencyContact | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([
        {
          user_id: userId,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      phone: data.phone,
      relationship: data.relationship,
      createdAt: data.created_at,
    };
  } catch (_err) {
    return null;
  }
}

export async function deleteSupabaseEmergencyContact(contactId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    return !error;
  } catch (_err) {
    return false;
  }
}

// ==============================================================================
// 4. Scheduled Rides (public.scheduled_rides)
// ==============================================================================

export async function getSupabaseScheduledRides(userId: string): Promise<ScheduledRide[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('scheduled_rides')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || 'Passenger',
      userPhone: row.user_phone || '',
      pickup: {
        lat: Number(row.pickup_lat ?? 22.58),
        lng: Number(row.pickup_lng ?? 88.42),
        name: row.pickup_name,
        address: row.pickup_name,
      },
      dropoff: {
        lat: Number(row.dropoff_lat ?? 22.59),
        lng: Number(row.dropoff_lng ?? 88.43),
        name: row.dropoff_name,
        address: row.dropoff_name,
      },
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      vehicleType: row.vehicle_type || 'toto',
      estimatedFare: Number(row.estimated_fare),
      status: row.status as ScheduledRide['status'],
      createdAt: row.created_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function insertSupabaseScheduledRide(
  ride: ScheduledRide,
  userId: string
): Promise<ScheduledRide | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('scheduled_rides')
      .insert([
        {
          id: ride.id && !ride.id.startsWith('sched_') ? ride.id : undefined,
          user_id: userId,
          user_name: ride.userName,
          user_phone: ride.userPhone,
          pickup_name: ride.pickup.name,
          dropoff_name: ride.dropoff.name,
          pickup_lat: ride.pickup.lat,
          pickup_lng: ride.pickup.lng,
          dropoff_lat: ride.dropoff.lat,
          dropoff_lng: ride.dropoff.lng,
          scheduled_date: ride.scheduledDate,
          scheduled_time: ride.scheduledTime,
          vehicle_type: ride.vehicleType,
          estimated_fare: ride.estimatedFare,
          status: 'scheduled',
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...ride,
      id: data.id,
      createdAt: data.created_at,
    };
  } catch (_err) {
    return null;
  }
}

// ==============================================================================
// 5. Support Tickets (public.support_tickets)
// ==============================================================================

export async function getSupabaseSupportTickets(userId: string): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || 'Passenger',
      userRole: row.user_role as 'user' | 'driver',
      rideId: row.ride_id || undefined,
      category: row.category,
      subject: row.subject,
      description: row.description,
      itemDetails: row.item_details || undefined,
      status: row.status,
      adminReply: row.admin_reply || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function insertSupabaseSupportTicket(
  ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  userId: string
): Promise<SupportTicket | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([
        {
          user_id: userId,
          user_name: ticket.userName,
          user_role: ticket.userRole,
          ride_id: ticket.rideId,
          category: ticket.category,
          subject: ticket.subject,
          description: ticket.description,
          item_details: ticket.itemDetails,
          status: 'open',
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...ticket,
      id: data.id,
      status: 'open',
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    };
  } catch (_err) {
    return null;
  }
}

// ==============================================================================
// 6. Rides & Trip History (public.rides)
// ==============================================================================

export async function getSupabaseUserTrips(userId: string): Promise<TripRecord[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      rideId: row.id,
      driverId: row.driver_id || 'drv_1',
      fare: Number(row.fare),
      status: row.status === 'completed' ? 'completed' : 'cancelled',
      pickupName: row.pickup_name,
      dropoffName: row.dropoff_name,
      distanceKm: Number(row.distance_km ?? 1.5),
      completedAt: row.completed_at || row.created_at,
      paymentMethod: (row.payment_method as 'cash' | 'upi' | 'wallet') || 'upi',
      passengerName: row.user_name || 'Passenger',
    }));
  } catch (_err) {
    return [];
  }
}

export async function insertSupabaseRide(ride: ActiveRide, userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      id: ride.id,
      user_id: userId,
      user_name: ride.userName,
      user_phone: ride.userPhone,
      driver_id: ride.driverId,
      driver_name: ride.driverName,
      driver_phone: ride.driverPhone,
      driver_photo: ride.driverPhoto,
      vehicle_number: ride.vehicleNumber,
      vehicle_model: ride.vehicleModel,
      vehicle_type: ride.vehicleType,
      pickup_name: ride.pickup.name,
      dropoff_name: ride.dropoff.name,
      pickup_lat: ride.pickup.lat,
      pickup_lng: ride.pickup.lng,
      dropoff_lat: ride.dropoff.lat,
      dropoff_lng: ride.dropoff.lng,
      distance_km: ride.distanceKm,
      estimated_mins: ride.estimatedMins,
      fare: ride.totalFare,
      driver_earnings: ride.driverEarnings,
      payment_method: ride.paymentMethod,
      payment_status: ride.paymentStatus,
      status: ride.status,
      otp: ride.otp,
      booked_at: ride.bookedAt,
      completed_at: ride.completedAt,
    };

    await supabase.from('rides').upsert(payload, { onConflict: 'id' });
  } catch (_err) {}
}

export async function updateSupabaseRideStatus(
  rideId: string,
  status: string,
  extraUpdates: Record<string, any> = {}
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('rides')
      .update({ status, ...extraUpdates })
      .eq('id', rideId);
  } catch (_err) {}
}

export async function updateSupabaseRideLocation(
  rideId: string,
  currentLat: number,
  currentLng: number,
  heading?: number
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('rides')
      .update({
        current_lat: currentLat,
        current_lng: currentLng,
        heading: heading ?? 0,
      })
      .eq('id', rideId);
  } catch (_err) {}
}

export async function rateSupabaseRide(
  rideId: string,
  rating: number,
  feedback: string,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('rides')
      .update({
        passenger_rating: rating,
        passenger_feedback: feedback,
      })
      .eq('id', rideId)
      .eq('user_id', userId);
  } catch (_err) {}
}

// ==============================================================================
// 7. Driver Approvals (public.driver_approvals)
// ==============================================================================

export async function getSupabaseDriverApprovals(): Promise<DriverApprovalRequest[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('driver_approvals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      driverName: row.driver_name,
      phone: row.phone,
      vehicleType: row.vehicle_type || 'toto',
      vehicleNumber: row.vehicle_number,
      vehicleModel: row.vehicle_model,
      vehicleColor: row.vehicle_color || 'Emerald Green',
      driverPhoto: row.driver_photo,
      totoPhotos: row.toto_photos || [],
      status: row.status as 'pending' | 'approved' | 'rejected',
      generatedPin: row.generated_pin,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function insertSupabaseDriverApproval(
  approval: DriverApprovalRequest
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      id: approval.id,
      driver_name: approval.driverName,
      phone: approval.phone,
      vehicle_type: approval.vehicleType,
      vehicle_number: approval.vehicleNumber,
      vehicle_model: approval.vehicleModel,
      vehicle_color: approval.vehicleColor,
      driver_photo: approval.driverPhoto,
      toto_photos: approval.totoPhotos,
      status: approval.status,
      generated_pin: approval.generatedPin,
      created_at: approval.createdAt,
    };

    await supabase.from('driver_approvals').insert([payload]);
  } catch (_err) {}
}

export async function updateSupabaseDriverApprovalStatus(
  approvalId: string,
  status: 'approved' | 'rejected',
  pin?: string
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payload: Record<string, any> = {
      status,
      approved_at: new Date().toISOString(),
    };
    if (pin) payload.generated_pin = pin;

    await supabase
      .from('driver_approvals')
      .update(payload)
      .eq('id', approvalId);
  } catch (_err) {}
}

// ==============================================================================
// 8. Drivers (public.drivers)
// ==============================================================================

export async function getSupabaseDrivers(): Promise<DriverProfile[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('drivers').select('*');

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      vehicleType: row.vehicle_type || 'toto',
      vehicleNumber: row.vehicle_number,
      vehicleModel: row.vehicle_model,
      vehicleColor: row.vehicle_color || 'Emerald Green',
      pin: row.pin || '1234',
      isOnline: Boolean(row.is_online),
      rating: Number(row.rating ?? 4.9),
      batteryPercentage: Number(row.battery_percentage ?? 85),
      totalTrips: Number(row.total_trips ?? 0),
      todayEarnings: Number(row.today_earnings ?? 0),
      currentLat: row.current_lat ? Number(row.current_lat) : undefined,
      currentLng: row.current_lng ? Number(row.current_lng) : undefined,
      heading: row.heading ? Number(row.heading) : 0,
      avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${row.id}`,
      kycVerified: true,
      acceptanceRate: 98,
    }));
  } catch (_err) {
    return [];
  }
}

export async function updateSupabaseDriverOnlineStatus(
  driverId: string,
  isOnline: boolean
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('drivers')
      .update({ is_online: isOnline })
      .eq('id', driverId);
  } catch (_err) {}
}

export async function updateSupabaseDriverLocation(
  driverId: string,
  lat: number,
  lng: number,
  heading?: number
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('drivers')
      .update({
        current_lat: lat,
        current_lng: lng,
        heading: heading ?? 0,
      })
      .eq('id', driverId);
  } catch (_err) {}
}

export async function upsertSupabaseDriver(driver: DriverProfile): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicle_type: driver.vehicleType || 'toto',
      vehicle_number: driver.vehicleNumber,
      vehicle_model: driver.vehicleModel,
      vehicle_color: driver.vehicleColor,
      pin: driver.pin || '1234',
      is_online: Boolean(driver.isOnline),
      rating: driver.rating,
      battery_percentage: driver.batteryPercentage,
      total_trips: driver.totalTrips,
      today_earnings: driver.todayEarnings,
      current_lat: driver.currentLat,
      current_lng: driver.currentLng,
      heading: driver.heading ?? 0,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('drivers').upsert(payload, { onConflict: 'id' });
  } catch (_err) {}
}

export async function deleteSupabaseDriver(driverId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('drivers').delete().eq('id', driverId);
  } catch (_err) {}
}

export async function deleteSupabaseDriverApproval(approvalId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('driver_approvals').delete().eq('id', approvalId);
  } catch (_err) {}
}

export async function insertSupabaseTrip(trip: TripRecord): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('rides').upsert({
      id: trip.rideId,
      fare: trip.fare,
      status: 'completed',
      pickup_name: trip.pickupName,
      dropoff_name: trip.dropoffName,
      distance_km: trip.distanceKm,
      completed_at: trip.completedAt,
      payment_method: trip.paymentMethod,
      user_name: trip.passengerName,
      driver_id: trip.driverId,
    }, { onConflict: 'id' });
  } catch (_err) {}
}

// ==============================================================================
// 9. Diagnostic & Status Checker
// ==============================================================================

export interface SupabaseHealthReport {
  connected: boolean;
  latencyMs: number;
  url: string;
  hasAnonKey: boolean;
  tables: {
    profiles: boolean;
    saved_places: boolean;
    emergency_contacts: boolean;
    scheduled_rides: boolean;
    support_tickets: boolean;
    rides: boolean;
    driver_approvals: boolean;
    drivers: boolean;
  };
  error?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthReport> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      latencyMs: 0,
      url: '',
      hasAnonKey: false,
      tables: {
        profiles: false,
        saved_places: false,
        emergency_contacts: false,
        scheduled_rides: false,
        support_tickets: false,
        rides: false,
        driver_approvals: false,
        drivers: false,
      },
      error: 'Supabase credentials not configured in environment',
    };
  }

  const startTime = Date.now();
  const report: SupabaseHealthReport = {
    connected: false,
    latencyMs: 0,
    url: (supabase as any)?.supabaseUrl || '',
    hasAnonKey: Boolean((supabase as any)?.supabaseKey),
    tables: {
      profiles: false,
      saved_places: false,
      emergency_contacts: false,
      scheduled_rides: false,
      support_tickets: false,
      rides: false,
      driver_approvals: false,
      drivers: false,
    },
  };

  try {
    // Ping with a fast query
    const { error: pingError } = await supabase.from('drivers').select('id').limit(1);
    report.latencyMs = Date.now() - startTime;

    if (!pingError) {
      report.connected = true;
      report.tables.drivers = true;
    } else {
      report.error = pingError.message;
    }

    // Check other key tables in parallel
    const [t1, t2, t3, t4, t5, t6, t7] = await Promise.allSettled([
      supabase.from('profiles').select('id').limit(1),
      supabase.from('saved_places').select('id').limit(1),
      supabase.from('emergency_contacts').select('id').limit(1),
      supabase.from('scheduled_rides').select('id').limit(1),
      supabase.from('support_tickets').select('id').limit(1),
      supabase.from('rides').select('id').limit(1),
      supabase.from('driver_approvals').select('id').limit(1),
    ]);

    report.tables.profiles = t1.status === 'fulfilled' && !t1.value.error;
    report.tables.saved_places = t2.status === 'fulfilled' && !t2.value.error;
    report.tables.emergency_contacts = t3.status === 'fulfilled' && !t3.value.error;
    report.tables.scheduled_rides = t4.status === 'fulfilled' && !t4.value.error;
    report.tables.support_tickets = t5.status === 'fulfilled' && !t5.value.error;
    report.tables.rides = t6.status === 'fulfilled' && !t6.value.error;
    report.tables.driver_approvals = t7.status === 'fulfilled' && !t7.value.error;
  } catch (err: any) {
    report.error = err?.message || 'Connection failed';
  }

  return report;
}

// ==============================================================================
// 10. Admin Direct Database Operations (Users, Rides, Drivers)
// ==============================================================================

export async function adminGetSupabaseUsers(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      // Fallback try 'users' table
      const { data: usersData, error: usersErr } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (usersErr || !usersData) {
        return [];
      }
      return usersData.map((row) => ({
        id: row.id,
        name: row.name || 'Passenger',
        phone: row.phone || '',
        email: row.email || '',
        avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${row.id}`,
        rating: Number(row.rating ?? 4.95),
        totalRides: Number(row.total_rides ?? 0),
        walletBalance: Number(row.wallet_balance ?? 0),
        status: (row.status as 'active' | 'blocked') || 'active',
        createdAt: row.created_at,
      }));
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name || 'Passenger',
      phone: row.phone || '',
      email: row.email || '',
      avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${row.id}`,
      rating: Number(row.rating ?? 4.95),
      totalRides: Number(row.total_rides ?? 0),
      walletBalance: Number(row.wallet_balance ?? 0),
      status: (row.status as 'active' | 'blocked') || 'active',
      createdAt: row.created_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function adminUpsertSupabaseUser(user: UserProfile): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar_url: user.avatarUrl,
      rating: user.rating,
      total_rides: user.totalRides,
      wallet_balance: user.walletBalance,
      status: user.status || 'active',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      try {
        await supabase.from('users').upsert(payload, { onConflict: 'id' });
      } catch {
        // Non-blocking
      }
    }
  } catch (_err) {}
}

export async function adminDeleteSupabaseUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('profiles').delete().eq('id', userId);
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch {
      // Non-blocking
    }
  } catch (_err) {}
}

export async function adminGetSupabaseRides(): Promise<ActiveRide[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('rides').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id || 'usr_unknown',
      userName: row.user_name || 'Passenger',
      userPhone: row.user_phone || '',
      userRating: 4.9,
      driverId: row.driver_id,
      driverName: row.driver_name,
      driverPhone: row.driver_phone,
      driverPhoto: row.driver_photo,
      vehicleNumber: row.vehicle_number,
      vehicleModel: row.vehicle_model,
      vehicleType: row.vehicle_type || 'toto',
      pickup: {
        lat: Number(row.pickup_lat ?? 22.58),
        lng: Number(row.pickup_lng ?? 88.42),
        name: row.pickup_name || 'Pickup',
        address: row.pickup_name || 'Pickup',
      },
      dropoff: {
        lat: Number(row.dropoff_lat ?? 22.59),
        lng: Number(row.dropoff_lng ?? 88.43),
        name: row.dropoff_name || 'Destination',
        address: row.dropoff_name || 'Destination',
      },
      distanceKm: Number(row.distance_km ?? 1.5),
      estimatedMins: Number(row.estimated_mins ?? 8),
      basePrice: Number(row.fare ?? 30),
      discount: 0,
      totalFare: Number(row.fare ?? 30),
      driverEarnings: Number(row.driver_earnings ?? (row.fare ? Number(row.fare) * 0.9 : 27)),
      paymentMethod: row.payment_method || 'cash',
      paymentStatus: row.payment_status || 'paid',
      status: row.status || 'completed',
      otp: row.otp || '',
      bookedAt: row.booked_at || row.created_at || new Date().toISOString(),
      completedAt: row.completed_at,
    }));
  } catch (_err) {
    return [];
  }
}

export async function adminDeleteSupabaseRide(rideId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('rides').delete().eq('id', rideId);
  } catch (_err) {}
}

