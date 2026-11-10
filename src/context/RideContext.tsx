import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  AppRole, 
  UserProfile, 
  DriverProfile, 
  ActiveRide, 
  SimulatedDriverMarker, 
  GeoPoint, 
  VehicleOption,
  TotoPartnerOffer,
  DriverApprovalRequest,
  TripRecord,
  RideRequestDoc,
  SupportTicket,
  SavedPlaceItem,
  EmergencyContact,
  ScheduledRide
} from '../types';
import { 
  VEHICLE_OPTIONS, 
  PROMO_CODES
} from '../data/appData';
import { 
  calculateDistanceKm, 
  calculateEstimatedMinutes, 
  generate4DigitOtp, 
  calculateBearing, 
  fetchRouteBetweenPoints, 
  isDriverLocationFresh 
} from '../utils/geoUtils';
import { appDb, supabase, isSupabaseConfigured } from '../lib/supabase';
import { auth, logOutFromFirebase } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { compressImageIfNeeded } from '../utils/imageCompressor';
import { 
  upsertSupabaseProfile,
  adminGetSupabaseUsers,
  adminUpsertSupabaseUser,
  adminDeleteSupabaseUser,
  adminGetSupabaseRides,
  adminDeleteSupabaseRide,
  upsertSupabaseDriver,
  deleteSupabaseDriver
} from '../services/supabaseService';
import {
  calculateAuthoritativeFareApi,
  createRideRequestApi,
  getActiveRideApi,
  getAllRidesApi,
  driverAcceptRideApi,
  expireRideApi,
  driverArrivedApi,
  driverStartRideApi,
  driverCompleteRideApi,
  settleRidePaymentApi,
  cancelRideApi,
  driverToggleOnlineApi,
  syncDriverRecordApi,
  submitRatingApi,
  getDriverApprovalsApi,
  createDriverApprovalApi,
  approveDriverRegistrationApi,
  rejectDriverRegistrationApi,
  deleteDriverApprovalApi,
  deleteDriverApi,
  deleteUserApi,
  deleteRideApi,
  updateDriverLocationApi,
  getDriversApi,
  getAdminOperationsSummaryApi,
  syncUserApi,
  getUsersApi
} from '../services/businessApi';
import {
  saveDriverApprovalToFirestore,
  fetchDriverApprovalsFromFirestore,
  updateDriverApprovalInFirestore,
  deleteDriverApprovalFromFirestore,
  subscribeToDriverApprovalsFirestore,
  saveDriverToFirestore,
  updateDriverInFirestore,
  fetchDriversFromFirestore,
  subscribeToDriversFirestore,
  saveRideToFirestore,
  updateRideInFirestore,
  fetchRidesFromFirestore,
  subscribeToRidesFirestore,
  saveTripToFirestore,
  fetchTripsFromFirestore,
  subscribeToTripsFirestore,
  saveUserToFirestore,
  subscribeToUsersFirestore
} from '../services/firestoreSync';
import {
  fetchAdminStatus,
  setupInitialAdmin,
  loginAdminApi,
  verifyAdminSessionApi,
  changeAdminUsernameApi,
  changeAdminPasswordApi,
  logoutAdminApi,
  logoutAllAdminSessionsApi,
  AdminSafeProfile
} from '../services/adminAuthService';

interface RideContextType {
  user: UserProfile | null;
  driver: DriverProfile | null;
  activeRole: AppRole;
  activeRide: ActiveRide | null;
  simulatedDrivers: SimulatedDriverMarker[];
  pendingDriverRequest: ActiveRide | null;
  earningsHistory: Array<{ id: string; time: string; amount: number; pickup: string; drop: string }>;
  userGpsPoint: GeoPoint | null;
  driverGpsPoint: GeoPoint | null;
  isAuthLoading: boolean;
  isSupabaseConnected: boolean;
  
  // Dynamic Online Toto Partner Offers
  availableTotoOffers: TotoPartnerOffer[];
  isScanningOffers: boolean;
  selectedOffer: TotoPartnerOffer | null;
  findNearbyTotoOffers: (pickup: GeoPoint, dropoff: GeoPoint, promoCode?: string) => void;
  selectTotoOfferAndBook: (
    offer: TotoPartnerOffer, 
    pickup: GeoPoint, 
    dropoff: GeoPoint, 
    paymentMethod: 'cash' | 'upi' | 'wallet'
  ) => Promise<ActiveRide>;
  cancelOfferSearch: () => void;

  // Role & auth actions
  setActiveRole: (role: AppRole) => void;
  loginUser: (user: UserProfile) => Promise<void>;
  logoutUser: () => Promise<void>;
  loginDriver: (driver: DriverProfile) => Promise<void>;
  logoutDriver: (targetRole?: AppRole) => void;
  setDriverOnlineStatus: (isOnline: boolean) => Promise<void>;
  updateUserGpsPoint: (point: GeoPoint) => void;
  updateDriverGpsPoint: (point: GeoPoint) => void;
  
  // User Actions
  createRideBooking: (
    pickup: GeoPoint, 
    dropoff: GeoPoint, 
    vehicleType: VehicleOption['id'], 
    paymentMethod: 'cash' | 'upi' | 'wallet', 
    promoCode?: string
  ) => Promise<ActiveRide>;
  cancelRide: (reason?: string) => Promise<void>;
  expireRideBooking: (rideId: string) => Promise<void>;
  rateRide: (rating: number, feedback: string) => Promise<void>;
  advanceRideStage: () => Promise<void>;
  settleRidePayment: (rideId: string, paymentMethod: 'cash' | 'upi' | 'wallet') => Promise<{ success: boolean; message?: string }>;
  
  // Driver Actions
  driverAcceptRide: (rideId: string) => Promise<{ success: boolean; message?: string }>;
  driverDeclineRide: (rideId: string) => void;
  driverArriveAtPickup: () => Promise<{ success: boolean; message?: string } | void>;
  driverStartRideWithOtp: (otpInput: string) => Promise<{ success: boolean; message: string }>;
  driverCompleteRide: () => Promise<void>;
  
  // Admin & Approval System
  driverApprovals: DriverApprovalRequest[];
  pendingApprovalsCount: number;
  registerDriverApproval: (data: {
    driverName: string;
    phone: string;
    vehicleType?: 'toto' | 'bike' | 'auto';
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColor: string;
    driverPhoto?: string;
    totoPhotos?: string[];
  }) => Promise<{ approvalId: string; message: string }>;
  approveDriverRegistration: (approvalId: string, customPin?: string) => Promise<{ pin: string }>;
  rejectDriverRegistration: (approvalId: string, reason?: string) => Promise<void>;
  deleteDriverProfile: (idOrPhone: string) => Promise<{ success: boolean; message: string }>;
  loginDriverWithPin: (phone: string, pin: string) => Promise<{ success: boolean; message?: string; isPendingApproval?: boolean }>;
  updateDriverVehicleDetails: (details: {
    vehicleNumber?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    batteryPercentage?: number;
    upiId?: string;
  }) => Promise<void>;
  dispatchRideRequest: (req: Partial<RideRequestDoc>) => Promise<void>;

  // Customer Wallet, Places, Safety, Support & Scheduling
  activeNavTab: 'home' | 'rides' | 'profile';
  setActiveNavTab: (tab: 'home' | 'rides' | 'profile') => void;
  walletBalance: number;
  addMoneyToWallet: (amount: number) => Promise<void>;
  refreshWalletBalance: () => Promise<number>;
  savedPlaces: SavedPlaceItem[];
  addSavedPlace: (place: Omit<SavedPlaceItem, 'id' | 'createdAt'>) => Promise<void>;
  deleteSavedPlace: (placeId: string) => Promise<void>;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (name: string, phone: string, relationship: string) => Promise<void>;
  deleteEmergencyContact: (id: string) => Promise<void>;
  supportTickets: SupportTicket[];
  createSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  scheduledRides: ScheduledRide[];
  createScheduledRide: (ride: ScheduledRide) => Promise<void>;
  completedTrips: TripRecord[];
  rateRideWithTags: (stars: number, compliments: string[], review: string) => Promise<void>;

