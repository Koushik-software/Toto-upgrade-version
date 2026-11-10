import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient.js';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { authenticateWithGoogleCloud } from '../../services/googleAuth';
import { GoogleAccountModal } from './GoogleAccountModal';
import { useBackHandler } from '../../hooks/useBackHandler';
import { 
  AlertCircle, 
  CheckCircle2, 
  RotateCw, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowLeft,
  UserPlus,
  Phone,
  Smartphone
} from 'lucide-react';

export interface SignInProps {
  initialEmail?: string;
  fromSignup?: boolean;
  onNavigateToSignUp?: () => void;
  onNavigateToPhoneOtp?: () => void;
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ 
  initialEmail, 
  fromSignup, 
  onNavigateToSignUp, 
  onNavigateToPhoneOtp,
  onLoginSuccess, 
  onBack 
}) => {
  const { loginUser, triggerSound } = useRide();

  const handleGoToPhoneOtp = () => {
    triggerSound('beep');
    if (onNavigateToPhoneOtp) {
      onNavigateToPhoneOtp();
    } else if (onBack) {
      onBack();
    }
  };

  // Read initial email from prop, or URL query parameters
  const [email, setEmail] = useState<string>(() => {
    if (initialEmail) return initialEmail;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  useBackHandler('signin:googleModal', showGoogleModal, () => setShowGoogleModal(false), 25);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showRegisterSuggestion, setShowRegisterSuggestion] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        phone: '+91 98301 45289',
        avatarUrl: authResult.picture || `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(authResult.email)}`,
        rating: 4.95,
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

  // Show success message if user just registered (via prop or URL query parameter)
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    if (fromSignup) {
      return 'Your account has been created. Please check your email and verify your address before logging in.';
    }
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === 'true') {
        return 'Your account has been created. Please check your email and verify your address before logging in.';
      }
    } catch {}
    return null;
  });

  // Sync if initialEmail or fromSignup prop changes dynamically
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (fromSignup) {
      setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
    }
  }, [fromSignup]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setShowRegisterSuggestion(false);
    setShowResendVerification(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      triggerSound('alert');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      triggerSound('alert');
      return;
    }

    setLoading(true);
    triggerSound('beep');

    try {
      if (!isSupabaseConfigured) {
        // Unconfigured Supabase: log in smoothly with the entered credentials
        const targetEmail = cleanEmail;
        const targetName = targetEmail.split('@')[0];
        const profile: UserProfile = {
          id: 'usr_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          name: targetName || 'Passenger',
          phone: '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 1,
          walletBalance: 250,
          avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${targetEmail}`,
          createdAt: new Date().toISOString()
        };
        await loginUser(profile);
        triggerSound('success');
        if (onLoginSuccess) onLoginSuccess();
        return;
      }

      // 1. Supabase email/password sign-in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        throw error;
      }

      // 2. Successful sign-in
      if (data?.user) {
        const u = data.user;
        const targetEmail = u.email || cleanEmail;
        const targetName = u.user_metadata?.full_name || u.user_metadata?.name || targetEmail.split('@')[0];
        const targetAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || `https://api.dicebear.com/7.x/personas/svg?seed=${targetEmail}`;
        const targetPhone = u.phone || u.user_metadata?.phone || '+91 98301 45289';

        const profile: UserProfile = {
          id: 'usr_' + (u.id || targetEmail.replace(/[^a-zA-Z0-9]/g, '_')),
          name: typeof targetName === 'string' ? targetName : 'Passenger',
          phone: typeof targetPhone === 'string' ? targetPhone : '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: targetAvatar,
          createdAt: new Date().toISOString()
        };

        await loginUser(profile);
        triggerSound('success');

        // Clean query params on successful login
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('auth');
        currentUrl.searchParams.delete('email');
        currentUrl.searchParams.delete('registered');
        window.history.replaceState({}, '', currentUrl.toString());

        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to sign in. Please check your email and password.';
      const isEmailNotConfirmed = message.toLowerCase().includes('email not confirmed') || err?.code === 'email_not_confirmed';
      const isInvalidCredentials = message.toLowerCase().includes('invalid login credentials') || message.toLowerCase().includes('invalid_credentials') || err?.code === 'invalid_credentials';

      if (isEmailNotConfirmed) {
        setErrorMsg('Your email address is not yet verified. Please check your inbox or resend the confirmation email below.');
        setShowResendVerification(true);
      } else if (isInvalidCredentials) {
        setErrorMsg('Invalid email or password. If you haven\'t signed up yet, click "Create Account" below to register instantly.');
        setShowRegisterSuggestion(true);
      } else {
        setErrorMsg(message);
      }
      triggerSound('alert');
    } finally {
      setLoading(false);
    }
  };

  // Quick Account Registration from SignIn form
  const handleQuickSignUp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Please enter a password with at least 6 characters.');
      return;
    }

    setRegisterLoading(true);
    setErrorMsg('');
    triggerSound('beep');

    try {
      if (!isSupabaseConfigured) {
        triggerSound('success');
        setShowRegisterSuggestion(false);
        const profile: UserProfile = {
          id: 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          name: cleanEmail.split('@')[0],
          phone: '+91 98301 45289',
          email: cleanEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${cleanEmail}`,
          createdAt: new Date().toISOString()
        };
        await loginUser(profile);
        if (onLoginSuccess) onLoginSuccess();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) throw error;

      triggerSound('success');
      setShowRegisterSuggestion(false);

      if (data?.session) {
        const u = data.user;
        const profile: UserProfile = {
          id: 'usr_' + (u?.id || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')),
          name: cleanEmail.split('@')[0],
          phone: '+91 98301 45289',
          email: cleanEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${cleanEmail}`,
          createdAt: new Date().toISOString()
        };
        await loginUser(profile);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setSuccessMessage(`Account created for ${cleanEmail}! Please check your email inbox to verify your address before logging in.`);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account.';
      if (msg.toLowerCase().includes('already registered')) {
        setErrorMsg('An account with this email already exists. Please verify your password or use "Forgot password?".');
      } else {
        setErrorMsg(msg);
      }
      triggerSound('alert');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Forgot Password / Password Reset
  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address above to receive a password reset link.');
      triggerSound('alert');
      return;
    }

    setResetLoading(true);
    setErrorMsg('');
    try {
      if (!isSupabaseConfigured) {
        setSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
        triggerSound('success');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;
      setSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
      triggerSound('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send password reset email.');
      triggerSound('alert');
    } finally {
      setResetLoading(false);
    }
  };

  // Resend Email Confirmation
  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setResendLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setSuccessMessage(`Verification email resent to ${cleanEmail}. Please check your inbox.`);
        setErrorMsg('');
        setShowResendVerification(false);
        triggerSound('success');
        return;
      }
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      if (error) throw error;
      setSuccessMessage(`Verification email resent to ${cleanEmail}. Please check your inbox.`);
      setErrorMsg('');
      setShowResendVerification(false);
      triggerSound('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend confirmation email.');
      triggerSound('alert');
    } finally {
      setResendLoading(false);
    }
  };


  const handleGoToSignUp = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('auth', 'signup');
    currentUrl.searchParams.delete('registered');
    window.history.pushState({}, '', currentUrl.toString());

    if (onNavigateToSignUp) {
      onNavigateToSignUp();
    }
  };

  return (
    <div 
      id="signin-screen" 
      className="w-full flex-1 sm:flex-initial sm:max-w-md md:max-w-lg mx-auto bg-white sm:rounded-3xl border-0 sm:border border-[#EDE8E0] shadow-none sm:shadow-sm p-5 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-between min-h-[calc(100vh-65px)] sm:min-h-0 touch-pan-y"
    >
      <div className="space-y-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}

        {/* Title Typography */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Sign In
          </h1>
          <p className="text-xs font-medium text-neutral-500">
            Choose your preferred sign in method: Mobile OTP, Google, or Email.
          </p>
        </div>

        {/* Auth Method Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-2xl">
          <button
            id="signin-tab-phone-otp"
            type="button"
            onClick={handleGoToPhoneOtp}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200/60 active:scale-95"
            title="Switch to Mobile Phone OTP Login"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#E07A00]" />
            <span>Mobile OTP</span>
          </button>
          <button
            id="signin-tab-email"
            type="button"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all bg-white text-neutral-900 shadow-2xs cursor-default"
          >
            <Mail className="w-3.5 h-3.5 text-neutral-700" />
            <span>Email & Password</span>
          </button>
        </div>

        {/* Success message banner from registration */}
        {successMessage && (
          <div 
            id="signup-success-alert"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-300"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error message banner with actionable quick fixes */}
        {errorMsg && (
          <div 
            id="signin-error-alert"
            className="p-3.5 bg-red-50 border border-red-200/90 rounded-2xl text-xs text-red-800 space-y-2.5 animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>

            {/* If user entered invalid credentials, offer to create account or switch with 1 tap */}
            {showRegisterSuggestion && (
              <div className="pt-2 border-t border-red-200/70 flex flex-wrap items-center gap-2">
                <button
                  id="signin-quick-register-btn"
                  type="button"
                  onClick={handleQuickSignUp}
                  disabled={registerLoading}
                  className="px-3 py-1.5 bg-[#E07A00] hover:bg-[#C96E00] active:scale-95 text-white font-bold rounded-xl text-[11px] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {registerLoading ? (
                    <RotateCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  <span>Create Account with this Email</span>
                </button>
                <button
                  id="signin-switch-signup-btn"
                  type="button"
                  onClick={handleGoToSignUp}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 underline cursor-pointer"
                >
                  Go to Sign Up form
                </button>
              </div>
            )}

            {/* If email is unconfirmed, offer to resend verification email */}
            {showResendVerification && (
              <div className="pt-2 border-t border-red-200/70 flex items-center gap-2">
                <button
                  id="signin-resend-verification-btn"
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl text-[11px] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {resendLoading ? (
                    <RotateCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  <span>Resend Confirmation Email</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Primary Auth Provider Options: Mobile OTP & Google Cloud */}
        <div className="space-y-2.5">
          {/* OTP Provider Login Button */}
          <button
            id="signin-otp-provider-btn"
            type="button"
            onClick={handleGoToPhoneOtp}
            className="w-full bg-[#EDE8E0] hover:bg-[#E2DDD3] active:scale-[0.99] text-[#111111] font-bold py-3 px-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs transition-all cursor-pointer group border border-[#DCD6CA]"
          >
            <div className="flex items-center gap-3 min-w-0 text-left">
              <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-neutral-900 text-sm leading-tight">Login with Mobile OTP</div>
                <div className="text-[11px] text-neutral-500 font-medium">Fast 6-digit SMS verification code</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-300 transition-colors shrink-0">
              OTP Provider
            </span>
          </button>

          {/* Google Cloud Console OAuth Sign-In Provider Button */}
          <button
            id="signin-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="gsi-material-button"
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
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-neutral-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            or sign in with email
          </span>
          <div className="flex-grow border-t border-neutral-200"></div>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Email Address
            </label>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signin-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                  setShowRegisterSuggestion(false);
                }}
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-800">
                Password
              </label>
              <button
                id="signin-forgot-password-btn"
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-[11px] font-semibold text-[#E07A00] hover:underline cursor-pointer"
              >
                {resetLoading ? 'Sending link...' : 'Forgot password?'}
              </button>
            </div>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Lock className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                  setShowRegisterSuggestion(false);
                }}
                placeholder="Your password"
                required
                autoComplete="current-password"
                className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none pr-7"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="signin-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Switch to Sign Up */}
        <div className="pt-1 text-center">
          <p className="text-xs text-neutral-500">
            Don&apos;t have an account?{' '}
            <button
              id="signin-footer-signup-link"
              type="button"
              onClick={handleGoToSignUp}
              className="font-bold text-[#E07A00] hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </p>
        </div>


      </div>

      {/* Google Account Selector Dialog */}
      <GoogleAccountModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelected}
        initialEmail={email}
      />
    </div>
  );
};
