import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient.js';
import { useRide } from '../../context/RideContext';
import { 
  AlertCircle, 
  RotateCw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Lock, 
  Mail, 
  ArrowLeft 
} from 'lucide-react';

export interface SignUpProps {
  onNavigateToSignIn?: (email?: string, fromSignup?: boolean) => void;
  onBack?: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigateToSignIn, onBack }) => {
  const { triggerSound } = useRide();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter a valid email address.');
      triggerSound('alert');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter a password.');
      triggerSound('alert');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      triggerSound('alert');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      triggerSound('alert');
      return;
    }

    setLoading(true);
    triggerSound('beep');

    try {
      if (!isSupabaseConfigured) {
        triggerSound('success');
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('auth', 'signin');
        currentUrl.searchParams.set('email', cleanEmail);
        currentUrl.searchParams.set('registered', 'true');
        window.history.pushState({}, '', currentUrl.toString());

        if (onNavigateToSignIn) {
          onNavigateToSignIn(cleanEmail, true);
        }
        return;
      }

      // 1. Trigger Supabase Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        throw error;
      }

      // 2. Explicitly prevent auto-login (requirement: Do NOT auto-login)
      await supabase.auth.signOut().catch(() => {});

      triggerSound('success');

      // 3. Pass the registered email to the Sign In page via URL query parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('auth', 'signin');
      currentUrl.searchParams.set('email', cleanEmail);
      currentUrl.searchParams.set('registered', 'true');
      window.history.pushState({}, '', currentUrl.toString());

      // 4. Redirect / navigate to Sign In page
      if (onNavigateToSignIn) {
        onNavigateToSignIn(cleanEmail, true);
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to create account. Please try again.';
      if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('user already registered')) {
        setErrorMsg('An account with this email address already exists. Please switch to Sign In or reset your password.');
      } else {
        setErrorMsg(message);
      }
      triggerSound('alert');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSignIn = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('auth', 'signin');
    if (email.trim()) {
      currentUrl.searchParams.set('email', email.trim());
    }
    window.history.pushState({}, '', currentUrl.toString());

    if (onNavigateToSignIn) {
      onNavigateToSignIn(email.trim() || undefined, false);
    }
  };

  return (
    <div 
      id="signup-screen" 
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
            Create an Account
          </h1>
          <p className="text-xs font-medium text-neutral-500">
            Sign up with your email and password to get started.
          </p>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Email Address
            </label>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signup-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Password
            </label>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Lock className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signup-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
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

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Confirm Password
            </label>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Lock className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signup-confirm-password-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
                className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        {/* Switch to Sign In */}
        <div className="pt-2 text-center">
          <p className="text-xs text-neutral-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={handleGoToSignIn}
              className="font-bold text-[#E07A00] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
