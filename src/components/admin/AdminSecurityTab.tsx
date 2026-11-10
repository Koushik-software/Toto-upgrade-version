import React, { useState, useEffect } from 'react';
import { useRide } from '../../context/RideContext';
import { 
  ShieldCheck, 
  KeyRound, 
  User, 
  Lock, 
  Clock, 
  Calendar, 
  Users, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  RotateCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Activity,
  Mail
} from 'lucide-react';
import { 
  fetchAdminSecurityInfoApi, 
  AdminSecurityInfo,
  changeAdminUsernameApi,
  changeAdminPasswordApi,
  changeAdminEmailApi
} from '../../services/adminAuthService';

export const AdminSecurityTab: React.FC = () => {
  const { 
    adminProfile, 
    adminCredentials, 
    logoutAllAdminSessions, 
    logoutAdmin,
    triggerSound 
  } = useRide();

  // Security Info State
  const [securityInfo, setSecurityInfo] = useState<AdminSecurityInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Change Username form
  const [currentPassForUsername, setCurrentPassForUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [confirmNewUsername, setConfirmNewUsername] = useState('');
  const [showCurrentPassUser, setShowCurrentPassUser] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Change Password form
  const [currentPassForPass, setCurrentPassForPass] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassPass, setShowCurrentPassPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Change Owner Email form
  const [currentPassForEmail, setCurrentPassForEmail] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [showCurrentPassEmail, setShowCurrentPassEmail] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Logout All Sessions modal
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const loadSecurityData = async () => {
    try {
      setLoadingInfo(true);
      const data = await fetchAdminSecurityInfoApi();
      setSecurityInfo(data);
    } catch (err) {
      console.warn('Could not load security info from backend:', err);
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  // Handle Username Change
  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassForUsername.trim()) {
      setUsernameFeedback({ success: false, msg: 'Please enter your current admin password.' });
      return;
    }
    if (!newUsername.trim()) {
      setUsernameFeedback({ success: false, msg: 'Please enter the new admin username.' });
      return;
    }
    if (newUsername.trim() !== confirmNewUsername.trim()) {
      setUsernameFeedback({ success: false, msg: 'New username confirmation does not match.' });
      return;
    }

    setUsernameLoading(true);
    setUsernameFeedback(null);
    triggerSound('beep');

    try {
      const res = await changeAdminUsernameApi({
        currentPassword: currentPassForUsername.trim(),
        newUsername: newUsername.trim()
      });

      setUsernameFeedback({ success: true, msg: res.message });
      triggerSound('success');
      setCurrentPassForUsername('');
      setNewUsername('');
      setConfirmNewUsername('');
      await loadSecurityData();
    } catch (err: any) {
      triggerSound('alert');
      setUsernameFeedback({ success: false, msg: err.message || 'Failed to update admin username.' });
    } finally {
      setUsernameLoading(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassForPass.trim()) {
      setPasswordFeedback({ success: false, msg: 'Please enter your current admin password.' });
      return;
    }
    if (!newPassword) {
      setPasswordFeedback({ success: false, msg: 'Please enter a new admin password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ success: false, msg: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({ success: false, msg: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordFeedback(null);
    triggerSound('beep');

    try {
      const res = await changeAdminPasswordApi({
        currentPassword: currentPassForPass.trim(),
        newPassword: newPassword,
        confirmPassword: confirmNewPassword
      });

      setPasswordFeedback({ success: true, msg: res.message });
      triggerSound('success');
      setCurrentPassForPass('');
      setNewPassword('');
      setConfirmNewPassword('');
      await loadSecurityData();
    } catch (err: any) {
      triggerSound('alert');
      setPasswordFeedback({ success: false, msg: err.message || 'Failed to update admin password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Owner Email Change
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassForEmail.trim()) {
      setEmailFeedback({ success: false, msg: 'Please enter your current admin password.' });
      return;
    }
    if (!newOwnerEmail.trim() || !newOwnerEmail.includes('@')) {
      setEmailFeedback({ success: false, msg: 'Please enter a valid owner email address.' });
      return;
    }

    setEmailLoading(true);
    setEmailFeedback(null);
    triggerSound('beep');

    try {
      const res = await changeAdminEmailApi({
        currentPassword: currentPassForEmail.trim(),
        newEmail: newOwnerEmail.trim().toLowerCase()
      });

      setEmailFeedback({ success: true, msg: res.message });
      triggerSound('success');
      setCurrentPassForEmail('');
      setNewOwnerEmail('');
      await loadSecurityData();
    } catch (err: any) {
      triggerSound('alert');
      setEmailFeedback({ success: false, msg: err.message || 'Failed to update owner email.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Logout All Sessions
  const handleConfirmLogoutAll = async () => {
    setLogoutAllLoading(true);
    triggerSound('alert');
    try {
      await logoutAllAdminSessions();
      setShowLogoutAllModal(false);
    } catch (err) {
      console.error('Logout all sessions error:', err);
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const currentUsername = securityInfo?.username || adminProfile?.username || adminCredentials?.username || 'Admin';

  return (
    <div id="admin-security-section" className="space-y-6 animate-in fade-in duration-200 text-left">
      {/* 1. MASTER ACCOUNT IDENTITY BANNER */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#C8622A]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 tracking-tight">Admin Account Security</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  Single Account Protected
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Internal Account ID: <span className="font-mono font-bold text-neutral-800">{securityInfo?.admin_id || 'ADMIN_001'}</span> • Role: <span className="font-mono text-neutral-800">super_admin</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-security-refresh-btn"
              type="button"
              onClick={() => { triggerSound('beep'); loadSecurityData(); }}
              disabled={loadingInfo}
              className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingInfo ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            <button
              id="admin-logout-all-btn"
              type="button"
              onClick={() => setShowLogoutAllModal(true)}
              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout All Sessions</span>
            </button>
          </div>
        </div>

        {/* Account Details & Session Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-5">
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200/70">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3 text-[#C8622A]" />
              <span>Current Admin Username</span>
            </div>
            <div className="text-sm font-extrabold text-neutral-900">{currentUsername}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Primary Super Administrator</div>
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200/70">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1">
              <Mail className="w-3 h-3 text-[#C8622A]" />
              <span>Registered Owner Email</span>
            </div>
            <div className="text-xs font-mono font-extrabold text-neutral-900 truncate" title={securityInfo?.email || 'halderkoushik120@gmail.com'}>
              {securityInfo?.email || 'halderkoushik120@gmail.com'}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Primary Recovery Channel</div>
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200/70">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-[#C8622A]" />
              <span>Last Login</span>
            </div>
            <div className="text-sm font-extrabold text-neutral-900">
              {securityInfo?.last_login_at ? new Date(securityInfo.last_login_at).toLocaleString() : 'Currently Active'}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Authenticated Session</div>
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200/70">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3 h-3 text-[#C8622A]" />
              <span>Account Created Date</span>
            </div>
            <div className="text-sm font-extrabold text-neutral-900">
              {securityInfo?.created_at ? new Date(securityInfo.created_at).toLocaleDateString() : 'Initial Deployment'}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Permanent Master Profile</div>
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200/70">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3 text-[#C8622A]" />
              <span>Active Sessions</span>
            </div>
            <div className="text-sm font-extrabold text-neutral-900 flex items-center gap-1.5">
              <span>{securityInfo?.active_sessions_count || 1} Device(s)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Cryptographic Session Tokens</div>
          </div>
        </div>
      </div>

      {/* 2. CREDENTIAL MANAGEMENT CARDS (CHANGE USERNAME, PASSWORD, AND OWNER EMAIL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD A: CHANGE USERNAME */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-amber-50 rounded-xl text-[#C8622A]">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Change Admin Username</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Updates your administrative username while preserving the single account <span className="font-mono text-neutral-800">ADMIN_001</span>.
            </p>

            {usernameFeedback && (
              <div className={`mb-4 p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 ${usernameFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {usernameFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />}
                <span>{usernameFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleChangeUsername} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Current Admin Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassUser ? 'text' : 'password'}
                    value={currentPassForUsername}
                    onChange={(e) => setCurrentPassForUsername(e.target.value)}
                    placeholder="Enter current password to verify"
                    required
                    className="w-full px-3 py-2.5 pr-10 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassUser(!showCurrentPassUser)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showCurrentPassUser ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  New Admin Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new admin username"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Confirm New Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmNewUsername}
                  onChange={(e) => setConfirmNewUsername(e.target.value)}
                  placeholder="Re-enter new username"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <button
                id="admin-change-username-submit-btn"
                type="submit"
                disabled={usernameLoading}
                className="w-full py-3 bg-[#181818] hover:bg-black active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-70 mt-2"
              >
                {usernameLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Username...</span>
                  </>
                ) : (
                  <span>Update Admin Username</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* CARD B: CHANGE PASSWORD */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-amber-50 rounded-xl text-[#C8622A]">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Change Admin Password</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Enforces secure hashing and automatically terminates older sessions across other devices.
            </p>

            {passwordFeedback && (
              <div className={`mb-4 p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 ${passwordFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {passwordFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />}
                <span>{passwordFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Current Admin Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassPass ? 'text' : 'password'}
                    value={currentPassForPass}
                    onChange={(e) => setCurrentPassForPass(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3 py-2.5 pr-10 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassPass(!showCurrentPassPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showCurrentPassPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  New Admin Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    required
                    className="w-full px-3 py-2.5 pr-10 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full px-3 py-2.5 pr-10 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                id="admin-change-password-submit-btn"
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 bg-[#181818] hover:bg-black active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-70 mt-2"
              >
                {passwordLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password & Re-verify Sessions</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* CARD C: CHANGE OWNER EMAIL */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-amber-50 rounded-xl text-[#C8622A]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Owner Recovery Email</h3>
                <p className="text-[11px] text-neutral-500">Update verified email address for forgot password recovery</p>
              </div>
            </div>

            <div className="my-3.5 p-3 bg-[#FAF8F5] rounded-xl border border-neutral-200/70 text-xs">
              <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Active Owner Email</div>
              <div className="font-mono font-bold text-neutral-900 truncate" title={securityInfo?.email || 'halderkoushik120@gmail.com'}>
                {securityInfo?.email || 'halderkoushik120@gmail.com'}
              </div>
            </div>

            {emailFeedback && (
              <div className={`p-3 rounded-xl mb-3 text-xs flex items-start gap-2 ${emailFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {emailFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />}
                <span>{emailFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Current Admin Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassEmail ? 'text' : 'password'}
                    value={currentPassForEmail}
                    onChange={(e) => setCurrentPassForEmail(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3 py-2.5 pr-10 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassEmail(!showCurrentPassEmail)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showCurrentPassEmail ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  New Owner Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="e.g. halderkoushik120@gmail.com"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <button
                id="admin-change-email-submit-btn"
                type="submit"
                disabled={emailLoading}
                className="w-full py-3 bg-[#181818] hover:bg-black active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-70 mt-2"
              >
                {emailLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Owner Email...</span>
                  </>
                ) : (
                  <span>Update Owner Email</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. SECURITY ACTIVITY / LOGIN AUDIT LOG TABLE */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C8622A]" />
            <h3 className="text-sm font-bold text-neutral-900">Security Activity & Login History</h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium">Real-time Authorization Audit Trail</span>
        </div>

        {securityInfo && securityInfo.recent_activity && securityInfo.recent_activity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {securityInfo.recent_activity.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-neutral-900">
                      {item.event}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {item.success ? 'Authorized' : 'Rejected'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-600 text-[11px]">
                      {item.ip}
                    </td>
                    <td className="py-3 px-3 text-neutral-500 max-w-xs truncate">
                      {item.details || '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-400 font-mono text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString()} ({new Date(item.timestamp).toLocaleDateString()})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-400 text-xs">
            No recent security alerts recorded. Administrative environment is secure.
          </div>
        )}
      </div>

      {/* MODAL: LOGOUT ALL SESSIONS CONFIRMATION */}
      {showLogoutAllModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutAllModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-2xl text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-200/80 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 flex-1">
                <h3 className="text-base font-extrabold text-neutral-900 leading-tight">
                  Logout All Active Sessions?
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Security Session Invalidation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-950 font-medium leading-relaxed">
              This action will instantly invalidate all active administrator session tokens across all devices, browsers, and mobile environments. You will also be signed out immediately and must re-authenticate.
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLogoutAll}
                disabled={logoutAllLoading}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer text-center disabled:opacity-75"
              >
                {logoutAllLoading ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Yes, Invalidate All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
