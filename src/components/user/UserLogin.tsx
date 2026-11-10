import React, { useState, useEffect, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { AppLogo } from '../common/AppLogo';
import { usePWAInstall, updateActiveManifestForRole } from '../../hooks/usePWAInstall';
import { SignIn } from '../auth/SignIn';
import { SignUp } from '../auth/SignUp';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle,
  ShieldCheck, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Mail,
  Zap,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { authenticateWithGoogleCloud } from '../../services/googleAuth';
import { GoogleAccountModal } from '../auth/GoogleAccountModal';
import { useBackHandler } from '../../hooks/useBackHandler';

interface UserLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

interface SavedAccount {
  id: string;
  name: string;
  phone: string;
  mobileNumber: string;
  email: string;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { loginUser, triggerSound } = useRide();
  const [authMode, setAuthMode] = useState<'phone' | 'signin' | 'signup'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('auth');
      if (mode === 'signup') return 'signup';
      if (mode === 'signin' || params.get('registered') === 'true') return 'signin';
    } catch {}
    return 'phone';
  });

  const [preFilledEmail, setPreFilledEmail] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    } catch {
      return '';
    }
  });

  const [isFromSignup, setIsFromSignup] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('registered') === 'true';
    } catch {
      return false;
    }
  });

  // WhatsApp OTP Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalEmail, setGoogleModalEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // Saved accounts from previous authenticated logins only (no demo numbers)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const raw = localStorage.getItem('totodrive_saved_passengers');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if customer application is running as an installed PWA
  const { isInstalled: isCustomerPWAInstalled } = usePWAInstall('user');

  useEffect(() => {
    updateActiveManifestForRole('user');
    if (isCustomerPWAInstalled) {
      try {
        localStorage.setItem('toto_pwa_installed_user', 'true');
        localStorage.setItem('toto_pwa_installed', 'true');
      } catch {}
    }
  }, [isCustomerPWAInstalled]);

  // System back button handling
  useBackHandler('login:googleModal', showGoogleModal, () => setShowGoogleModal(false), 25);
  useBackHandler('login:otpStep', otpStep, () => setOtpStep(false), 20);
  useBackHandler('login:authMode', authMode !== 'phone', () => setAuthMode('phone'), 15);

  // Resend Countdown
  useEffect(() => {
    if (otpStep && resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [otpStep, resendTimer]);

  // Automatically check if user is registered when 10 digits are entered
  useEffect(() => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) {
      setCheckingUser(true);
      fetch('/api/v1/customer/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: clean })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            if (data.exists && data.customer) {
              setIsNewUser(false);
              if (data.customer.name && !fullName) {
                setFullName(data.customer.name);
              }
            } else {
              setIsNewUser(true);
            }
          }
        })
        .catch(() => {
          // Fallback gracefully
        })
        .finally(() => {
          setCheckingUser(false);
        });
    }
  }, [phoneNumber]);

  // Google Cloud Console OAuth Sign-In for end users
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMsg('');
      triggerSound('beep');

      const authResult = await authenticateWithGoogleCloud();

      const userProfile: UserProfile = {
        id: authResult.id || `usr_g_${Date.now()}`,
        name: authResult.name || 'Google Passenger',
        email: authResult.email,
        phone: '+91 84790 22523',
        avatarUrl: authResult.picture || `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(authResult.email)}`,
        rating: 5.0,
        totalRides: 0,
        savedPlaces: {},
        walletBalance: 250,
        createdAt: new Date().toISOString()
      };

      await loginUser(userProfile);
      triggerSound('success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      const isDomainOrPopupIssue =
        err?.message === 'GOOGLE_UNAUTHORIZED_DOMAIN' ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup') ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('timed out');

      if (isDomainOrPopupIssue) {
        setGoogleModalEmail(preFilledEmail || '');
        setShowGoogleModal(true);
        return;
      }

      setErrorMsg(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleAccountSelected = async (profile: UserProfile) => {
    setShowGoogleModal(false);
    try {
      await loginUser(profile);
      triggerSound('success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete login. Please try again.');
    }
  };

  // Step 1: Send WhatsApp OTP
  const handleSendWhatsAppCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9830123456)');
      return;
    }

    if (isNewUser && !fullName.trim()) {
      setErrorMsg('Please enter your full name for registration.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    triggerSound('beep');

    try {
      const res = await fetch('/api/v1/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: cleanNumber,
          name: fullName.trim(),
          email: email.trim(),
          isNewUser
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch WhatsApp OTP.');
      }

      setOtpStep(true);
      setOtpValue(['', '', '', '', '', '']);
      setResendTimer(data.cooldownSeconds || 30);
      setSuccessMsg('Verification code sent to your WhatsApp!');
      triggerSound('beep');
    } catch (err: any) {
      console.warn('[WhatsAppAuth] Send OTP notice:', err?.message || err);
      triggerSound('alert');
      setErrorMsg(err?.message || 'Failed to send WhatsApp verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend WhatsApp OTP
  const handleResendWhatsAppOtp = async () => {
    if (resendTimer > 0 || loading) return;
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber) return;

    setLoading(true);
    setErrorMsg('');
    triggerSound('beep');

    try {
      const res = await fetch('/api/v1/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: cleanNumber,
          name: fullName.trim(),
          email: email.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend WhatsApp OTP.');
      }

      setResendTimer(data.cooldownSeconds || 30);
      setOtpValue(['', '', '', '', '', '']);
      setSuccessMsg('Fresh OTP dispatched to your WhatsApp number!');
      triggerSound('success');
    } catch (err: any) {
      console.warn('[WhatsAppAuth] Resend OTP notice:', err?.message || err);
      triggerSound('alert');
      setErrorMsg(err?.message || 'Failed to resend WhatsApp code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Pasting 6-Digit OTP
  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextOtp[i] = pasted[i];
    }
    setOtpValue(nextOtp);
    if (pasted.length === 6) {
      handleVerifyWithCode(pasted);
    } else {
      const targetIdx = Math.min(pasted.length, 5);
      const nextInput = document.getElementById(`wa-otp-input-${targetIdx}`);
      nextInput?.focus();
    }
  };

  // Step 2: Verify WhatsApp OTP
  const handleVerifyWithCode = async (codeToVerify?: string) => {
    const entered = codeToVerify || otpValue.join('').trim();
    if (entered.length !== 6) {
      setErrorMsg('Please enter your complete 6-digit WhatsApp OTP');
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    setLoading(true);
    setErrorMsg('');
    triggerSound('beep');

    try {
      const res = await fetch('/api/v1/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: cleanNumber,
          otp: entered,
          name: fullName.trim(),
          email: email.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired WhatsApp OTP.');
      }

      triggerSound('success');
      const customer: UserProfile = data.customer;

      // Save to remembered accounts list
      try {
        const nextSaved = savedAccounts.filter((a) => a.mobileNumber !== cleanNumber);
        nextSaved.unshift({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          mobileNumber: cleanNumber,
          email: customer.email
        });
        const trimmed = nextSaved.slice(0, 4);
        setSavedAccounts(trimmed);
        localStorage.setItem('totodrive_saved_passengers', JSON.stringify(trimmed));
        localStorage.setItem('totodrive_wa_customer_token', data.token);
      } catch {}

      await loginUser(customer);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.warn('[WhatsAppAuth] Verify OTP notice:', err?.message || err);
      triggerSound('alert');
      setErrorMsg(err?.message || 'Verification failed. Please check the code and try again.');
      triggerSound('alert');
      setErrorMsg(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick select saved account
  const handleSelectSavedAccount = (account: SavedAccount) => {
    setPhoneNumber(account.mobileNumber);
    setFullName(account.name);
    setEmail(account.email || '');
    setIsNewUser(false);
    setErrorMsg('');
    triggerSound('beep');
  };

  if (authMode === 'signin') {
    return (
      <SignIn
        initialEmail={preFilledEmail}
        fromSignup={isFromSignup}
        onNavigateToSignUp={() => setAuthMode('signup')}
        onNavigateToPhoneOtp={() => setAuthMode('phone')}
        onLoginSuccess={onLoginSuccess}
        onBack={() => setAuthMode('phone')}
      />
    );
  }

  if (authMode === 'signup') {
    return (
      <SignUp
        onNavigateToSignIn={(emailParam, fromSignup) => {
          if (emailParam) setPreFilledEmail(emailParam);
          if (fromSignup !== undefined) setIsFromSignup(fromSignup);
          setAuthMode('signin');
        }}
        onBack={() => setAuthMode('phone')}
      />
    );
  }

  return (
    <div 
      id="user-login-screen" 
      className="w-full max-w-md md:max-w-lg mx-auto bg-white rounded-3xl border border-[#EDE8E0] shadow-xs sm:shadow-sm p-5 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-start gap-6 min-h-0 touch-pan-y"
    >
      <div className="space-y-5">
        {/* Title Typography & WhatsApp OTP Badge (Cloned from YouPI-PG) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F8EE] border border-[#C2EED4] text-[#1E7E34] text-xs font-black shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span>💬 WhatsApp OTP Login</span>
            </span>

            {checkingUser && (
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <RotateCw className="w-3 h-3 animate-spin text-emerald-600" />
                <span>Checking...</span>
              </span>
            )}
          </div>

          <h1 
            style={{ fontFamily: 'Verdana' }}
            className="text-2xl font-black text-neutral-900 tracking-tight [font-family:Verdana]"
          >
            {otpStep ? 'Enter WhatsApp OTP' : 'Sign In with WhatsApp'}
          </h1>
          <p className="text-xs font-medium text-neutral-500 leading-relaxed">
            {otpStep 
              ? `We have sent a 6-digit verification code to your WhatsApp at +91 ${phoneNumber}`
              : 'Enter your 10-digit mobile number to receive a secure login code on WhatsApp.'}
          </p>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Success message banner */}
        {successMsg && !errorMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Mobile & Account Check */}
        {!otpStep ? (
          <div className="space-y-4 pt-1">
            {/* WhatsApp Phone Authentication Form */}
            <form onSubmit={handleSendWhatsAppCode} className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-neutral-800 text-[13px]">
                    WhatsApp Mobile Number
                  </label>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    🇮🇳 India (+91)
                  </span>
                </div>

                <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-emerald-500 focus-within:bg-white transition-colors px-3 py-2.5">
                  <span className="text-xs font-black text-neutral-700 pr-2.5 border-r border-neutral-300">
                    +91
                  </span>
                  <input
                    id="passenger-whatsapp-mobile-input"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, ''));
                      if (errorMsg) setErrorMsg('');
                      if (successMsg) setSuccessMsg('');
                    }}
                    placeholder="98301 23456"
                    maxLength={10}
                    className="w-full bg-transparent text-sm font-bold text-neutral-900 placeholder-neutral-400 focus:outline-none pl-3 tracking-wide"
                  />
                  {phoneNumber.length === 10 && (
                    <span className="text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-4 h-4 fill-emerald-100" />
                    </span>
                  )}
                </div>
              </div>

              {/* If New User Registration is detected or toggled */}
              {isNewUser && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>New Passenger Registration</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-neutral-800 text-xs">
                      Full Name *
                    </label>
                    <input
                      id="passenger-whatsapp-name-input"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Subhashish Mondal"
                      className="w-full bg-white rounded-xl border border-neutral-300 focus:border-amber-500 px-3 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-neutral-800 text-xs">
                      Email Address (Optional)
                    </label>
                    <input
                      id="passenger-whatsapp-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="passenger@totodrive.in"
                      className="w-full bg-white rounded-xl border border-neutral-300 focus:border-amber-500 px-3 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                id="passenger-send-whatsapp-otp-btn"
                type="submit"
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-[#128C7E] hover:bg-[#075E54] active:scale-[0.99] text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Sending WhatsApp OTP...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 fill-white text-[#128C7E]" />
                    <span>Send WhatsApp Verification Code</span>
                  </>
                )}
              </button>
            </form>

            {/* Visual Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                or sign in with
              </span>
              <div className="flex-grow border-t border-neutral-200"></div>
            </div>

            {/* Google Cloud Console OAuth Sign-In Provider Button */}
            <button
              id="firebase-google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="gsi-material-button w-full"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                {googleLoading ? (
                  <div className="flex items-center justify-center gap-2 py-0.5">
                    <RotateCw className="w-4 h-4 animate-spin text-[#E07A00]" />
                    <span className="font-semibold text-neutral-800 text-xs">Authenticating with Google...</span>
                  </div>
                ) : (
                  <>
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">Sign in with Google</span>
                  </>
                )}
              </div>
            </button>

            {/* Email & Password Login Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="w-full bg-white hover:bg-neutral-50/90 active:scale-[0.99] text-neutral-800 font-semibold py-2.5 px-4 rounded-2xl border border-neutral-300 hover:border-neutral-400 flex items-center justify-center gap-2 text-xs shadow-2xs transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
                <span>Continue with Email & Password</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: 6-Digit WhatsApp OTP Verification Form */
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyWithCode();
            }} 
            className="space-y-4 pt-1"
          >
            {/* WhatsApp Verification Status Card */}
            <div 
              id="whatsapp-otp-status-card"
              className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-xs text-neutral-800 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageCircle className="w-4 h-4 fill-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-emerald-800 font-bold leading-tight">WhatsApp Code Dispatched</div>
                  <div className="font-extrabold text-neutral-900 text-xs tracking-wide truncate">+91 {phoneNumber}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setErrorMsg('');
                  setOtpValue(['', '', '', '', '', '']);
                }}
                className="text-[11px] font-extrabold text-[#128C7E] hover:underline cursor-pointer shrink-0"
              >
                Change Number
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 text-center">
                Enter 6-Digit WhatsApp OTP
              </label>

              <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePasteOtp}>
                {otpValue.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const next = [...otpValue];
                      next[idx] = val;
                      setOtpValue(next);
                      if (val && idx < 5) {
                        const nextInput = document.getElementById(`wa-otp-input-${idx + 1}`);
                        nextInput?.focus();
                      }
                      // Auto-submit on 6th digit (matching YouPI-PG!)
                      if (val && idx === 5) {
                        const full = next.join('');
                        if (full.length === 6) {
                          handleVerifyWithCode(full);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpValue[idx] && idx > 0) {
                        const prevInput = document.getElementById(`wa-otp-input-${idx - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    id={`wa-otp-input-${idx}`}
                    className="w-10 h-13 sm:w-11 sm:h-14 text-center text-lg font-black bg-neutral-50 rounded-2xl border border-neutral-300 text-neutral-900 focus:border-[#25D366] focus:bg-white focus:outline-none shadow-2xs transition-colors"
                  />
                ))}
              </div>
            </div>

            {/* Countdown & Resend Button */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setErrorMsg('');
                  setOtpValue(['', '', '', '', '', '']);
                }}
                className="text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
              >
                Change Number
              </button>

              {resendTimer > 0 ? (
                <span className="text-neutral-400 font-mono text-xs">
                  Resend via WhatsApp in {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendWhatsAppOtp}
                  disabled={loading}
                  className="text-[#128C7E] font-extrabold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Resend WhatsApp Code</span>
                </button>
              )}
            </div>

            <button
              id="passenger-verify-whatsapp-code-btn"
              type="submit"
              disabled={loading || otpValue.join('').length < 6}
              className="w-full bg-[#128C7E] hover:bg-[#075E54] active:scale-[0.99] text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying WhatsApp OTP...</span>
                </>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Google Account Selector Dialog */}
      <GoogleAccountModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelected}
        initialEmail={googleModalEmail}
      />
    </div>
  );
};
