import React, { useState, useEffect } from 'react';
import { useRide } from '../../context/RideContext';
import { AppLogo } from '../common/AppLogo';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  RotateCw, 
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Mail
} from 'lucide-react';
import { 
  fetchAdminStatus,
  verifyOwnerEmailApi,
  resetAdminPasswordWithTokenApi
} from '../../services/adminAuthService';
import { updateActiveManifestForRole } from '../../hooks/usePWAInstall';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

const OWNER_EMAIL = 'halderkoushik120@gmail.com';

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { 
    loginAdmin, 
    setupInitialAdminAccount,
    adminExistsState,
    refreshAdminStatus,
    triggerSound, 
    setActiveRole 
  } = useRide();

  // Status check: whether admin exists or initial setup is required
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [adminExists, setAdminExists] = useState(true);

  // Form states initialized blank with inside placeholder text
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupEmail, setSetupEmail] = useState(OWNER_EMAIL);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UX states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Account Recovery States (1: Enter Owner Email, 2: Reset Option, 3: Success)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  // Set active PWA manifest to Admin role on mount
  useEffect(() => {
    updateActiveManifestForRole('admin');
  }, []);

  // Check admin status on mount
  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        setCheckingStatus(true);
        const res = await fetchAdminStatus();
        if (isMounted) {
          setAdminExists(res.admin_exists);
        }
      } catch (err) {
        console.warn('Admin status check warning:', err);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [adminExistsState]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setErrorMessage('Please enter Admin Username.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter Admin Password.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    triggerSound('beep');

    try {
      const res = await loginAdmin(userId, password);
      if (res.success) {
        triggerSound('success');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        // Generic security error message
        setErrorMessage(res.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      console.warn('Admin login error:', err);
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle First-Time Admin Setup Submit
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = userId.trim();

    if (!cleanUser) {
      setErrorMessage('Admin Username is required.');
      return;
    }
    if (cleanUser.length < 3 || cleanUser.length > 32) {
      setErrorMessage('Admin Username must be between 3 and 32 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      setErrorMessage('Username can only contain letters, numbers, hyphens, dots, and underscores.');
      return;
    }

    if (!password) {
      setErrorMessage('Admin Password is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbersOrSymbols = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    if (!hasLetters || !hasNumbersOrSymbols) {
      setErrorMessage('Password must contain both letters and numbers or symbols.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirm Password must match Admin Password.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    triggerSound('beep');

    try {
      const res = await setupInitialAdminAccount(cleanUser, password, confirmPassword, setupEmail.trim().toLowerCase());
      if (res.success) {
        setSuccessMessage('Administrator account created successfully! Signing you in...');
        triggerSound('success');
        setAdminExists(true);
        await refreshAdminStatus();
        
        // Automatically sign in with newly created master credentials
        setTimeout(async () => {
          const loginRes = await loginAdmin(cleanUser, password);
          if (loginRes.success && onLoginSuccess) {
            onLoginSuccess();
          }
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Failed to initialize administrator account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // ACCOUNT RECOVERY HANDLERS (OWNER EMAIL VERIFICATION)
  // ----------------------------------------------------

  // Step 1: Verify Owner Email with Server (owner email vs unknown email)
  const handleVerifyOwnerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = recoveryEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setRecoveryError('Please enter owner email.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccess('');
    triggerSound('beep');

    try {
      const res = await verifyOwnerEmailApi(cleanEmail);
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setRecoveryStep(2); // after verified then showing reset option
        setRecoverySuccess('Owner email verified successfully! Please enter your new administrator password.');
        triggerSound('success');
      } else {
        setRecoveryError(res.message || 'Unknown email. Verification failed.');
        triggerSound('alert');
      }
    } catch (err: any) {
      // Unknown email or mismatch from server
      setRecoveryError(err.message || 'Unknown email address. Verification failed.');
      triggerSound('alert');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Step 2: Reset Master Password with Verified Token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setRecoveryError('Please enter your new administrator password.');
      return;
    }
    if (newPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters long.');
      return;
    }
    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbersOrSymbols = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    if (!hasLetters || !hasNumbersOrSymbols) {
      setRecoveryError('Password must contain both letters and numbers or symbols.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('Confirm password does not match new password.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccess('');
    triggerSound('beep');

    try {
      const res = await resetAdminPasswordWithTokenApi({
        resetToken,
        newPassword,
        confirmPassword: confirmNewPassword
      });

      if (res.success) {
        if (res.username) {
          setUserId(res.username);
        }
        setRecoveryStep(3); // success screen
        triggerSound('success');
      } else {
        setRecoveryError(res.message || 'Failed to update administrator password.');
        triggerSound('alert');
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to reset password.');
      triggerSound('alert');
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div 
        id="admin-login-screen-loading" 
        className="w-full max-w-md mx-auto bg-white rounded-3xl border border-neutral-200 shadow-sm p-8 text-[#111111] font-sans flex flex-col items-center justify-center min-h-[360px]"
      >
        <RotateCw className="w-8 h-8 text-[#C8622A] animate-spin mb-3" />
        <p className="text-xs text-neutral-600 font-bold uppercase tracking-wider">Verifying Admin Security Gateway...</p>
      </div>
    );
  }

  return (
    <div 
      id="admin-login-screen" 
      className="w-full max-w-md mx-auto bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-300"
    >
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-100">
        <button
          id="admin-return-passenger-btn"
          type="button"
          onClick={() => {
            triggerSound('beep');
            if (isRecoveryMode) {
              setIsRecoveryMode(false);
              setRecoveryStep(1);
              setRecoveryError('');
              setRecoverySuccess('');
            } else if (onBack) {
              onBack();
            } else {
              setActiveRole('user');
            }
          }}
          className="w-10 h-10 rounded-2xl bg-[#FAF8F5] hover:bg-neutral-100 active:scale-95 flex items-center justify-center text-neutral-700 transition-all cursor-pointer border border-neutral-200"
          title={isRecoveryMode ? 'Return to Admin Login' : 'Return to Passenger App'}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-900 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8622A]" />
          <span>
            {isRecoveryMode 
              ? 'Owner Account Recovery' 
              : adminExists 
              ? 'Restricted Admin Portal' 
              : 'Admin First-Time Setup'}
          </span>
        </div>
      </div>

      {/* Brand & Heading */}
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200/80 shadow-2xs mb-1">
          <AppLogo size="md" />
        </div>
        
        {isRecoveryMode ? (
          <>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              OWNER RECOVERY
            </h1>
            <p className="text-xs text-neutral-600 font-medium max-w-xs">
              Verify platform ownership to safely reset master administrator credentials.
            </p>
          </>
        ) : adminExists ? (
          <>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              ADMIN CONTROL CENTER
            </h1>
            <p className="text-xs text-neutral-600 font-medium max-w-xs">
              Private administrator access. Only authorized personnel may proceed.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              ADMIN INITIAL SETUP
            </h1>
            <p className="text-xs text-neutral-600 font-medium max-w-xs">
              Configure the single administrator account for Toto Drive. After creation, registration is permanently closed.
            </p>
          </>
        )}
      </div>

      {/* ========================================================== */}
      {/* 1. FORGOT PASSWORD / OWNER ACCOUNT RECOVERY FLOW           */}
      {/* ========================================================== */}
      {isRecoveryMode ? (
        <div className="space-y-4">
          {/* Recovery Error Notice */}
          {recoveryError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in duration-150 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{recoveryError}</div>
            </div>
          )}

          {/* Recovery Success Notice */}
          {recoverySuccess && recoveryStep !== 3 && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in duration-150 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{recoverySuccess}</div>
            </div>
          )}

          {/* STEP 1: ENTER OWNER EMAIL (VERIFIED AGAINST SERVER) */}
          {recoveryStep === 1 && (
            <form onSubmit={handleVerifyOwnerEmail} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="recovery-email-input" className="text-xs font-bold text-neutral-700 block">
                  Owner Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="recovery-email-input"
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Enter owner email"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                </div>
              </div>

              <button
                id="recovery-submit-email-btn"
                type="submit"
                disabled={recoveryLoading}
                className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75"
              >
                {recoveryLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Verifying Owner Email...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>VERIFY OWNER EMAIL</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setRecoveryEmail('');
                    setRecoveryError('');
                    setRecoverySuccess('');
                    triggerSound('beep');
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer transition-colors"
                >
                  ← Back to Admin Login
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: RESET OPTION (SHOWN AFTER OWNER EMAIL IS VERIFIED) */}
          {recoveryStep === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Verified Status Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left text-[11px] text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Owner Email Verified</p>
                  <p className="text-emerald-700 font-mono text-[10px] break-all">{recoveryEmail}</p>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="recovery-new-password" className="text-xs font-bold text-neutral-700 block">
                  New Admin Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="recovery-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new master password (min 6 chars)"
                    required
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="recovery-confirm-new-password" className="text-xs font-bold text-neutral-700 block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="recovery-confirm-new-password"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new master password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 font-medium pl-1 text-left">
                Minimum 6 characters, must include letters and numbers or symbols.
              </p>

              <button
                id="recovery-reset-password-btn"
                type="submit"
                disabled={recoveryLoading}
                className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75"
              >
                {recoveryLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Updating Master Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>RESET ADMIN PASSWORD</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryStep(1);
                    setRecoveryError('');
                    setRecoverySuccess('');
                    triggerSound('beep');
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer underline underline-offset-2"
                >
                  ← Change Email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: RECOVERY SUCCESS CONFIRMATION */}
          {recoveryStep === 3 && (
            <div className="py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-neutral-900">
                  Password Reset Successful!
                </h3>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto">
                  Your master administrator credentials have been securely updated. All previous sessions across all devices were invalidated.
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-800">
                Master Username: <span className="font-mono text-[#C8622A] font-bold">{userId || 'admin'}</span>
              </div>

              <button
                id="recovery-login-now-btn"
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoveryStep(1);
                  setPassword('');
                  setSuccessMessage('Password reset complete. Please sign in with your new password.');
                  triggerSound('beep');
                }}
                className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SIGN IN TO ADMIN PANEL</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================== */
        /* 2. STANDARD ADMIN INTERFACE (SETUP OR LOGIN)               */
        /* ========================================================== */
        <>
          {/* Success Notice */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in duration-150 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in duration-150 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Security Rule Badge for Initial Setup */}
          {!adminExists && (
            <div className="mb-5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-relaxed text-left flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Single Admin Account Rule:</strong> Only ONE admin account can ever exist. Once created, registration will be permanently disabled across the application.
              </div>
            </div>
          )}

          {/* 1. FIRST-TIME ADMIN SETUP FORM */}
          {!adminExists ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              {/* Admin Username */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-setup-username" className="text-xs font-bold text-neutral-700 block">
                  Admin Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-setup-username"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. Admin"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                </div>
              </div>

              {/* Owner Email for Account Recovery */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-setup-email" className="text-xs font-bold text-neutral-700 block">
                  Owner Email (for Account Recovery)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-setup-email"
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="e.g. halderkoushik120@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-setup-password" className="text-xs font-bold text-neutral-700 block">
                  Admin Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-setup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create master password (min 6 chars)"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 font-medium pl-1">
                  Minimum 6 characters, must include letters and numbers or symbols.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-setup-confirm-password" className="text-xs font-bold text-neutral-700 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-setup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter master password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="admin-setup-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 mt-2"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Creating Super Administrator Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>CREATE ADMINISTRATOR ACCOUNT</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 2. STANDARD ADMIN LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username field */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-login-userid" className="text-xs font-bold text-neutral-700 block">
                  Admin Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-login-userid"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. Admin"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-login-password" className="text-xs font-bold text-neutral-700 block">
                  Admin Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Admin password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                id="admin-login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 mt-2"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Verifying Administrative Authorization...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>LOGIN TO ADMIN PANEL</span>
                  </>
                )}
              </button>

              {/* Forgot Password / Account Recovery Link */}
              <div className="pt-2 text-center">
                <button
                  id="admin-forgot-password-btn"
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(true);
                    setRecoveryStep(1);
                    setRecoveryEmail('');
                    setRecoveryError('');
                    setRecoverySuccess('');
                    triggerSound('beep');
                  }}
                  className="text-[11px] text-[#C8622A] hover:text-[#a84e1d] font-bold underline underline-offset-2 cursor-pointer transition-colors"
                >
                  Forgot Password / Account Recovery?
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Bottom Footer Notice */}
      <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
        <p className="text-[10px] text-neutral-600 font-medium">
          Toto Drive Admin Portal • Internal ID: <span className="font-mono text-neutral-700">ADMIN_001</span>
        </p>
      </div>
    </div>
  );
};