  // Admin authentication state & methods (Single Admin Account System)
  isAdminAuthenticated: boolean;
  adminProfile: AdminSafeProfile | null;
  adminExistsState: boolean;
  adminCredentials: { username: string; passwordHash: string; updatedAt?: string };
  refreshAdminStatus: () => Promise<void>;
  setupInitialAdminAccount: (username: string, password: string, confirmPassword: string, email?: string) => Promise<{ success: boolean; message: string }>;
  loginAdmin: (userId: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => Promise<void>;
  logoutAllAdminSessions: () => Promise<{ success: boolean; message: string }>;
  updateAdminCredentials: (newUsername: string, newPassword: string, currentPassword?: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateAdminPassword: (newPassword: string, currentPassword?: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };

  // Supabase Database collections & management
  allUsers: UserProfile[];
  allRides: ActiveRide[];
  allDrivers: DriverProfile[];
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  adminUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  adminCreateUser: (user: Omit<UserProfile, 'id'> & { id?: string }) => Promise<UserProfile>;
  adminDeleteUser: (userId: string) => Promise<void>;
  adminAdjustUserWallet: (userId: string, amount: number, note?: string) => Promise<void>;
  adminToggleUserStatus: (userId: string) => Promise<void>;
  adminUpdateRide: (rideId: string, updates: Partial<ActiveRide>) => Promise<void>;
  adminCreateRide: (rideData: Partial<ActiveRide>) => Promise<ActiveRide>;
  adminDeleteRide: (rideId: string) => Promise<void>;
  adminUpdateDriver: (driverId: string, updates: Partial<DriverProfile>) => Promise<void>;
  adminCreateDriver: (driverData: Partial<DriverProfile>) => Promise<DriverProfile>;
  syncAdminData: () => Promise<void>;

  // Audio chime feedback
  triggerSound: (type: 'beep' | 'success' | 'alert' | 'click') => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

// Web Audio API helper for natural sound feedback
function playChime(type: 'beep' | 'success' | 'alert' | 'click') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Audio gesture requirement bypassed
  }
}

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('toto_saved_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading saved user:', e);
    }
    return null;
  });
  const [driver, setDriver] = useState<DriverProfile | null>(() => {
    try {
      const saved = localStorage.getItem('toto_saved_driver');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading saved driver:', e);
    }
    return null; // By default require captain sign-in / PIN authentication
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<AppRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const search = new URLSearchParams(window.location.search);
        const queryRole = search.get('role');
        if (queryRole === 'admin' || queryRole === 'driver' || queryRole === 'user') {
          return queryRole as AppRole;
        }
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/admin')) return 'admin';
        if (path.includes('/driver')) return 'driver';
      }
      const savedRole = localStorage.getItem('toto_active_role');
      if (savedRole === 'driver' || savedRole === 'admin' || savedRole === 'user') {
        return savedRole as AppRole;
      }
      const savedDriver = localStorage.getItem('toto_saved_driver') || localStorage.getItem('rapid_toto_driver');
      if (savedDriver) {
        return 'driver';
      }
    } catch (e) {
      console.warn('Error reading saved activeRole:', e);
    }
    return 'user';
  });

  const setActiveRole = useCallback((role: AppRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem('toto_active_role', role);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('role', role);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, []);

  const [activeRide, setActiveRideState] = useState<ActiveRide | null>(() => {
    try {
      const saved = localStorage.getItem('toto_active_ride');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.status !== 'completed' && parsed.status !== 'cancelled') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const setActiveRide = useCallback((rideOrUpdater: ActiveRide | null | ((prev: ActiveRide | null) => ActiveRide | null)) => {
    setActiveRideState(prev => {
      const next = typeof rideOrUpdater === 'function' ? rideOrUpdater(prev) : rideOrUpdater;
      try {
        if (next && next.status !== 'completed' && next.status !== 'cancelled') {
          localStorage.setItem('toto_active_ride', JSON.stringify(next));
        } else {
          localStorage.removeItem('toto_active_ride');
        }
      } catch {}
      return next;
    });
  }, []);
  const [pendingDriverRequest, setPendingDriverRequest] = useState<ActiveRide | null>(null);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverProfile[]>([]);
  const [userGpsPoint, setUserGpsPoint] = useState<GeoPoint | null>(null);
  const [driverGpsPoint, setDriverGpsPoint] = useState<GeoPoint | null>(null);
  const [availableTotoOffers, setAvailableTotoOffers] = useState<TotoPartnerOffer[]>([]);
  const [isScanningOffers, setIsScanningOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<TotoPartnerOffer | null>(null);
  const [activeNavTab, setActiveNavTabState] = useState<'home' | 'rides' | 'profile'>('home');
  const setActiveNavTab = useCallback((tab: 'home' | 'rides' | 'profile') => {
    setActiveNavTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const isSupabaseConnected = isSupabaseConfigured;

  const [earningsHistory, setEarningsHistory] = useState<Array<{ id: string; time: string; amount: number; pickup: string; drop: string }>>([
    { id: 'tx_1', time: '10:15 AM', amount: 45, pickup: 'Sector V Metro', drop: 'City Centre 1' },
    { id: 'tx_2', time: '11:40 AM', amount: 65, pickup: 'Karunamoyee', drop: 'City Centre 1' },
    { id: 'tx_3', time: '01:10 PM', amount: 38, pickup: 'RDB Cinemas', drop: 'Webel More' },
  ]);

  const [driverApprovals, setDriverApprovals] = useState<DriverApprovalRequest[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Admin authentication state (Single Administrator Account System)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('toto_admin_authenticated') === 'true';
  });

  const [adminProfile, setAdminProfile] = useState<AdminSafeProfile | null>(null);
  const [adminExistsState, setAdminExistsState] = useState<boolean>(true);

  const [adminCredentials, setAdminCredentials] = useState<{ username: string; passwordHash: string; updatedAt?: string }>(() => {
    const saved = localStorage.getItem('toto_admin_credentials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.username === 'string') {
          return { username: parsed.username, passwordHash: '••••••••', updatedAt: parsed.updatedAt || new Date().toISOString() };
        }
      } catch (e) {
        console.error('Error parsing admin credentials:', e);
      }
    }
    return { username: 'Admin', passwordHash: '••••••••', updatedAt: new Date().toISOString() };
  });

  const refreshAdminStatus = useCallback(async () => {
    try {
      const status = await fetchAdminStatus();
      setAdminExistsState(status.admin_exists);
      if (status.admin_exists) {
        // Attempt session verification
        const session = await verifyAdminSessionApi();
        if (session.authenticated && session.admin) {
          setIsAdminAuthenticated(true);
          setAdminProfile(session.admin);
          setAdminCredentials({
            username: session.admin.username,
            passwordHash: '••••••••',
            updatedAt: session.admin.updated_at
          });
          localStorage.setItem('toto_admin_authenticated', 'true');
        } else {
          setIsAdminAuthenticated(false);
          localStorage.removeItem('toto_admin_authenticated');
        }
      } else {
        setIsAdminAuthenticated(false);
        localStorage.removeItem('toto_admin_authenticated');
      }
    } catch (err) {
      console.warn('Could not refresh admin status:', err);
    }
  }, []);

  useEffect(() => {
    refreshAdminStatus();
  }, [refreshAdminStatus]);

  const setupInitialAdminAccount = async (
    username: string, 
    password: string, 
    confirmPassword: string,
    email?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await setupInitialAdmin({ username, password, confirmPassword, email: email || 'halderkoushik120@gmail.com' });
      setAdminExistsState(true);
      if (res.admin) {
        setAdminProfile(res.admin);
        setAdminCredentials({
          username: res.admin.username,
          passwordHash: '••••••••',
          updatedAt: res.admin.updated_at
        });
      }
      playChime('success');
      return { success: true, message: res.message };
    } catch (err: any) {
      playChime('alert');
      return { success: false, message: err.message || 'Failed to setup administrator account.' };
    }
  };

  const loginAdmin = async (userIdInput: string, passwordInput: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = userIdInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Please enter both Admin username and password.' };
    }

    try {
      const res = await loginAdminApi({ username: cleanId, password: cleanPass });
      setIsAdminAuthenticated(true);
      setAdminProfile(res.admin);
      setAdminCredentials({
        username: res.admin.username,
        passwordHash: '••••••••',
        updatedAt: res.admin.updated_at
      });
      localStorage.setItem('toto_admin_authenticated', 'true');
      playChime('success');
      return { success: true, message: 'Admin authenticated successfully!' };
    } catch (err: any) {
      playChime('alert');
      return { success: false, message: err.message || 'Invalid username or password.' };
    }
  };

  const logoutAdmin = async (): Promise<void> => {
    try {
      await logoutAdminApi();
    } catch {
      // ignore
    }
    setIsAdminAuthenticated(false);
    setAdminProfile(null);
    localStorage.removeItem('toto_admin_authenticated');
    setActiveRole('admin');
    playChime('beep');
  };

  const logoutAllAdminSessions = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await logoutAllAdminSessionsApi();
      setIsAdminAuthenticated(false);
      setAdminProfile(null);
      localStorage.removeItem('toto_admin_authenticated');
      setActiveRole('admin');
      playChime('beep');
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to terminate all sessions.' };
    }
  };

  const updateAdminCredentials = async (
    newUsername: string, 
    newPassword: string, 
    currentPassword?: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedUser = newUsername.trim();
    const trimmedPass = newPassword.trim();

    if (!currentPassword) {
      return { success: false, message: 'Current password is required to verify your identity.' };
    }

    try {
      // 1. Update username if changed
      if (trimmedUser && trimmedUser !== (adminProfile?.username || adminCredentials.username)) {
        const uRes = await changeAdminUsernameApi({
          currentPassword,
          newUsername: trimmedUser
        });
        if (uRes.admin) {
          setAdminProfile(uRes.admin);
          setAdminCredentials(prev => ({ ...prev, username: uRes.admin!.username, updatedAt: uRes.admin!.updated_at }));
        }
      }

      // 2. Update password if provided
      if (trimmedPass) {
        await changeAdminPasswordApi({
          currentPassword,
          newPassword: trimmedPass,
          confirmPassword: trimmedPass
        });
      }

      playChime('success');
      return {
        success: true,
        message: 'Admin credentials updated successfully on single account ADMIN_001.'
      };
    } catch (err: any) {
      playChime('alert');
      return { success: false, message: err.message || 'Failed to update admin credentials.' };
    }
  };

  const updateAdminPassword = async (newPassword: string, currentPassword?: string): Promise<{ success: boolean; message: string }> => {
    return updateAdminCredentials(adminProfile?.username || adminCredentials.username, newPassword, currentPassword);
  };

  // Customer features state (wallet, saved places, safety, support, scheduling)
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('toto_wallet_balance');
    return saved ? Number(saved) : 250;
  });

  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItem[]>([
    {
      id: 'sp_1',
      userId: 'usr_default',
      name: 'Home (Salt Lake)',
      address: 'Block CD, Sector 1, Salt Lake, Kolkata',
      lat: 22.5867,
      lng: 88.4178,
      type: 'home',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sp_2',
      userId: 'usr_default',
      name: 'Office (DLF 2 IT Park)',
      address: 'Action Area II, New Town, Kolkata',
      lat: 22.5936,
      lng: 88.4725,
      type: 'work',
      createdAt: new Date().toISOString()
    }
  ]);

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    {
      id: 'ec_1',
      userId: 'usr_default',
      name: 'Family Member (Rohan)',
      phone: '+91 98311 02458',
      relationship: 'Brother',
      createdAt: new Date().toISOString()
    }
  ]);

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [scheduledRides, setScheduledRides] = useState<ScheduledRide[]>([]);
  const [completedTrips, setCompletedTrips] = useState<TripRecord[]>([
    {
      id: 'trip_101',
      driverId: 'drv_1',
      rideId: 'ride_101',
      fare: 35,
      status: 'completed',
      pickupName: 'Sector V Metro (Gate 2)',
      dropoffName: 'City Centre 1 Mall',
      distanceKm: 1.8,
      completedAt: 'Today, 09:30 AM',
      paymentMethod: 'upi',
      passengerName: 'Passenger'
    },
    {
      id: 'trip_102',
      driverId: 'drv_2',
      rideId: 'ride_102',
      fare: 50,
      status: 'completed',
      pickupName: 'Karunamoyee Central Bus Terminus',
      dropoffName: 'City Centre 1 Mall',
      distanceKm: 2.6,
      completedAt: 'Yesterday, 06:15 PM',
      paymentMethod: 'wallet',
      passengerName: 'Passenger'
    }
  ]);

  // Full Database Collections
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allRides, setAllRides] = useState<ActiveRide[]>([]);
  const [allDrivers, setAllDrivers] = useState<DriverProfile[]>([]);

  const triggerSound = useCallback((type: 'beep' | 'success' | 'alert' | 'click') => {
    playChime(type);
  }, []);

  // Helper to identify and purge known test accounts
  const isTestAccount = (name?: string, id?: string) => {
    if (id === 'drv_subrata_101' || id === 'drv_1') return true;
    if (!name) return false;
    const n = name.toLowerCase();
    return n.includes('subrata roy') || n.includes('bikash naskar') || n.includes('bikram naskar');
  };

  // Authoritative admin data sync between Server API, Firestore, and Local State
  const syncAdminData = useCallback(async () => {
    try {
      // 1. Fetch approvals from authoritative server backend
      const serverRes = await getDriverApprovalsApi().catch(() => null);
      let combinedApprovals: DriverApprovalRequest[] = [];
      if (serverRes?.success && Array.isArray(serverRes.approvals)) {
        combinedApprovals = serverRes.approvals.map((a: any) => ({
          ...a,
          generatedPin: a.assignedPin || a.generatedPin
        }));
      }

      // 2. Fetch approvals from Firestore collection
      const firestoreApprovals = await fetchDriverApprovalsFromFirestore().catch(() => []);
      if (firestoreApprovals.length > 0) {
        const idMap = new Map<string, DriverApprovalRequest>();
        combinedApprovals.forEach((a) => idMap.set(a.id, a));
        firestoreApprovals.forEach((a) => {
          if (idMap.has(a.id)) {
            idMap.set(a.id, { ...idMap.get(a.id)!, ...a });
          } else {
            idMap.set(a.id, a);
          }
        });
        combinedApprovals = Array.from(idMap.values());
      }

      // 3. Fallback to appDb local approvals if remote is empty
      const localApprovals = appDb.getAll<DriverApprovalRequest>('driver_approvals');
      if (combinedApprovals.length === 0 && localApprovals.length > 0) {
        combinedApprovals = localApprovals;
      }

      if (combinedApprovals.length > 0) {
        const sorted = combinedApprovals.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setDriverApprovals(sorted);
        setPendingApprovalsCount(sorted.filter((a) => a.status === 'pending').length);
        sorted.forEach((a) => appDb.set('driver_approvals', a.id, a));
      }

      // 4. Fetch drivers from server API
      const serverDriversRes = await getDriversApi().catch(() => null);
      if (serverDriversRes?.success && Array.isArray(serverDriversRes.drivers)) {
        serverDriversRes.drivers.forEach((d: any) => {
          const profile: DriverProfile = {
            id: d.id,
            name: d.name,
            phone: d.phone,
            vehicleType: 'toto',
            vehicleNumber: 'WB-24-AQ-9812',
            vehicleModel: 'Mayuri Deluxe Li-ion',
            vehicleColor: 'Emerald Green',
            pin: d.pin || '1234',
            approvalStatus: d.accountStatus === 'APPROVED' ? 'approved' : 'pending',
            registeredAt: new Date().toISOString(),
            rating: d.rating || 4.9,
            totalTrips: d.totalTrips || 0,
            batteryPercentage: 92,
            todayEarnings: d.todayEarnings || 0,
            totalEarnings: d.todayEarnings || 0,
            acceptanceRate: 100,
            isOnline: d.status === 'ONLINE',
            avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${d.phone}`,
            kycVerified: d.accountStatus === 'APPROVED',
            currentLat: d.currentLat || 22.5830,
            currentLng: d.currentLng || 88.4350,
            updatedAt: new Date().toISOString()
          };
          appDb.set('drivers', profile.id, profile);
        });
      }

      // 4b. Fetch users from server API
      const serverUsersRes = await getUsersApi().catch(() => null);
      if (serverUsersRes?.success && Array.isArray(serverUsersRes.users)) {
        serverUsersRes.users.forEach((u: any) => {
          if (u && u.id) {
            const profile: UserProfile = {
              id: u.id,
              name: u.name || 'Passenger',
              phone: u.phone || u.mobileNumber || '',
              email: u.email || '',
              rating: u.rating ?? 5.0,
              totalRides: u.totalRides ?? 0,
              walletBalance: u.walletBalance ?? 0,
              status: u.status || 'active',
              avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${u.id}`,
              createdAt: u.createdAt || new Date().toISOString()
            };
            appDb.set('users', profile.id, profile);
          }
        });
      }

      // 5. Fetch Firestore drivers
      const fsDrivers = await fetchDriversFromFirestore().catch(() => []);
      if (fsDrivers.length > 0) {
        fsDrivers.forEach((d) => appDb.set('drivers', d.id, d));
      }

      // 6. Refresh active rides, users, and drivers state
      setAllUsers(appDb.getAll<UserProfile>('users'));
      setAllRides(appDb.getAll<ActiveRide>('rides'));
      const allDrvs = appDb.getAll<DriverProfile>('drivers');
      setAllDrivers(allDrvs);
      setOnlineDrivers(
        allDrvs.filter((d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive')
      );
    } catch (err) {
      console.warn('syncAdminData warning:', err);
    }
  }, []);

  // 1. Real-time pub/sub listeners for Users, Rides, and Drivers
  useEffect(() => {
    // Clean up any known test accounts from local persistence
    try {
      const existingDrivers = appDb.getAll<DriverProfile>('drivers');
      existingDrivers.forEach((d) => {
        if (isTestAccount(d.name, d.id)) {
          appDb.delete('drivers', d.id);
        }
      });

      const existingApprovals = appDb.getAll<DriverApprovalRequest>('driver_approvals');
      existingApprovals.forEach((a) => {
        if (isTestAccount(a.driverName, a.id)) {
          appDb.delete('driver_approvals', a.id);
        }
      });

      const savedDriverStr = localStorage.getItem('toto_saved_driver');
      if (savedDriverStr) {
        const parsed = JSON.parse(savedDriverStr);
        if (isTestAccount(parsed?.name, parsed?.id)) {
          localStorage.removeItem('toto_saved_driver');
        }
      }
    } catch {}

    // Periodic real-time multi-device sync with server authoritative rides
    const syncRidesInterval = setInterval(async () => {
      try {
        const res = await getAllRidesApi().catch(() => null);
        if (res?.success && Array.isArray(res.rides)) {
          setAllRides((prev) => {
            const map = new Map<string, ActiveRide>();
            prev.forEach((r) => map.set(r.id, r));
            res.rides.forEach((r: any) => {
              const mapped: ActiveRide = {
                id: r.id,
                userId: r.userId || '',
                userName: r.userName || '',
                userPhone: r.userPhone || '',
                pickup: r.pickup,
                dropoff: r.dropoff,
                vehicleType: (r.vehicleType || 'toto') as any,
                totalFare: r.fare || r.totalFare || 25,
                basePrice: r.fare || r.basePrice || 25,
                discount: r.discount || 0,
                userRating: r.userRating || 5.0,
                paymentMethod: r.paymentMethod || 'cash',
                paymentStatus: r.paymentStatus || 'pending',
                status: (r.status === 'SEARCHING_DRIVER' || r.status === 'searching'
                  ? 'searching'
                  : r.status === 'DRIVER_ACCEPTED' || r.status === 'driver_assigned'
                  ? 'driver_assigned'
                  : r.status === 'DRIVER_ARRIVING' || r.status === 'driver_arrived'
                  ? 'driver_arrived'
                  : r.status === 'RIDE_STARTED' || r.status === 'in_progress'
                  ? 'in_progress'
                  : r.status === 'RIDE_COMPLETED' || r.status === 'completed'
                  ? 'completed'
                  : (r.status as any)) as any,
                otp: r.otp,
                driverId: r.driverId,
                driverName: r.driverName,
                driverPhone: r.driverPhone,
                vehicleNumber: r.vehicleNumber,
                vehicleModel: r.vehicleModel,
                distanceKm: r.distanceKm || 1,
                estimatedMins: r.estimatedMins || 5,
                driverEarnings: r.driverEarnings || Math.round(r.fare * 0.88),
                bookedAt: r.createdAt || new Date().toISOString(),
                acceptedAt: r.acceptedAt,
                startedAt: r.startedAt,
                completedAt: r.completedAt,
                expiresAt: r.expiresAt
              };
              map.set(r.id, mapped);
              appDb.set('rides', r.id, mapped);
            });
            return Array.from(map.values());
          });
        }
      } catch {}
    }, 2500);

    const unsubUsers = appDb.subscribe<UserProfile>('users', (list) => {
      setAllUsers(list);
    });
    const unsubRides = appDb.subscribe<ActiveRide>('rides', (list) => {
      setAllRides(list);
    });
    const unsubDrivers = appDb.subscribe<DriverProfile>('drivers', (list) => {
      setAllDrivers(list);
      setOnlineDrivers(list.filter((d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive'));
    });

    // Real-time Firestore subscriptions for RIDES, DRIVERS, APPROVALS, and TRIPS
    const unsubFirestoreRides = subscribeToRidesFirestore((remoteRides) => {
      if (remoteRides) {
        setAllRides(remoteRides);
        remoteRides.forEach((r) => appDb.set('rides', r.id, r));
      }
    });

    const unsubFirestoreDrivers = subscribeToDriversFirestore((remoteDrivers) => {
      if (remoteDrivers) {
        setAllDrivers(remoteDrivers);
        remoteDrivers.forEach((d) => appDb.set('drivers', d.id, d));
        setOnlineDrivers(
          remoteDrivers.filter(
            (d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive'
          )
        );
      }
    });

    const unsubFirestoreApprovals = subscribeToDriverApprovalsFirestore((remoteList) => {
      if (remoteList && remoteList.length >= 0) {
        remoteList.forEach((r) => appDb.set('driver_approvals', r.id, r));
        const sorted = [...remoteList].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setDriverApprovals(sorted);
        setPendingApprovalsCount(sorted.filter((a) => a.status === 'pending').length);
      }
    });

    const unsubFirestoreTrips = subscribeToTripsFirestore((remoteTrips) => {
      if (remoteTrips) {
        setCompletedTrips(remoteTrips);
        remoteTrips.forEach((t) => appDb.set('trips', t.id, t));
      }
    });

    // Run initial data sync immediately
    syncAdminData();

    return () => {
      clearInterval(syncRidesInterval);
      unsubUsers();
      unsubRides();
      unsubDrivers();
      unsubFirestoreRides();
      unsubFirestoreDrivers();
      unsubFirestoreApprovals();
      unsubFirestoreTrips();
    };
  }, [syncAdminData]);

  // 2. Real-time listener for driver registration approvals in appDb
  useEffect(() => {
    const unsubscribe = appDb.subscribe<DriverApprovalRequest>('driver_approvals', (list) => {
      let pending = 0;
      list.forEach((item) => {
        if (item.status === 'pending') {
          pending += 1;
        }
      });
      const sorted = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setDriverApprovals(sorted);
      setPendingApprovalsCount(pending);
    });

    return () => unsubscribe();
  }, []);

  // 3. User Authentication state initialization & Supabase Auth Sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('toto_saved_user');
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error reading saved user:', e);
    }
    setIsAuthLoading(false);

    if (!supabase) return;

    // Check current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const targetEmail = u.email || 'ulove2182@gmail.com';
        const targetName = u.user_metadata?.full_name || u.user_metadata?.name || targetEmail.split('@')[0];
        const targetAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        const targetPhone = u.phone || u.user_metadata?.phone || '+91 98301 45289';
        const profileId = 'usr_' + (u.id || targetEmail.replace(/[^a-zA-Z0-9]/g, '_'));

        const profile: UserProfile = {
          id: profileId,
          name: typeof targetName === 'string' ? targetName : 'Passenger',
          phone: typeof targetPhone === 'string' ? targetPhone : '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: targetAvatar,
          createdAt: new Date().toISOString()
        };

        const existing = appDb.get<UserProfile>('users', profileId);
        if (existing) {
          setUser({ ...profile, ...existing });
        } else {
          appDb.set('users', profileId, profile);
          setUser(profile);
        }
      }
    }).catch(console.warn);

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        const u = session.user;
        const targetEmail = u.email || 'ulove2182@gmail.com';
        const targetName = u.user_metadata?.full_name || u.user_metadata?.name || targetEmail.split('@')[0];
        const targetAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        const targetPhone = u.phone || u.user_metadata?.phone || '+91 98301 45289';
        const profileId = 'usr_' + (u.id || targetEmail.replace(/[^a-zA-Z0-9]/g, '_'));

        const profile: UserProfile = {
          id: profileId,
          name: typeof targetName === 'string' ? targetName : 'Passenger',
          phone: typeof targetPhone === 'string' ? targetPhone : '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: targetAvatar,
          createdAt: new Date().toISOString()
        };

        const existing = appDb.get<UserProfile>('users', profileId);
        if (existing) {
          setUser({ ...profile, ...existing });
        } else {
          appDb.set('users', profileId, profile);
          setUser(profile);
        }
        try {
          localStorage.setItem('toto_saved_user', JSON.stringify(profile));
        } catch {}
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 4. Real-time listener on Active Ride across devices
  useEffect(() => {
    const unsubscribe = appDb.subscribe<ActiveRide>('rides', (allRides) => {
      // 1. If currently tracking an active ride, sync its latest status & real driver location
      if (activeRide?.id) {
        const liveRide = allRides.find((r) => r.id === activeRide.id);
        if (liveRide) {
          if (liveRide.status !== activeRide.status) {
            if (liveRide.status === 'driver_assigned') triggerSound('alert');
            else if (liveRide.status === 'driver_arrived') triggerSound('beep');
            else if (liveRide.status === 'completed') triggerSound('success');
          }
          setActiveRide(liveRide);
        }
      } else if (user?.id) {
        // Find if user has any active unfinished ride
        const userLiveRide = allRides.find(
          (r) => r.userId === user.id && r.status !== 'completed' && r.status !== 'cancelled'
        );
        if (userLiveRide) {
          setActiveRide(userLiveRide);
        }
      } else if (driver?.id) {
        // Find if driver has any active unfinished ride
        const driverLiveRide = allRides.find(
          (r) => r.driverId === driver.id && r.status !== 'completed' && r.status !== 'cancelled'
        );
        if (driverLiveRide) {
          setActiveRide(driverLiveRide);
        }
      }
    });

    return () => unsubscribe();
  }, [activeRide?.id, activeRide?.status, user?.id, driver?.id, triggerSound]);

  // 5. Real-time listener for online Toto Captains to receive real ride dispatches
  useEffect(() => {
    if (!driver || !driver.isOnline) {
      setPendingDriverRequest(null);
      return;
    }

    // If driver already has an active ride that is not completed or cancelled, do not dispatch new ones
    if (activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled') {
      setPendingDriverRequest(null);
      return;
    }

    const unsubscribe = appDb.subscribe<ActiveRide>('rides', (allRides) => {
      const now = Date.now();
      const candidates = allRides.filter((r) => {
        const isSearching = r.status === 'searching' || (r.status as any) === 'SEARCHING_DRIVER';
        if (!isSearching) return false;
        // Check if expired
        if (r.expiresAt && new Date(r.expiresAt).getTime() <= now) return false;
        // Check driverId if targeted
        if (r.driverId && r.driverId !== driver.id) return false;
        return true;
      });

      if (candidates.length > 0) {
        // Pick newest searching request
        candidates.sort((a, b) => (b.id > a.id ? 1 : -1));
        const candidate = candidates[0];
        setPendingDriverRequest((prev) => {
          if (!prev || prev.id !== candidate.id) {
            triggerSound('alert');
          }
          return candidate;
        });
      } else {
        setPendingDriverRequest(null);
      }
    });

    return () => unsubscribe();
  }, [driver, activeRide?.status, triggerSound]);

  // Passenger Phone / direct profile login
  const loginUser = async (u: UserProfile) => {
    try {
      const uid = u.id || `usr_${Date.now()}`;
      const profileToSave: UserProfile = {
        ...u,
        id: uid
      };
      appDb.set('users', uid, profileToSave);
      setUser(profileToSave);
      try {
        localStorage.setItem('toto_saved_user', JSON.stringify(profileToSave));
      } catch {}
      triggerSound('success');
    } catch (error) {
      console.error('Error logging in user:', error);
    }
  };

  // Sync Firebase Auth state changes
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          setUser((current) => {
            if (current && current.id === fbUser.uid) return current;
            const cleanPhone = (fbUser.phoneNumber || '').replace(/\D/g, '');
            const syncedUser: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || current?.name || 'Passenger',
              email: fbUser.email || current?.email || '',
              phone: fbUser.phoneNumber || current?.phone || (cleanPhone ? `+91 ${cleanPhone.slice(-10)}` : ''),
              avatarUrl: fbUser.photoURL || current?.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${fbUser.uid}`,
              rating: current?.rating ?? 4.95,
              totalRides: current?.totalRides ?? 0,
              savedPlaces: current?.savedPlaces ?? {},
              walletBalance: current?.walletBalance ?? 250,
              createdAt: current?.createdAt || new Date().toISOString()
            };
            try {
              localStorage.setItem('toto_saved_user', JSON.stringify(syncedUser));
              appDb.set('users', syncedUser.id, syncedUser);
            } catch {}
            return syncedUser;
          });
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase onAuthStateChanged setup notice:', e);
    }
  }, []);

  const logoutUser = async () => {
    try {
      await logOutFromFirebase().catch(() => {});
    } catch {}
    try {
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch {}
    try {
      localStorage.removeItem('toto_saved_user');
    } catch {}
    setUser(null);
    setActiveNavTabState('home');
    triggerSound('beep');
  };

  // Driver Login / Registration with instant state update + background sync
  const loginDriver = async (d: DriverProfile) => {
    const onlineDriver: DriverProfile = {
      ...d,
      isOnline: true,
      availabilityStatus: 'online',
      updatedAt: new Date().toISOString()
    };
    setDriver(onlineDriver);
    try {
      localStorage.setItem('toto_saved_driver', JSON.stringify(onlineDriver));
      localStorage.setItem('toto_active_role', 'driver');
    } catch {}
    setActiveRoleState('driver');
    triggerSound('success');
    appDb.set('drivers', onlineDriver.id, onlineDriver);
    setOnlineDrivers((prev) => {
      const exists = prev.some((item) => item.id === onlineDriver.id);
      return exists ? prev.map((item) => item.id === onlineDriver.id ? onlineDriver : item) : [...prev, onlineDriver];
    });
  };

  const logoutDriver = useCallback(async (targetRole?: AppRole) => {
    // 1. Resolve current driver ID and record
    let currentDriverId = driver?.id;
    let currentDriverData = driver;

    if (!currentDriverId && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('toto_saved_driver');
        if (saved) {
          currentDriverData = JSON.parse(saved);
          currentDriverId = currentDriverData?.id;
        }
      } catch {}
    }

    if (!currentDriverId) {
      const allRegistered = appDb.getAll<DriverProfile>('drivers');
      if (allRegistered.length > 0) {
        currentDriverId = allRegistered[0].id;
        currentDriverData = allRegistered[0];
      }
    }

    if (currentDriverId) {
      const offlineDriver: DriverProfile = {
        ...(currentDriverData || {}),
        id: currentDriverId,
        isOnline: false,
        availabilityStatus: 'inactive',
        lastLocationUpdate: Date.now(),
        updatedAt: new Date().toISOString()
      } as DriverProfile;

      // 2. Immediately update in database (appDb)
      try {
        appDb.set('drivers', currentDriverId, offlineDriver);
      } catch (err) {
        console.error('Error updating driver to inactive in appDb on logout:', err);
      }

      // 3. Sync to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          upsertSupabaseDriver(offlineDriver).catch(() => {});
        } catch {}
      }

      // 4. Trigger reactive UI state update immediately
      setOnlineDrivers((prev) => prev.filter((d) => d.id !== currentDriverId));
      setAllDrivers((prev) =>
        prev.map((d) => (d.id === currentDriverId ? offlineDriver : d))
      );
    } else {
      setOnlineDrivers([]);
    }

    // 5. Clear driver session state & pending requests
    setDriver(null);
    setPendingDriverRequest(null);
    setActiveNavTabState('home');
    const resolvedNextRole: AppRole = targetRole || (activeRole === 'driver' ? 'driver' : 'user');
    try {
      localStorage.removeItem('toto_saved_driver');
      localStorage.removeItem('rapid_toto_driver');
      localStorage.setItem('toto_active_role', resolvedNextRole);
    } catch {}
    setActiveRoleState(resolvedNextRole);
    triggerSound('beep');
  }, [driver, isSupabaseConfigured, triggerSound, activeRole]);

  // Register a new driver approval request in Firestore
  const registerDriverApproval = async (data: {
    driverName: string;
    phone: string;
    vehicleType?: 'toto' | 'bike' | 'auto';
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColor: string;
    driverPhoto?: string;
    totoPhotos?: string[];
  }): Promise<{ approvalId: string; message: string }> => {
    try {
      const cleanPhone = data.phone.trim();
      const approvalId = `appr_${Date.now()}`;
      const driverDocId = `drv_${cleanPhone.replace(/\D/g, '').slice(-6) || Date.now().toString().slice(-6)}`;

      // Defensively compress driverPhoto if needed (guarantee < 65KB)
      let compressedDriverPhoto = data.driverPhoto;
      if (compressedDriverPhoto) {
        compressedDriverPhoto = await compressImageIfNeeded(compressedDriverPhoto, 65 * 1024);
      }

      // Defensively compress totoPhotos (cap at max 3 photos, each guaranteed < 65KB)
      let compressedTotoPhotos: string[] | undefined = undefined;
      if (data.totoPhotos && data.totoPhotos.length > 0) {
        const sliced = data.totoPhotos.slice(0, 3);
        const processed = await Promise.all(
          sliced.map((p) => compressImageIfNeeded(p, 65 * 1024))
        );
        compressedTotoPhotos = processed.filter(Boolean) as string[];
      }

      const approvalDoc: DriverApprovalRequest = {
        id: approvalId,
        driverName: data.driverName.trim(),
        phone: cleanPhone,
        vehicleType: data.vehicleType || 'toto',
        vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
        vehicleModel: data.vehicleModel.trim() || 'Mayuri Deluxe Li-ion',
        vehicleColor: data.vehicleColor.trim() || 'Emerald Green',
        driverPhoto: compressedDriverPhoto || undefined,
        totoPhotos: compressedTotoPhotos && compressedTotoPhotos.length > 0 ? compressedTotoPhotos : undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Safeguard: Ensure document JSON payload is well below 500KB (Firestore limit is 1MB)
      const payloadString = JSON.stringify(approvalDoc);
      if (payloadString.length > 400 * 1024 && approvalDoc.totoPhotos && approvalDoc.totoPhotos.length > 1) {
        approvalDoc.totoPhotos = approvalDoc.totoPhotos.slice(0, 1);
      }

      // Store in driver_approvals collection locally
      appDb.set('driver_approvals', approvalId, approvalDoc);

      // Also create initial record in drivers collection with pending status locally
      const initialDriverDoc: DriverProfile = {
        id: driverDocId,
        name: data.driverName.trim(),
        phone: cleanPhone,
        vehicleType: data.vehicleType || 'toto',
        vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
        vehicleModel: data.vehicleModel.trim() || 'Mayuri Deluxe Li-ion',
        vehicleColor: data.vehicleColor.trim() || 'Emerald Green',
        approvalStatus: 'pending',
        rating: 5.0,
        totalTrips: 0,
        batteryPercentage: 90,
        todayEarnings: 0,
        totalEarnings: 0,
        acceptanceRate: 100,
        isOnline: false,
        avatarUrl: compressedDriverPhoto || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanPhone}`,
        driverPhoto: compressedDriverPhoto || undefined,
        totoPhotos: approvalDoc.totoPhotos,
        totoPhoto: approvalDoc.totoPhotos?.[0] || undefined,
        kycVerified: false,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      appDb.set('drivers', driverDocId, initialDriverDoc);

      // 1. Authoritative Backend sync
      createDriverApprovalApi({
        id: approvalId,
        driverName: approvalDoc.driverName,
        phone: approvalDoc.phone,
        vehicleNumber: approvalDoc.vehicleNumber,
        vehicleModel: approvalDoc.vehicleModel,
        vehicleColor: approvalDoc.vehicleColor,
        vehicleType: approvalDoc.vehicleType,
        driverPhoto: approvalDoc.driverPhoto,
        totoPhotos: approvalDoc.totoPhotos
      }).catch((err) => console.warn('Server create approval warning:', err));

      // 2. Cloud Firestore sync
      saveDriverApprovalToFirestore(approvalDoc).catch((err) => console.warn('Firestore save approval warning:', err));
      saveDriverToFirestore(initialDriverDoc).catch((err) => console.warn('Firestore save driver warning:', err));

      // 3. Update React state immediately
      setDriverApprovals((prev) => {
        const filtered = prev.filter((a) => a.id !== approvalId);
        return [approvalDoc, ...filtered];
      });
      setPendingApprovalsCount((prev) => prev + 1);

      triggerSound('alert');
      return {
        approvalId,
        message: 'Registration request submitted to Admin! Waiting for verification and 4-digit PIN assignment.'
      };
    } catch (error) {
      console.error('Registration request error:', error);
      throw error;
    }
  };

  // Admin approves driver registration & generates unique 4-digit PIN
  const approveDriverRegistration = async (approvalId: string, customPin?: string): Promise<{ pin: string }> => {
    try {
      // Generate random unique 4-digit security pin
      const pin = customPin || Math.floor(1000 + Math.random() * 9000).toString();
      const approvedAt = new Date().toISOString();

      const targetApproval = driverApprovals.find((a) => a.id === approvalId);
      const cleanPhone = (targetApproval?.phone || '').replace(/\D/g, '');
      const driverDocId = `drv_${cleanPhone.slice(-6) || approvalId.slice(-6)}`;

      // 1. Update driver_approvals document locally
      appDb.update('driver_approvals', approvalId, {
        status: 'approved',
        generatedPin: pin,
        approvedAt
      });

      // 2. Update/create DriverProfile in drivers collection with generated PIN locally
      const approvedDriver: DriverProfile = {
        id: driverDocId,
        name: targetApproval?.driverName || 'Toto Captain',
        phone: targetApproval?.phone || '+91 98745 22019',
        vehicleType: targetApproval?.vehicleType || 'toto',
        vehicleNumber: targetApproval?.vehicleNumber || 'WB-19-ER-0001',
        vehicleModel: targetApproval?.vehicleModel || 'Mayuri Deluxe Li-ion',
        vehicleColor: targetApproval?.vehicleColor || 'Emerald Green',
        pin,
        approvalStatus: 'approved',
        registeredAt: targetApproval?.createdAt || approvedAt,
        approvedAt,
        rating: 4.95,
        totalTrips: 0,
        batteryPercentage: 92,
        todayEarnings: 0,
        totalEarnings: 0,
        acceptanceRate: 100,
        isOnline: true,
        avatarUrl: targetApproval?.driverPhoto || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanPhone || approvalId}`,
        driverPhoto: targetApproval?.driverPhoto,
        totoPhotos: targetApproval?.totoPhotos,
        totoPhoto: targetApproval?.totoPhotos?.[0],
        kycVerified: true,
        currentLat: 22.5804,
        currentLng: 88.4378,
        updatedAt: approvedAt
      };
      appDb.set('drivers', driverDocId, approvedDriver);

      // 3. Authoritative server sync
      approveDriverRegistrationApi(approvalId, pin).catch((err) => console.warn('Server approve warning:', err));

      // 4. Cloud Firestore sync
      updateDriverApprovalInFirestore(approvalId, {
        status: 'approved',
        generatedPin: pin,
        approvedAt
      }).catch((err) => console.warn('Firestore approval update warning:', err));
      saveDriverToFirestore(approvedDriver).catch((err) => console.warn('Firestore driver save warning:', err));

      // 5. Update local React state immediately
      setDriverApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? { ...a, status: 'approved', generatedPin: pin, approvedAt }
            : a
        )
      );
      setPendingApprovalsCount((prev) => Math.max(0, prev - 1));
      setAllDrivers((prev) => {
        const filtered = prev.filter((d) => d.id !== driverDocId);
        return [approvedDriver, ...filtered];
      });

      triggerSound('success');
      return { pin };
    } catch (error) {
      console.error('Driver approval error:', error);
      throw error;
    }
  };

  // Admin rejects driver registration
  const rejectDriverRegistration = async (approvalId: string, reason?: string): Promise<void> => {
    try {
      const adminNotes = reason?.trim() || 'Application does not meet current fleet verification criteria.';
      appDb.update('driver_approvals', approvalId, {
        status: 'rejected',
        adminNotes,
        updatedAt: new Date().toISOString()
      });

      // Sync with server backend & Firestore
      rejectDriverRegistrationApi(approvalId, adminNotes).catch((err) => console.warn('Server reject warning:', err));
      updateDriverApprovalInFirestore(approvalId, {
        status: 'rejected',
        adminNotes,
        updatedAt: new Date().toISOString()
      }).catch((err) => console.warn('Firestore reject update warning:', err));

      setDriverApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId ? { ...a, status: 'rejected', adminNotes, updatedAt: new Date().toISOString() } : a
        )
      );
      setPendingApprovalsCount((prev) => Math.max(0, prev - 1));

      triggerSound('alert');
    } catch (error) {
      console.error('Driver rejection error:', error);
      throw error;
    }
  };

  // Admin permanently deletes driver profile (removes from approvals, fleet and local cache)
  const deleteDriverProfile = async (idOrPhone: string): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanDigits = idOrPhone.replace(/\D/g, '');
      const targetApproval = driverApprovals.find(
        (a) => a.id === idOrPhone || (cleanDigits && a.phone.replace(/\D/g, '').endsWith(cleanDigits))
      );
      const approvalDocId = targetApproval ? targetApproval.id : idOrPhone;

      // 1. Delete from driver_approvals locally
      appDb.delete('driver_approvals', approvalDocId);

      // 2. Delete from drivers locally
      const targetDriver = onlineDrivers.find(
        (d) => d.id === idOrPhone || (cleanDigits && d.phone.replace(/\D/g, '').endsWith(cleanDigits))
      );
      const driverDocId = targetDriver ? targetDriver.id : (cleanDigits ? `driver_${cleanDigits}` : idOrPhone);
      appDb.delete('drivers', driverDocId);

      // 3. Sync deletion to server & Firestore
      deleteDriverApprovalApi(approvalDocId).catch((err) => console.warn('Server delete approval warning:', err));
      deleteDriverApprovalFromFirestore(approvalDocId).catch((err) => console.warn('Firestore delete approval warning:', err));
      deleteDriverApi(driverDocId).catch((err) => console.warn('Server delete driver warning:', err));
      deleteDriverApi(idOrPhone).catch((err) => console.warn('Server delete driver warning:', err));

      // Also clean up phone in drivers collection if valid 10 digits
      if (cleanDigits && cleanDigits.length >= 10) {
        const allDrivers = appDb.getAll<DriverProfile>('drivers');
        allDrivers.forEach((d) => {
          const docPhoneDigits = (d.phone || '').replace(/\D/g, '');
          if (docPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(docPhoneDigits)) {
            appDb.delete('drivers', d.id);
          }
        });
      }

      // 3. Update local state immediately
      setDriverApprovals((prev) =>
        prev.filter(
          (a) => a.id !== approvalDocId && (!cleanDigits || !a.phone.replace(/\D/g, '').endsWith(cleanDigits))
        )
      );
      setOnlineDrivers((prev) =>
        prev.filter(
          (d) => d.id !== driverDocId && (!cleanDigits || !d.phone.replace(/\D/g, '').endsWith(cleanDigits))
        )
      );

      // 4. Logout driver if the current active session matches deleted driver
      if (
        driver &&
        (driver.id === driverDocId || (cleanDigits && driver.phone.replace(/\D/g, '').endsWith(cleanDigits)))
      ) {
        setDriver(null);
        localStorage.removeItem('rapid_toto_driver');
      }

      triggerSound('alert');
      return { success: true, message: 'Driver profile deleted successfully.' };
    } catch (error) {
      console.error('Delete driver error:', error);
      throw error;
    }
  };

  // Phone + 4-digit PIN Driver Login
  const loginDriverWithPin = async (phone: string, pin: string): Promise<{ success: boolean; message?: string; isPendingApproval?: boolean }> => {
    const cleanDigits = phone.replace(/\D/g, '');
    const cleanPin = pin.trim();

    if (!cleanDigits || cleanDigits.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' };
    }
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, message: 'Please enter a valid 4-digit security PIN' };
    }

    try {
      // 1. Query drivers collection
      const allDrivers = appDb.getAll<DriverProfile>('drivers');
      const matchedDriver = allDrivers.find((d) => {
        const dPhoneDigits = (d.phone || '').replace(/\D/g, '');
        return dPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(dPhoneDigits);
      });

      if (matchedDriver) {
        const driverDoc = matchedDriver as DriverProfile;
        if (driverDoc.approvalStatus === 'pending') {
          return {
            success: false,
            isPendingApproval: true,
            message: 'Your Toto registration is pending Admin Approval. Please await admin review.'
          };
        }
        if (driverDoc.approvalStatus === 'rejected') {
          return {
            success: false,
            message: 'Your Toto registration was rejected by Admin.'
          };
        }
        const expectedPin = driverDoc.pin;
        if (expectedPin && expectedPin === cleanPin) {
          await loginDriver(driverDoc);
          return { success: true };
        } else {
          return { success: false, message: 'Incorrect 4-digit PIN. Please verify your security PIN.' };
        }
      }

      // 2. Query driver_approvals collection
      const allApprovals = appDb.getAll<DriverApprovalRequest>('driver_approvals');
      const matchedAppr = allApprovals.find((a) => {
        const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
        return aPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneDigits);
      }) || driverApprovals.find((a) => {
        const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
        return aPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneDigits);
      });

      if (matchedAppr) {
        const appr = matchedAppr as DriverApprovalRequest;
        if (appr.status === 'pending') {
          return {
            success: false,
            isPendingApproval: true,
            message: 'Registration is pending admin verification. An admin will review and assign your 4-digit PIN.'
          };
        }
        if (appr.status === 'approved') {
          const expectedPin = appr.generatedPin;
          if (expectedPin && expectedPin === cleanPin) {
            const newDriver: DriverProfile = {
              id: `drv_${cleanDigits.slice(-6)}`,
              name: appr.driverName,
              phone: appr.phone,
              vehicleType: appr.vehicleType || 'toto',
              vehicleNumber: appr.vehicleNumber,
              vehicleModel: appr.vehicleModel,
              vehicleColor: appr.vehicleColor,
              pin: cleanPin,
              approvalStatus: 'approved',
              rating: 4.94,
              totalTrips: 0,
              batteryPercentage: 92,
              todayEarnings: 0,
              totalEarnings: 0,
              acceptanceRate: 100,
              isOnline: true,
              avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${cleanDigits}`,
              kycVerified: true,
              currentLat: 22.5804,
              currentLng: 88.4378,
              updatedAt: new Date().toISOString()
            };
            await loginDriver(newDriver);
            return { success: true };
          } else {
            return { success: false, message: 'Incorrect 4-digit security PIN.' };
          }
        }
      }

      return {
        success: false,
        message: 'No driver found with this phone number. Please register your Toto first.'
      };
    } catch (err) {
      console.error('Error in loginDriverWithPin:', err);
      return { success: false, message: 'Connection error while checking credentials.' };
    }
  };

  // Driver updates vehicle details (registration, model, color)
  const updateDriverVehicleDetails = async (details: {
    vehicleNumber?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    batteryPercentage?: number;
    upiId?: string;
  }) => {
    if (!driver) return;
    const updated: DriverProfile = {
      ...driver,
      ...(details.vehicleNumber ? { vehicleNumber: details.vehicleNumber.trim().toUpperCase() } : {}),
      ...(details.vehicleModel ? { vehicleModel: details.vehicleModel.trim() } : {}),
      ...(details.vehicleColor ? { vehicleColor: details.vehicleColor.trim() } : {}),
      ...(typeof details.batteryPercentage === 'number' ? { batteryPercentage: details.batteryPercentage } : {}),
      ...(details.upiId !== undefined ? { upiId: details.upiId.trim() } : {}),
      updatedAt: new Date().toISOString()
    };
    setDriver(updated);
    try {
      appDb.set('drivers', driver.id, updated);
      triggerSound('beep');
    } catch (error) {
      console.error('Update driver details error:', error);
      throw error;
    }
  };

  // Real-time ride request dispatch helper
  const dispatchRideRequest = async (req: Partial<RideRequestDoc>) => {
    const reqId = req.id || `req_${Date.now()}`;
    const docData: RideRequestDoc = {
      id: reqId,
      rideId: req.rideId || `ride_${Date.now()}`,
      driverId: req.driverId || driver?.id || 'all',
      passengerName: req.passengerName || 'Moumita Sen',
      pickupName: req.pickupName || 'Sector V Metro (Gate 2)',
      dropoffName: req.dropoffName || 'City Centre 1 Mall',
      fare: req.fare || 45,
      distanceKm: req.distanceKm || 1.8,
      status: req.status || 'searching',
      createdAt: new Date().toISOString()
    };
    try {
      appDb.set('rideRequests', reqId, docData);
      triggerSound('alert');
    } catch (err) {
      console.warn('Dispatch ride request error:', err);
    }
  };

  const setDriverOnlineStatus = async (isOnline: boolean) => {
    if (!driver) return;

    // Authoritative backend validation: checks driver approval status, verified vehicle, and active service areas
    try {
      const backendRes = await driverToggleOnlineApi(driver.id, isOnline, driver.currentLat, driver.currentLng);
      if (!backendRes.success && isOnline) {
        alert(backendRes.message);
        return;
      }
    } catch (err: any) {
      console.warn('Backend toggle online advisory:', err.message);
    }

    const updated: DriverProfile = { 
      ...driver, 
      isOnline, 
      availabilityStatus: isOnline ? 'online' : 'inactive',
      lastLocationUpdate: Date.now(),
      updatedAt: new Date().toISOString() 
    };
    setDriver(updated);
    try {
      localStorage.setItem('toto_saved_driver', JSON.stringify(updated));
    } catch {}
    try {
      appDb.set('drivers', driver.id, updated);
      if (isOnline) {
        setOnlineDrivers((prev) => {
          const exists = prev.some((item) => item.id === updated.id);
          return exists ? prev.map((item) => item.id === updated.id ? updated : item) : [...prev, updated];
        });
      } else {
        setOnlineDrivers((prev) => prev.filter((item) => item.id !== updated.id));
      }
      setAllDrivers((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      if (isSupabaseConfigured) {
        upsertSupabaseDriver(updated).catch(() => {});
      }
      triggerSound('beep');
    } catch (error) {
      console.error('Update driver online status error:', error);
      throw error;
    }
  };

  const updateUserGpsPoint = useCallback((point: GeoPoint) => {
    setUserGpsPoint((prev) => {
      if (prev && prev.lat === point.lat && prev.lng === point.lng && prev.name === point.name) {
        return prev;
      }
      return point;
    });
  }, []);

  const updateDriverGpsPoint = useCallback(async (point: GeoPoint) => {
    let computedHeading = 0;
    setDriverGpsPoint((prev) => {
      if (prev && (prev.lat !== point.lat || prev.lng !== point.lng)) {
        computedHeading = calculateBearing(prev.lat, prev.lng, point.lat, point.lng);
      } else if (prev) {
        return prev;
      }
      return point;
    });

    if (driver) {
      const headingToUse = computedHeading || driver.heading || 0;
      const nowTimestamp = Date.now();
      const updatedDriver: DriverProfile = {
        ...driver,
        currentLat: point.lat,
        currentLng: point.lng,
        heading: headingToUse,
        lastLocationUpdate: nowTimestamp,
        updatedAt: new Date().toISOString()
      };
      setDriver(updatedDriver);

      try {
        appDb.update('drivers', driver.id, {
          currentLat: point.lat,
          currentLng: point.lng,
          heading: headingToUse,
          lastLocationUpdate: nowTimestamp,
          updatedAt: new Date().toISOString()
        });
        // Push authoritative real-time GPS location to backend
        updateDriverLocationApi(driver.id, {
          lat: point.lat,
          lng: point.lng,
          heading: headingToUse
        }).then(res => {
          if (res && res.rideUpdated && activeRide && activeRide.status === 'driver_assigned') {
            // Geofence auto-arrival triggered
            setActiveRide(r => r ? { ...r, status: 'driver_arriving' } : null);
          }
        }).catch(() => {});
      } catch {
        // Non-blocking
      }

      // If active ride is assigned to this driver, push live location to the ride document
      if (activeRide && activeRide.driverId === driver.id && activeRide.status !== 'completed' && activeRide.status !== 'cancelled') {
        const liveLoc = {
          lat: point.lat,
          lng: point.lng,
          heading: headingToUse,
          timestamp: nowTimestamp
        };
        setActiveRide((r) => r ? { ...r, driverLocation: liveLoc } : null);
        try {
          appDb.update('rides', activeRide.id, {
            driverLocation: liveLoc
          });
        } catch {
          // Non-blocking
        }
      }
    }
  }, [driver, activeRide]);

  const cancelOfferSearch = useCallback(() => {
    setAvailableTotoOffers([]);
    setIsScanningOffers(false);
    setSelectedOffer(null);
  }, []);

  // Find dynamic bids/offers from registered online Toto Partners (Real fleet only)
  const findNearbyTotoOffers = useCallback((
    pickup: GeoPoint,
    dropoff: GeoPoint,
    promoCode?: string
  ) => {
    setIsScanningOffers(true);
    setAvailableTotoOffers([]);
    triggerSound('beep');

    const distanceKm = calculateDistanceKm(pickup, dropoff);

    // Query real online registered drivers with fresh GPS fixes
    const driversToUse = onlineDrivers.filter((d) => 
      d.isOnline && 
      d.availabilityStatus !== 'busy' && 
      d.availabilityStatus !== 'offline' && 
      d.availabilityStatus !== 'inactive' &&
      isDriverLocationFresh(d.lastLocationUpdate || d.updatedAt)
    );

    const offers: TotoPartnerOffer[] = driversToUse.slice(0, 5).map((d, index) => {
      const driverLoc = { lat: d.currentLat || 22.5804, lng: d.currentLng || 88.4378 };
      const distToPickupKm = calculateDistanceKm(driverLoc, pickup);
      const etaMins = Math.max(1, Math.round(distToPickupKm * 3.2));
      const base = 20 + Math.round(distanceKm * 12);
      const discount = promoCode && PROMO_CODES[promoCode] ? 5 : 0;
      const offerTags = ['Fastest Arrival ⚡', 'Top Rated Captain 🌟', 'Verified Toto 🏷️', 'Eco Green 🚀'];

      return {
        driverId: d.id,
        driverName: d.name,
        driverPhone: d.phone,
        driverPhoto: d.avatarUrl || d.photoUrl,
        vehicleNumber: d.vehicleNumber,
        vehicleModel: d.vehicleModel,
        rating: d.rating || 4.9,
        totalTrips: d.totalTrips || 0,
        batteryPercentage: d.batteryPercentage || 90,
        distanceMeters: Math.round(distToPickupKm * 1000),
        etaMins,
        price: Math.max(20, base - discount),
        originalPrice: base,
        discount,
        offerTag: offerTags[index % offerTags.length],
        driverLat: driverLoc.lat,
        driverLng: driverLoc.lng
      };
    });

    setAvailableTotoOffers(offers);
    setIsScanningOffers(false);
    if (offers.length > 0) {
      triggerSound('success');
    }
  }, [onlineDrivers, triggerSound]);

  // Passenger selects specific price & Toto Partner and saves ride
  const selectTotoOfferAndBook = async (
    offer: TotoPartnerOffer,
    pickup: GeoPoint,
    dropoff: GeoPoint,
    paymentMethod: 'cash' | 'upi' | 'wallet'
  ): Promise<ActiveRide> => {
    const distanceKm = calculateDistanceKm(pickup, dropoff);
    const estimatedMins = offer.etaMins + calculateEstimatedMinutes(distanceKm, 'toto');
    const totalFare = offer.price;
    const driverEarnings = Math.round(totalFare * 0.90);
    const rideId = `ride_${Date.now().toString().slice(-6)}`;

    // Compute real road route
    let routePoints: { lat: number; lng: number }[] = [];
    try {
      const roadRoute = await fetchRouteBetweenPoints(pickup, dropoff);
      if (roadRoute.coordinates && roadRoute.coordinates.length > 0) {
        routePoints = roadRoute.coordinates.map(([lat, lng]) => ({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        }));
      }
    } catch {
      // Non-blocking
    }

    const newRide: ActiveRide = {
      id: rideId,
      userId: user?.id || 'usr_passenger',
      userName: user?.name || 'Passenger',
      userPhone: user?.phone || '+91 98301 45289',
      userRating: user?.rating || 4.9,
      vehicleType: 'toto',
      driverId: offer.driverId,
      driverName: offer.driverName,
      driverPhone: offer.driverPhone,
      driverPhoto: offer.driverPhoto,
      vehicleNumber: offer.vehicleNumber,
      vehicleModel: offer.vehicleModel,
      pickup,
      dropoff,
      distanceKm,
      estimatedMins,
      basePrice: offer.originalPrice,
      discount: offer.discount,
      totalFare,
      driverEarnings,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'searching',
      otp: generate4DigitOtp(),
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selectedOfferTag: offer.offerTag,
      routeCoordinates: routePoints,
      driverLocation: {
        lat: offer.driverLat,
        lng: offer.driverLng
      }
    };

    setActiveRide(newRide);
    setSelectedOffer(offer);
    setAvailableTotoOffers([]);
    triggerSound('alert');

    // Persist real-time ride document
    try {
      appDb.set('rides', rideId, newRide);
    } catch (error) {
      console.error('Ride booking persistence error:', error);
    }

    return newRide;
  };

  // Standard createRideBooking with Authoritative Backend Matching & Pricing
  const createRideBooking = async (
    pickup: GeoPoint,
    dropoff: GeoPoint,
    vehicleType: VehicleOption['id'],
    paymentMethod: 'cash' | 'upi' | 'wallet',
    promoCode?: string
  ): Promise<ActiveRide> => {
    // 1. Try authoritative backend creation
    try {
      const backendRes = await createRideRequestApi({
        userId: user?.id || 'usr_passenger',
        userName: user?.name || 'Passenger',
        userPhone: user?.phone || '+91 98301 45289',
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address || pickup.name, name: pickup.name },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address || dropoff.name, name: dropoff.name },
        vehicleType,
        paymentMethod,
        promoCode
      });

      if (backendRes.ride) {
        const r = backendRes.ride;
        const newRide: ActiveRide = {
          id: r.id,
          userId: r.userId,
          userName: r.userName,
          userPhone: r.userPhone,
          userRating: 4.9,
          vehicleType: r.vehicleType as any,
          driverId: r.driverId || undefined,
          driverName: r.driverName,
          driverPhone: r.driverPhone,
          vehicleNumber: r.vehicleNumber,
          vehicleModel: r.vehicleModel,
          pickup,
          dropoff,
          distanceKm: r.distanceKm,
          estimatedMins: r.estimatedDurationMins,
          basePrice: r.baseFare + r.distanceFare + r.timeFare,
          discount: r.discount,
          totalFare: r.finalFare,
          driverEarnings: r.driverEarnings,
          paymentMethod: r.paymentMethod,
          paymentStatus: 'pending',
          status: r.status === 'NO_DRIVER_AVAILABLE' ? ('no_driver_accepted' as any) : 'searching',
          otp: r.otp,
          bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: r.createdAt || new Date().toISOString(),
          expiresAt: r.expiresAt || new Date(Date.now() + 45 * 1000).toISOString(),
          driverLocation: r.driverLocation ? {
            lat: r.driverLocation.lat,
            lng: r.driverLocation.lng,
            heading: r.driverLocation.heading || 0,
            timestamp: r.driverLocation.timestamp || Date.now()
          } : undefined
        };

        setActiveRide(newRide);
        triggerSound('alert');
        try {
          appDb.set('rides', newRide.id, newRide);
          saveRideToFirestore(newRide).catch((err) => console.warn('Firestore save ride warning:', err));
        } catch {}
        return newRide;
      }
    } catch (err: any) {
      console.warn('Backend ride booking advisory:', err.message);
    }

    // Local fallback if server unreachable
    const distanceKm = calculateDistanceKm(pickup, dropoff);
    const estimatedMins = calculateEstimatedMinutes(distanceKm, vehicleType);
    const vehicle = VEHICLE_OPTIONS.find((v) => v.id === vehicleType) || VEHICLE_OPTIONS[0];

    const baseFare = vehicle.baseFare;
    const distanceCost = distanceKm * vehicle.perKmRate;
    const subtotal = Math.round(baseFare + distanceCost);

    let discount = 0;
    if (promoCode && PROMO_CODES[promoCode]) {
      const p = PROMO_CODES[promoCode];
      discount = Math.min(p.maxDiscount, Math.round((subtotal * p.discountPct) / 100));
    }

    const totalFare = Math.max(15, subtotal - discount);
    const driverEarnings = Math.round(totalFare * 0.88);
    const rideId = `ride_${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 45 * 1000).toISOString();

    const newRide: ActiveRide = {
      id: rideId,
      userId: user?.id || 'usr_passenger',
      userName: user?.name || 'Passenger',
      userPhone: user?.phone || '+91 98301 45289',
      userRating: user?.rating || 4.9,
      vehicleType,
      pickup,
      dropoff,
      distanceKm,
      estimatedMins,
      basePrice: subtotal,
      discount,
      totalFare,
      driverEarnings,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'searching',
      otp: generate4DigitOtp(),
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
      expiresAt: expiresAtIso
    };

    setActiveRide(newRide);
    triggerSound('alert');

    try {
      appDb.set('rides', rideId, newRide);
      saveRideToFirestore(newRide).catch((err) => console.warn('Firestore save ride warning:', err));
    } catch (error) {
      console.error('Error creating ride booking:', error);
    }

    return newRide;
  };

  // Driver Accepts Ride with double accept protection and expiration verification
  const driverAcceptRide = async (rideId: string): Promise<{ success: boolean; message?: string }> => {
    if (!driver) return { success: false, message: 'Driver not found.' };
    const current = pendingDriverRequest || (activeRide && activeRide.id === rideId ? activeRide : null) || allRides.find((r) => r.id === rideId);
    if (!current || current.id !== rideId) {
      setPendingDriverRequest(null);
      return { success: false, message: 'Ride request no longer available.' };
    }

    // Atomic double-accept check against local state
    if (current.driverId && current.driverId !== driver.id) {
      setPendingDriverRequest(null);
      triggerSound('alert');
      return { success: false, message: 'Ride already accepted by another Captain' };
    }

    const isSearching = current.status === 'searching' || (current.status as any) === 'SEARCHING_DRIVER';
    if (!isSearching) {
      setPendingDriverRequest(null);
      triggerSound('alert');
      return { success: false, message: 'Ride already accepted by another Captain' };
    }

    // Check if expired
    if (current.expiresAt && new Date(current.expiresAt).getTime() <= Date.now()) {
      setPendingDriverRequest(null);
      triggerSound('alert');
      return { success: false, message: 'This ride request has expired' };
    }

    // Call atomic acceptance API on backend
    try {
      const res = await driverAcceptRideApi(rideId, driver.id, {
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicleType: driver.vehicleType,
          vehicleNumber: driver.vehicleNumber,
          vehicleModel: driver.vehicleModel,
          currentLat: driver.currentLat,
          currentLng: driver.currentLng,
          rating: driver.rating
        },
        ride: current
      });
      if (!res.success) {
        setPendingDriverRequest(null);
        triggerSound('alert');
        return { success: false, message: res.message || 'Ride already accepted by another Captain' };
      }
    } catch (err: any) {
      // Backend rejected: already claimed by another driver or expired!
      setPendingDriverRequest(null);
      triggerSound('alert');
      return { success: false, message: err.message || 'Ride already accepted by another Captain' };
    }

    const assignedDriver = driver;
    const acceptedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const driverLocation = {
      lat: assignedDriver.currentLat || current.pickup.lat,
      lng: assignedDriver.currentLng || current.pickup.lng,
      heading: assignedDriver.heading || 0,
      timestamp: Date.now()
    };

    const updates = {
      driverId: assignedDriver.id,
      driverName: assignedDriver.name,
      driverPhone: assignedDriver.phone,
      driverPhoto: assignedDriver.avatarUrl || assignedDriver.photoUrl,
      vehicleNumber: assignedDriver.vehicleNumber,
      vehicleModel: assignedDriver.vehicleModel,
      vehicleType: assignedDriver.vehicleType,
      status: 'driver_assigned' as const,
      acceptedAt,
      driverLocation
    };

    setActiveRide({ ...current, ...updates });
    setPendingDriverRequest(null);
    triggerSound('success');

    try {
      appDb.update('rides', rideId, updates);
      updateRideInFirestore(rideId, updates).catch((err) => console.warn('Firestore update ride warning:', err));
      updateDriverInFirestore(assignedDriver.id, {
        availabilityStatus: 'busy',
        currentRideId: rideId,
        updatedAt: new Date().toISOString()
      }).catch((err) => console.warn('Firestore update driver busy warning:', err));
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
    return { success: true };
  };

  // Expire Ride when passenger waiting countdown ends
  const expireRideBooking = async (rideId: string) => {
    try {
      await expireRideApi(rideId).catch(() => {});
    } catch {}
    const updates = {
      status: 'no_driver_accepted' as const
    };
    if (activeRide && activeRide.id === rideId) {
      setActiveRide((prev) => prev ? { ...prev, ...updates } : null);
    }
    if (pendingDriverRequest && pendingDriverRequest.id === rideId) {
      setPendingDriverRequest(null);
    }
    try {
      appDb.update('rides', rideId, updates);
      updateRideInFirestore(rideId, updates).catch(() => {});
    } catch {}
  };

  const driverDeclineRide = (_rideId: string) => {
    setPendingDriverRequest(null);
    triggerSound('beep');
  };

  // Driver Arrives at Pickup Location (Enforces server geofence validation)
  const driverArriveAtPickup = async (): Promise<{ success: boolean; message?: string }> => {
    if (!activeRide) return { success: false, message: 'No active ride found.' };

    if (driver) {
      try {
        const res = await driverArrivedApi(activeRide.id, driver.id, driver.currentLat, driver.currentLng);
        if (!res.success) {
          triggerSound('alert');
          return { success: false, message: res.message || 'Outside arrival geofence.' };
        }
      } catch (err: any) {
        triggerSound('alert');
        return { success: false, message: err.message || 'Outside arrival geofence.' };
      }
    }

    const updates = {
      status: 'driver_arrived' as const,
      arrivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      driverLocation: {
        lat: driver?.currentLat || activeRide.pickup.lat,
        lng: driver?.currentLng || activeRide.pickup.lng,
        heading: driver?.heading || 0,
        timestamp: Date.now()
      }
    };
    setActiveRide({ ...activeRide, ...updates });
    triggerSound('beep');

    try {
      appDb.update('rides', activeRide.id, updates);
      updateRideInFirestore(activeRide.id, updates).catch((err) => console.warn('Firestore update ride warning:', err));
    } catch (error) {
      console.error('Error updating driver arrival:', error);
    }
    return { success: true };
  };

  // Driver Verifies OTP & Starts Ride (Server-Authoritative Validation)
  const driverStartRideWithOtp = async (otpInput: string): Promise<{ success: boolean; message: string }> => {
    if (!activeRide) return { success: false, message: 'No active ride found' };

    const cleanInput = otpInput.trim();
    if (!cleanInput || cleanInput.length !== 4) {
      return { success: false, message: 'Please enter a 4-digit OTP' };
    }

    if (driver) {
      try {
        const res = await driverStartRideApi(activeRide.id, driver.id, cleanInput);
        if (!res.success) {
          triggerSound('alert');
          return { success: false, message: res.message || 'Incorrect 4-digit OTP' };
        }
      } catch (err: any) {
        triggerSound('alert');
        return { success: false, message: err.message || 'Incorrect 4-digit OTP' };
      }
    }

    const updates = {
      status: 'in_progress' as const,
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActiveRide({ ...activeRide, ...updates });
    triggerSound('success');

    try {
      appDb.update('rides', activeRide.id, updates);
      updateRideInFirestore(activeRide.id, updates).catch((err) => console.warn('Firestore update ride warning:', err));
    } catch (error) {
      console.error('Error starting ride with OTP:', error);
    }

    return { success: true, message: 'OTP verified! Ride started.' };
  };

  // Driver Completes Ride & Stores Earnings
  const driverCompleteRide = async () => {
    if (!activeRide) return;

    if (driver) {
      try {
        await driverCompleteRideApi(activeRide.id, driver.id, activeRide.distanceKm, activeRide.estimatedMins);
      } catch (err: any) {
        console.warn('Backend complete ride advisory:', err.message);
      }
    }

    const completedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const earningAmount = activeRide.driverEarnings || Math.round(activeRide.totalFare * 0.88);

    const rideUpdates = {
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      completedAt: completedTime,
      driverLocation: {
        lat: activeRide.dropoff.lat,
        lng: activeRide.dropoff.lng,
        heading: driver?.heading || 0,
        timestamp: Date.now()
      },
    };

    setActiveRide({ ...activeRide, ...rideUpdates });
    triggerSound('success');

    // 1. Update ride in db & Firestore
    try {
      appDb.update('rides', activeRide.id, rideUpdates);
      updateRideInFirestore(activeRide.id, rideUpdates).catch((err) => console.warn('Firestore update ride warning:', err));
    } catch (error) {
      console.error('Error completing ride:', error);
    }

    // 2. Persist earnings record
    const earningId = `tx_${Date.now()}`;
    const newTx = {
      id: earningId,
      driverId: driver?.id || activeRide.driverId || 'drv_general',
      rideId: activeRide.id,
      time: completedTime,
      amount: earningAmount,
      pickup: activeRide.pickup.name,
      drop: activeRide.dropoff.name,
      createdAt: new Date().toISOString()
    };

    setEarningsHistory((prev) => [newTx, ...prev]);

    try {
      appDb.set('earnings', earningId, newTx);
    } catch (error) {
      console.error('Error recording earnings:', error);
    }

    // 2b. Persist completed trip in `trips` collection in appDb & Firestore
    const tripId = `trip_${Date.now()}`;
    const tripData: TripRecord = {
      id: tripId,
      driverId: driver?.id || activeRide.driverId || 'drv_general',
      rideId: activeRide.id,
      fare: earningAmount,
      status: 'completed',
      pickupName: activeRide.pickup.name,
      dropoffName: activeRide.dropoff.name,
      distanceKm: activeRide.distanceKm || 2.4,
      completedAt: new Date().toISOString(),
      paymentMethod: activeRide.paymentMethod || 'cash',
      passengerName: activeRide.userName || 'Passenger'
    };
    try {
      appDb.set('trips', tripId, tripData);
      saveTripToFirestore(tripData).catch((err) => console.warn('Firestore save trip warning:', err));
    } catch (err) {
      console.warn('Error persisting trip record:', err);
    }

    // 3. Update driver earnings and set back to available/online in appDb & Firestore
    if (driver) {
      const updatedDriver = {
        ...driver,
        todayEarnings: (driver.todayEarnings || 0) + earningAmount,
        totalEarnings: (driver.totalEarnings || 0) + earningAmount,
        totalTrips: (driver.totalTrips || 0) + 1,
        availabilityStatus: 'online' as const,
        currentRideId: undefined
      };
      setDriver(updatedDriver);
      try {
        appDb.update('drivers', driver.id, {
          todayEarnings: updatedDriver.todayEarnings,
          totalEarnings: updatedDriver.totalEarnings,
          totalTrips: updatedDriver.totalTrips,
          availabilityStatus: 'online',
          updatedAt: new Date().toISOString()
        });
        updateDriverInFirestore(driver.id, {
          todayEarnings: updatedDriver.todayEarnings,
          totalEarnings: updatedDriver.totalEarnings,
          totalTrips: updatedDriver.totalTrips,
          availabilityStatus: 'online',
          currentRideId: null,
          updatedAt: new Date().toISOString()
        }).catch((err) => console.warn('Firestore update driver complete warning:', err));
      } catch {
        // Non-blocking
      }
    }
  };

  // Advance Ride Stage (demo helper deprecated in production)
  const advanceRideStage = async () => {
    if (!activeRide) return;
    if (activeRide.status === 'in_progress') {
      await driverCompleteRide();
    }
  };

  // Authoritative Ride Payment Settlement
  const settleRidePayment = async (rideId: string, paymentMethod: 'cash' | 'upi' | 'wallet'): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await settleRidePaymentApi(rideId, paymentMethod);
      if (res.success) {
        if (activeRide && activeRide.id === rideId) {
          setActiveRide((prev) => prev ? {
            ...prev,
            paymentMethod,
            paymentStatus: 'paid'
          } : null);
        }
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Payment settlement failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Payment settlement error' };
    }
  };

  // Passenger Rates Ride
  const rateRide = async (rating: number, feedback: string) => {
    if (!activeRide) return;

    try {
      await submitRatingApi({
        rideId: activeRide.id,
        fromUserId: user?.id || 'usr_passenger',
        toUserId: activeRide.driverId || 'drv_1',
        fromRole: 'customer',
        rating,
        comment: feedback
      });
    } catch (err: any) {
      console.warn('Backend submit rating advisory:', err.message);
    }

    try {
      appDb.update('rides', activeRide.id, {
        passengerRating: rating,
        passengerFeedback: feedback,
      });
      updateRideInFirestore(activeRide.id, {
        passengerRating: rating,
        passengerFeedback: feedback,
      }).catch(() => {});
    } catch {
      // Non-blocking
    }
    setActiveRide(null);
  };

  // Cancel Active Ride
  const cancelRide = async (reason?: string) => {
    if (activeRide) {
      try {
        await cancelRideApi(activeRide.id, activeRole === 'driver' ? 'driver' : 'customer', reason);
      } catch (err: any) {
        console.warn('Backend cancel ride advisory:', err.message);
      }

      try {
        appDb.update('rides', activeRide.id, {
          status: 'cancelled'
        });
        updateRideInFirestore(activeRide.id, {
          status: 'cancelled'
        }).catch(() => {});

        if (activeRide.driverId) {
          updateDriverInFirestore(activeRide.driverId, {
            availabilityStatus: 'online',
            currentRideId: null,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }
      } catch {
        // Non-blocking
      }
    }
    setActiveRide(null);
    setPendingDriverRequest(null);
    triggerSound('beep');
  };

  const addMoneyToWallet = async (_amount: number) => {
    // Financial integrity rule: wallet balances cannot be incremented client-side without a verified YouPI transaction.
    // Recharges must open the YouPI Gateway modal and settle via bank UTR or webhook.
    await refreshWalletBalance();
    triggerSound('beep');
  };

  const refreshWalletBalance = async (): Promise<number> => {
    try {
      const userId = user?.id || 'usr_passenger';
      const res = await fetch(`/api/wallets/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          const bal = Number(data.wallet.balance);
          setWalletBalance(bal);
          localStorage.setItem('toto_wallet_balance', bal.toString());
          if (user) {
            const updatedUser: UserProfile = { ...user, walletBalance: bal };
            setUser(updatedUser);
            localStorage.setItem('toto_saved_user', JSON.stringify(updatedUser));
            appDb.update('users', user.id, { walletBalance: bal });
          }
          return bal;
        }
      }
    } catch (e) {
      console.warn('Wallet balance sync error:', e);
    }
    return walletBalance;
  };

  const addSavedPlace = async (place: Omit<SavedPlaceItem, 'id' | 'createdAt'>) => {
    const newPlace: SavedPlaceItem = {
      ...place,
      id: `sp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSavedPlaces((prev) => [newPlace, ...prev]);
    try {
      appDb.set('saved_places', newPlace.id, newPlace);
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const deleteSavedPlace = async (placeId: string) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== placeId));
    try {
      appDb.delete('saved_places', placeId);
    } catch {
      // Offline fallback
    }
  };

  const addEmergencyContact = async (name: string, phone: string, relationship: string) => {
    const contact: EmergencyContact = {
      id: `ec_${Date.now()}`,
      userId: user?.id || 'usr_passenger',
      name,
      phone,
      relationship,
      createdAt: new Date().toISOString()
    };
    setEmergencyContacts((prev) => [...prev, contact]);
    try {
      appDb.set('emergency_contacts', contact.id, contact);
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const deleteEmergencyContact = async (id: string) => {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      appDb.delete('emergency_contacts', id);
    } catch {
      // Offline fallback
    }
  };

  const createSupportTicket = async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newTicket: SupportTicket = {
      ...ticket,
      id: `tkt_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    try {
      appDb.set('support_tickets', newTicket.id, newTicket);
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const createScheduledRide = async (ride: ScheduledRide) => {
    setScheduledRides((prev) => [ride, ...prev]);
    try {
      appDb.set('scheduled_rides', ride.id, ride);
      triggerSound('success');
    } catch {
      // Offline fallback
    }
  };

  const rateRideWithTags = async (stars: number, compliments: string[], review: string) => {
    if (!activeRide) return;
    try {
      appDb.update('rides', activeRide.id, {
        passengerRating: stars,
        compliments,
        passengerFeedback: review
      });
    } catch {
      // Non-blocking
    }
    setActiveRide(null);
    triggerSound('success');
  };

  // User Profile Updates
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    try {
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
      appDb.update('users', user.id, updates);
      await upsertSupabaseProfile(updated);
      triggerSound('success');
    } catch (e) {
      console.warn('Error updating profile:', e);
    }
  };

  // Admin User Management
  const adminUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    appDb.update('users', userId, updates);
    if (user && user.id === userId) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
    }
    const targetUser = appDb.get<UserProfile>('users', userId);
    if (targetUser) {
      adminUpsertSupabaseUser(targetUser).catch(() => {});
      syncUserApi(targetUser).catch(() => {});
    }
    triggerSound('beep');
  };

  const adminCreateUser = async (userData: Omit<UserProfile, 'id'> & { id?: string }): Promise<UserProfile> => {
    const id = userData.id || `usr_${Date.now().toString(36)}`;
    const newUser: UserProfile = {
      ...userData,
      id,
      rating: userData.rating ?? 5.0,
      totalRides: userData.totalRides ?? 0,
      walletBalance: userData.walletBalance ?? 0,
      status: userData.status ?? 'active',
      avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${id}`,
      createdAt: new Date().toISOString()
    };
    appDb.set('users', id, newUser);
    adminUpsertSupabaseUser(newUser).catch(() => {});
    syncUserApi(newUser).catch(() => {});
    triggerSound('success');
    return newUser;
  };

  const adminDeleteUser = async (userId: string) => {
    appDb.delete('users', userId);
    adminDeleteSupabaseUser(userId).catch(() => {});
    deleteUserApi(userId).catch(() => {});
    if (user && user.id === userId) {
      logoutUser();
    }
    triggerSound('alert');
  };

  const adminAdjustUserWallet = async (userId: string, amount: number, note?: string) => {
    const target = appDb.get<UserProfile>('users', userId);
    if (!target) return;
    const newBal = Math.max(0, (target.walletBalance || 0) + amount);
    appDb.update('users', userId, { walletBalance: newBal, notes: note || target.notes });
    if (user && user.id === userId) {
      const updated = { ...user, walletBalance: newBal };
      setUser(updated);
      setWalletBalance(newBal);
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
      localStorage.setItem('toto_wallet_balance', newBal.toString());
    }
    const refreshed = appDb.get<UserProfile>('users', userId);
    if (refreshed) {
      adminUpsertSupabaseUser(refreshed).catch(() => {});
    }
    triggerSound('success');
  };

  const adminToggleUserStatus = async (userId: string) => {
    const target = appDb.get<UserProfile>('users', userId);
    if (!target) return;
    const newStatus: 'active' | 'blocked' = target.status === 'blocked' ? 'active' : 'blocked';
    appDb.update('users', userId, { status: newStatus });
    if (user && user.id === userId) {
      const updated: UserProfile = { ...user, status: newStatus };
      setUser(updated);
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
    }
    const refreshed = appDb.get<UserProfile>('users', userId);
    if (refreshed) {
      adminUpsertSupabaseUser(refreshed).catch(() => {});
    }
    triggerSound('beep');
  };

  // Admin Ride Management
  const adminUpdateRide = async (rideId: string, updates: Partial<ActiveRide>) => {
    appDb.update('rides', rideId, updates);
    if (activeRide && activeRide.id === rideId) {
      setActiveRide({ ...activeRide, ...updates });
    }
    triggerSound('beep');
  };

  const adminCreateRide = async (rideData: Partial<ActiveRide>): Promise<ActiveRide> => {
    const id = rideData.id || `RIDE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRide: ActiveRide = {
      id,
      userId: rideData.userId || 'usr_subrata',
      userName: rideData.userName || 'Passenger',
      userPhone: rideData.userPhone || '+91 98301 45289',
      userRating: rideData.userRating || 4.9,
      driverId: rideData.driverId,
      driverName: rideData.driverName,
      driverPhone: rideData.driverPhone,
      driverPhoto: rideData.driverPhoto,
      vehicleNumber: rideData.vehicleNumber,
      vehicleModel: rideData.vehicleModel,
      vehicleType: rideData.vehicleType || 'toto',
      pickup: rideData.pickup || {
        lat: 22.5735,
        lng: 88.4331,
        name: 'Sector V Metro Station',
        address: 'Sector V Metro Station, Salt Lake'
      },
      dropoff: rideData.dropoff || {
        lat: 22.5898,
        lng: 88.4082,
        name: 'City Centre 1 Mall',
        address: 'City Centre 1 Mall, DC Block, Salt Lake'
      },
      distanceKm: rideData.distanceKm ?? 2.0,
      estimatedMins: rideData.estimatedMins ?? 8,
      basePrice: rideData.basePrice ?? 35,
      discount: rideData.discount ?? 0,
      totalFare: rideData.totalFare ?? 35,
      driverEarnings: rideData.driverEarnings ?? 30,
      paymentMethod: rideData.paymentMethod || 'cash',
      paymentStatus: rideData.paymentStatus || 'paid',
      status: rideData.status || 'completed',
      otp: rideData.otp || generate4DigitOtp(),
      bookedAt: rideData.bookedAt || 'Just now',
      completedAt: rideData.completedAt,
    };
    appDb.set('rides', id, newRide);
    triggerSound('success');
    return newRide;
  };

  const adminDeleteRide = async (rideId: string) => {
    appDb.delete('rides', rideId);
    adminDeleteSupabaseRide(rideId).catch(() => {});
    deleteRideApi(rideId).catch(() => {});
    if (activeRide && activeRide.id === rideId) {
      setActiveRide(null);
    }
    triggerSound('alert');
  };

  // Admin Driver Management
  const adminUpdateDriver = async (driverId: string, updates: Partial<DriverProfile>) => {
    appDb.update('drivers', driverId, updates);
    const target = appDb.get<DriverProfile>('drivers', driverId);
    if (target) {
      upsertSupabaseDriver(target).catch(() => {});
    }
    if (driver && driver.id === driverId) {
      setDriver({ ...driver, ...updates });
    }
    triggerSound('beep');
  };

  const adminCreateDriver = async (driverData: Partial<DriverProfile>): Promise<DriverProfile> => {
    const id = driverData.id || `drv_${Date.now().toString(36)}`;
    const pin = driverData.accessPin || Math.floor(1000 + Math.random() * 9000).toString();
    const newDriver: DriverProfile = {
      id,
      name: driverData.name || 'Toto Captain',
      phone: driverData.phone || '+91 98000 00000',
      photoUrl: driverData.photoUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80`,
      avatarUrl: driverData.avatarUrl || driverData.photoUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80`,
      kycVerified: true,
      rating: driverData.rating ?? 4.9,
      totalTrips: driverData.totalTrips ?? driverData.totalRides ?? 0,
      totalRides: driverData.totalRides ?? driverData.totalTrips ?? 0,
      vehicleType: driverData.vehicleType || 'toto',
      vehicleNumber: driverData.vehicleNumber || 'WB-24-ER-' + Math.floor(1000 + Math.random() * 9000),
      vehicleModel: driverData.vehicleModel || 'Mayuri Grand Li-ion E-Rickshaw',
      vehicleColor: driverData.vehicleColor || 'Emerald Green',
      isOnline: driverData.isOnline ?? true,
      availabilityStatus: driverData.availabilityStatus || 'online',
      todayEarnings: driverData.todayEarnings ?? 0,
      todayRides: driverData.todayRides ?? 0,
      acceptanceRate: driverData.acceptanceRate ?? 98,
      batteryPercentage: driverData.batteryPercentage ?? 85,
      pin,
      accessPin: pin,
      currentLat: driverData.currentLat || 22.5804,
      currentLng: driverData.currentLng || 88.4378,
      updatedAt: new Date().toISOString()
    };
    appDb.set('drivers', id, newDriver);
    upsertSupabaseDriver(newDriver).catch(() => {});
    triggerSound('success');
    return newDriver;
  };

  // Convert real online drivers into markers for Leaflet map display (filtering out stale updates)
  const simulatedDrivers: SimulatedDriverMarker[] = onlineDrivers
    .filter((d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive' && isDriverLocationFresh(d.lastLocationUpdate || d.updatedAt))
    .map((d, index) => ({
      id: d.id,
      name: `${d.name.split(' ')[0]} (Toto)`,
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber,
      lat: d.currentLat || 22.5804,
      lng: d.currentLng || 88.4378,
      heading: d.heading ?? 0,
      isAvailable: d.isOnline && d.availabilityStatus !== 'busy' && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive',
      rating: d.rating,
      batteryPercentage: d.batteryPercentage,
      lastUpdated: d.lastLocationUpdate || d.updatedAt
    }));

  return (
    <RideContext.Provider
      value={{
        user,
        driver,
        activeRole,
        activeRide,
        simulatedDrivers,
        pendingDriverRequest,
        earningsHistory,
        userGpsPoint,
        driverGpsPoint,
        isAuthLoading,
        availableTotoOffers,
        isScanningOffers,
        selectedOffer,
        findNearbyTotoOffers,
        selectTotoOfferAndBook,
        cancelOfferSearch,
        setActiveRole,
        loginUser,
        logoutUser,
        loginDriver,
        logoutDriver,
        setDriverOnlineStatus,
        updateUserGpsPoint,
        updateDriverGpsPoint,
        createRideBooking,
        cancelRide,
        expireRideBooking,
        rateRide,
        advanceRideStage,
        settleRidePayment,
        driverAcceptRide,
        driverDeclineRide,
        driverArriveAtPickup,
        driverStartRideWithOtp,
        driverCompleteRide,
        driverApprovals,
        pendingApprovalsCount,
        registerDriverApproval,
        approveDriverRegistration,
        rejectDriverRegistration,
        deleteDriverProfile,
        loginDriverWithPin,
        updateDriverVehicleDetails,
        dispatchRideRequest,
        activeNavTab,
        setActiveNavTab,
        walletBalance,
        addMoneyToWallet,
        refreshWalletBalance,
        savedPlaces,
        addSavedPlace,
        deleteSavedPlace,
        emergencyContacts,
        addEmergencyContact,
        deleteEmergencyContact,
        supportTickets,
        createSupportTicket,
        scheduledRides,
        createScheduledRide,
        completedTrips,
        rateRideWithTags,
        isAdminAuthenticated,
        adminProfile,
        adminExistsState,
        adminCredentials,
        refreshAdminStatus,
        setupInitialAdminAccount,
        loginAdmin,
        logoutAdmin,
        logoutAllAdminSessions,
        updateAdminCredentials,
        updateAdminPassword,
        allUsers,
        allRides,
        allDrivers,
        updateUserProfile,
        adminUpdateUser,
        adminCreateUser,
        adminDeleteUser,
        adminAdjustUserWallet,
        adminToggleUserStatus,
        adminUpdateRide,
        adminCreateRide,
        adminDeleteRide,
        adminUpdateDriver,
        adminCreateDriver,
        syncAdminData,
        triggerSound,
        isSupabaseConnected,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
