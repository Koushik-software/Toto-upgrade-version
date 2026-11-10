import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Clock, 
  Bookmark, 
  History, 
  ShieldCheck, 
  LifeBuoy, 
  LogOut, 
  ChevronRight, 
  Star, 
  Phone, 
  Tag, 
  CheckCircle2,
  Sparkles,
  Settings,
  ArrowLeft,
  Plus,
  Edit2,
  X,
  Check,
  Mail,
  Send,
  Loader2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useRide } from '../../context/RideContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { motion } from 'motion/react';
import { 
  isGmailConnected, 
  connectGmailAccount, 
  disconnectGmail, 
  fetchGmailProfile,
  sendGmailMessage,
  generateRideReceiptHtml
} from '../../services/gmailService';
import { GmailSendConfirmationModal } from '../modals/GmailSendConfirmationModal';
import { 
  auth, 
  createRecaptchaVerifier, 
  verifyPhoneNumberWithProvider, 
  updateUserPhoneNumber 
} from '../../services/firebase';

interface ProfileSettingsPageProps {
  user: UserProfile | null;
  walletBalance: number;
  completedRidesCount: number;
  onOpenWallet: () => void;
  onOpenSchedule: () => void;
  onOpenSavedPlaces: () => void;
  onOpenHistory: () => void;
  onOpenSafety: () => void;
  onOpenSupport: () => void;
  onOpenCoupons: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  user,
  walletBalance,
  completedRidesCount,
  onOpenWallet,
  onOpenSchedule,
  onOpenSavedPlaces,
  onOpenHistory,
  onOpenSafety,
  onOpenSupport,
  onOpenCoupons,
  onLogout,
  onNavigateHome,
}) => {
  const { triggerSound, updateUserProfile } = useRide();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // System back button dismisses open dialogs in Profile page
  useBackHandler('modal:editProfile', showEditModal, () => setShowEditModal(false), 25);
  useBackHandler('modal:logoutConfirm', showLogoutConfirm, () => setShowLogoutConfirm(false), 25);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editUpiId, setEditUpiId] = useState(user?.upiId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  // Identity Platform Phone Number Verification State
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(null);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneVerifyError, setPhoneVerifyError] = useState<string | null>(null);
  const [phoneVerifyNotice, setPhoneVerifyNotice] = useState<string | null>(null);

  const handleStartPhoneVerification = async () => {
    const raw = editPhone.trim();
    if (!raw) {
      setPhoneVerifyError('Please enter a phone number to verify.');
      return;
    }
    let formatted = raw;
    const clean = raw.replace(/\D/g, '');
    if (clean === '15555555555' || clean === '5555555555') {
      formatted = '+15555555555';
    } else if (!formatted.startsWith('+')) {
      if (clean.length === 10) {
        formatted = `+91${clean}`;
      } else {
        formatted = `+${clean}`;
      }
    }

    setPhoneVerifying(true);
    setPhoneVerifyError(null);
    setPhoneVerifyNotice(null);
    triggerSound('beep');

    try {
      const verifier = createRecaptchaVerifier('recaptcha-update-container');
      const vId = await verifyPhoneNumberWithProvider(formatted, verifier);
      setPhoneVerificationId(vId);
      if (formatted === '+15555555555') {
        setPhoneOtpInput('123456');
        setPhoneVerifyNotice('🧪 Identity Platform Test Number: Test OTP is 123456.');
      } else {
        setPhoneVerifyNotice(`SMS verification code sent to ${formatted}. Please enter 6-digit code.`);
      }
    } catch (err: any) {
      console.warn('Phone verify failed:', err);
      setPhoneVerifyError(err?.message || 'Could not send verification code.');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleConfirmPhoneUpdate = async () => {
    if (!phoneVerificationId || !phoneOtpInput.trim()) return;
    setPhoneVerifying(true);
    setPhoneVerifyError(null);
    triggerSound('beep');
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateUserPhoneNumber(currentUser, phoneVerificationId, phoneOtpInput.trim());
      }
      setPhoneVerifyNotice('Phone number updated and verified in Google Identity Platform!');
      setPhoneVerificationId(null);
      setPhoneOtpInput('');
      triggerSound('success');
    } catch (err: any) {
      console.error('Update phone number error:', err);
      setPhoneVerifyError(err?.message || 'Invalid verification code. Please try again.');
    } finally {
      setPhoneVerifying(false);
    }
  };

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
      setEditUpiId(user.upiId || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) return;
    setIsSaving(true);
    triggerSound('beep');
    try {
      await updateUserProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        upiId: editUpiId.trim() || undefined
      });
      setIsSaving(false);
      setShowEditModal(false);
      setEditSuccessNotice('Profile and UPI settings updated successfully!');
      setTimeout(() => setEditSuccessNotice(null), 3000);
    } catch {
      setIsSaving(false);
    }
  };

  // Gmail Workspace Integration State
  const [gmailConnected, setGmailConnected] = useState<boolean>(isGmailConnected());
  const [gmailEmail, setGmailEmail] = useState<string>(user?.email || 'halderkoushik120@gmail.com');
  const [isConnectingGmail, setIsConnectingGmail] = useState<boolean>(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [showGmailConfirmModal, setShowGmailConfirmModal] = useState<boolean>(false);
  const [gmailNotice, setGmailNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (isGmailConnected()) {
        setGmailConnected(true);
        try {
          const profile = await fetchGmailProfile();
          if (profile.emailAddress) setGmailEmail(profile.emailAddress);
        } catch {
          // keep fallback
        }
      }
    };
    checkStatus();
  }, []);

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailNotice(null);
    try {
      const { profile } = await connectGmailAccount();
      setGmailConnected(true);
      setGmailEmail(profile.emailAddress);
      setGmailNotice({
        type: 'success',
        message: `Connected successfully to ${profile.emailAddress}! Gmail is now active.`
      });
      setTimeout(() => setGmailNotice(null), 5000);
    } catch (err: any) {
      setGmailNotice({
        type: 'error',
        message: err?.message || 'Could not connect to Gmail. Please allow popups.'
      });
      setTimeout(() => setGmailNotice(null), 6000);
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = () => {
    disconnectGmail();
    setGmailConnected(false);
    setGmailNotice({
      type: 'success',
      message: 'Gmail disconnected. Digital receipts will not be automatically sent.'
    });
    setTimeout(() => setGmailNotice(null), 4000);
  };

  const handleInitiateTestReceipt = () => {
    if (!gmailConnected) {
      handleConnectGmail();
      return;
    }
    setShowGmailConfirmModal(true);
  };

  const handleConfirmSendTestReceipt = async () => {
    setIsSendingTestEmail(true);
    setGmailNotice(null);
    try {
      const mockTrip = {
        id: `ride_test_${Date.now().toString().slice(-6)}`,
        fare: 45,
        distanceKm: 3.8,
        pickup: { name: 'Sealdah Station', address: 'Bepin Behari Ganguly St, Sealdah' },
        dropoff: { name: 'College Street Coffee House', address: '15 Bankim Chatterjee St, College Square' },
        driverName: 'Raju Mondal',
        driverVehicleNumber: 'WB-06-ER-4821',
        paymentMethod: 'cash'
      };

      const payload = generateRideReceiptHtml(mockTrip as any, user?.name || 'Passenger', gmailEmail);
      const res = await sendGmailMessage({
        to: gmailEmail,
        subject: payload.subject,
        htmlBody: payload.html,
        textBody: payload.text
      });

      setShowGmailConfirmModal(false);
      setGmailNotice({
        type: 'success',
        message: `Sample ride invoice dispatched to ${gmailEmail} via Gmail (ID: ${res.id.slice(0, 8)}...)`
      });
      setTimeout(() => setGmailNotice(null), 6000);
    } catch (err: any) {
      setShowGmailConfirmModal(false);
      setGmailNotice({
        type: 'error',
        message: err?.message || 'Failed to dispatch email via Gmail API.'
      });
      setTimeout(() => setGmailNotice(null), 6000);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const menuItems = [
    {
      id: 'wallet',
      title: 'Toto Drive Wallet',
      subtitle: `Available balance: ₹${walletBalance}`,
      badge: `₹${walletBalance}`,
      badgeColor: 'bg-orange-50 text-[#C8622A] border-orange-200',
      icon: Wallet,
      iconColor: 'text-[#FF6B2C]',
      iconBg: 'bg-orange-100',
      action: onOpenWallet
    },
    {
      id: 'schedule',
      title: 'Schedule Ride',
      subtitle: 'Plan upcoming metro & office trips',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      action: onOpenSchedule
    },
    {
      id: 'saved_places',
      title: 'Saved Places',
      subtitle: 'Home, Work, Station & favorite hubs',
      icon: Bookmark,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      action: onOpenSavedPlaces
    },
    {
      id: 'history',
      title: 'My Rides',
      subtitle: `${completedRidesCount} past journeys & receipts`,
      badge: `${completedRidesCount} trips`,
      badgeColor: 'bg-neutral-100 text-neutral-700 border-neutral-200',
      icon: History,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      action: onOpenHistory
    },
    {
      id: 'coupons',
      title: 'Offers & Coupons',
      subtitle: 'Discounts, cashbacks & festival promo codes',
      icon: Tag,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      action: onOpenCoupons
    },
    {
      id: 'safety',
      title: 'Safety Center',
      subtitle: 'SOS trigger, emergency contacts & live sharing',
      icon: ShieldCheck,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100',
      action: onOpenSafety
    },
    {
      id: 'support',
      title: 'Help & Support',
      subtitle: '24/7 ride assistance & support tickets',
      icon: LifeBuoy,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      action: onOpenSupport
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-5"
    >
      {/* Top Page Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#EDE8E0] shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Settings className="w-5 h-5 text-[#FFA726]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight truncate">
              Account & Profile
            </h1>
            <p className="text-xs text-neutral-500 font-medium truncate">
              Preferences, safety controls & wallet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#181818] hover:bg-black active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Book Ride</span>
          <span className="xs:hidden">Home</span>
        </button>
      </div>

      {/* User Profile Hero Card */}
      <div className="bg-[#181818] text-white rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xs border border-neutral-800">
        {/* Subtle Background Glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#FF7A1A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10 flex-wrap sm:flex-nowrap">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#FFA726] to-[#E05300] text-white font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-white/10 shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight truncate">
                  {user?.name || 'Verified Passenger'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Rider
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerSound('beep');
                  setShowEditModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
              >
                <Edit2 className="w-3 h-3 text-[#FFA726]" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs sm:text-sm text-neutral-300 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{user?.phone || '+91 98311 02458'}</span>
              </p>
              {user?.email && (
                <p className="text-xs text-neutral-300 flex items-center gap-1.5 font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold text-neutral-300 flex-wrap">
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>4.9 Rating</span>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/90">
                {completedRidesCount} {completedRidesCount === 1 ? 'ride' : 'rides'} completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {editSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{editSuccessNotice}</span>
        </div>
      )}

      {/* Quick Wallet Card */}
      <div className="bg-gradient-to-r from-[#FFFDF9] via-white to-[#FFF8F0] rounded-3xl p-4 sm:p-5 border border-[#EDE8E0] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-100 text-[#FF6B2C] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-neutral-500 font-medium">Toto Wallet Balance</p>
            <p className="text-lg sm:text-2xl font-black text-[#111111] tracking-tight">
              ₹{walletBalance}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#E07A00] hover:bg-[#C8622A] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Cash</span>
        </button>
      </div>

      {/* Rider Saved UPI ID Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EDE8E0] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-100">
            UPI
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-neutral-900">Personal UPI ID (VPA)</p>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${user?.upiId ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'}`}>
                {user?.upiId ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-neutral-700 truncate mt-0.5">
              {user?.upiId || `${user?.phone ? user.phone.replace(/\D/g, '') : '9830145289'}@upi`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerSound('beep');
            setShowEditModal(true);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF8F5] hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl border border-neutral-200 transition-all cursor-pointer shrink-0"
        >
          <Edit2 className="w-3 h-3 text-[#FF6B2C]" />
          <span>{user?.upiId ? 'Change' : 'Set UPI'}</span>
        </button>
      </div>

      {/* Google Workspace & Gmail Integration Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EDE8E0] shadow-xs space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-50 border border-red-100 text-[#EA4335] flex items-center justify-center shrink-0 shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-neutral-900">Google Workspace & Gmail</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${gmailConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'}`}>
                  {gmailConnected ? 'Connected & Active' : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium truncate mt-0.5">
                {gmailConnected ? gmailEmail : 'Connect to auto-receive trip invoices & support updates'}
              </p>
            </div>
          </div>

          {gmailConnected ? (
            <button
              type="button"
              onClick={handleDisconnectGmail}
              className="text-xs text-neutral-400 hover:text-red-600 font-bold px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectGmail}
              disabled={isConnectingGmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isConnectingGmail ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              )}
              <span>Connect Gmail</span>
            </button>
          )}
        </div>

        {/* Status notification */}
        {gmailNotice && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
            gmailNotice.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <span className="font-bold">{gmailNotice.message}</span>
          </div>
        )}

        {/* Quick action bar inside Gmail Card */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap text-xs">
          <span className="text-[11px] text-neutral-500">
            Powered by Google Workspace API (OAuth 2.0)
          </span>
          <button
            type="button"
            onClick={handleInitiateTestReceipt}
            disabled={isSendingTestEmail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSendingTestEmail ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3 text-[#EA4335]" />
            )}
            <span>Send Sample Ride Invoice</span>
          </button>
        </div>
      </div>

      {/* Settings Menu Options List */}
      <div className="bg-white rounded-3xl border border-[#EDE8E0] divide-y divide-[#F2EDE5] overflow-hidden shadow-xs">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerSound('click');
                item.action();
              }}
              className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-[#E07A00] transition-colors truncate">
                      {item.title}
                    </p>
                    {item.badge && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-500 truncate mt-0.5 font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Log Out Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            triggerSound('alert');
            setShowLogoutConfirm(true);
          }}
          className="w-full py-3.5 px-4 bg-[#FFF5F5] hover:bg-[#FFEBEB] text-[#D93838] border border-[#FFD5D5] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Toto Account</span>
        </button>
      </div>

      {/* Confirmation Modal for Logout */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-13 h-13 sm:w-14 sm:h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-2xs">
                <LogOut className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Log Out of TotoDrive?</h3>
                <p className="text-xs sm:text-sm font-medium text-neutral-500 max-w-xs mx-auto px-1 leading-relaxed">
                  You can log back in at any time with your phone number or email account.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 pt-1.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 font-bold text-xs sm:text-sm text-neutral-700 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-xs sm:text-sm text-white transition-colors cursor-pointer shadow-xs shadow-red-200 text-center flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#E07A00]" />
                <h3 className="text-base font-extrabold text-[#111111] tracking-tight">Edit Rider Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-bold text-[#111111] mt-1 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Phone Number</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditPhone('+15555555555');
                      setPhoneVerifyNotice('Set to Identity Platform Test Number: +1 555-555-5555 (Code: 123456)');
                    }}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 cursor-pointer transition-colors"
                  >
                    🧪 Test: +1 555-555-5555
                  </button>
                </div>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => {
                      setEditPhone(e.target.value);
                      if (phoneVerifyError) setPhoneVerifyError(null);
                    }}
                    placeholder="+919830123456 or +15555555555"
                    className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-bold text-[#111111] focus:outline-none focus:border-[#C8622A]"
                  />
                  {!phoneVerificationId ? (
                    <button
                      type="button"
                      disabled={phoneVerifying}
                      onClick={handleStartPhoneVerification}
                      className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[11px] rounded-2xl shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {phoneVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3 h-3 text-amber-400" />}
                      <span>Verify SMS</span>
                    </button>
                  ) : null}
                </div>

                {/* Invisible reCAPTCHA container for PhoneAuthProvider */}
                <div id="recaptcha-update-container"></div>

                {/* OTP Verification Prompt */}
                {phoneVerificationId && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-amber-950">Enter Verification Code:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneVerificationId(null);
                          setPhoneOtpInput('');
                        }}
                        className="text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={phoneOtpInput}
                        onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-mono text-center tracking-widest text-sm font-bold text-neutral-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={phoneVerifying || phoneOtpInput.trim().length !== 6}
                        onClick={handleConfirmPhoneUpdate}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                      >
                        {phoneVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Confirm</span>
                      </button>
                    </div>
                  </div>
                )}

                {phoneVerifyNotice && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1.5 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    {phoneVerifyNotice}
                  </p>
                )}
                {phoneVerifyError && (
                  <p className="text-[10px] text-red-600 font-medium mt-1.5 bg-red-50 p-2 rounded-xl border border-red-200">
                    {phoneVerifyError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-bold text-[#111111] mt-1 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Your Default UPI ID (VPA)</span>
                  <span className="text-[9px] text-emerald-600 font-bold lowercase">gpay / phonepe / paytm</span>
                </label>
                <input
                  type="text"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                  placeholder="e.g. 9830145289@paytm or yourname@okhdfcbank"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-mono text-xs font-bold text-[#111111] mt-1 focus:outline-none focus:border-[#C8622A]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Used for instant 1-click settlements and rapid payment authorization.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 font-bold text-neutral-700 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-[#E07A00] hover:bg-[#C8622A] font-bold text-white text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center pt-2 pb-6 space-y-1 select-none">
        <p className="text-[11px] text-neutral-400 font-medium">
          TotoDrive Electric Fleet • Smart Shared Mobility
        </p>
        <p className="text-[10px] text-neutral-400">
          Zero emission Kolkata urban transportation
        </p>
      </div>

      {/* Gmail Send Confirmation Modal */}
      <GmailSendConfirmationModal
        isOpen={showGmailConfirmModal}
        onClose={() => setShowGmailConfirmModal(false)}
        onConfirm={handleConfirmSendTestReceipt}
        title="Send Sample Ride Invoice via Gmail"
        recipientEmail={gmailEmail}
        senderEmail={gmailEmail}
        subject="Your Toto Drive Ride Receipt [INV-TEST01] - ₹45.00"
        details={{
          rideId: "ride_sample_test",
          amount: 45,
          pickup: "Sealdah Station",
          dropoff: "College Street Coffee House"
        }}
        isLoading={isSendingTestEmail}
      />
    </motion.div>
  );
};
