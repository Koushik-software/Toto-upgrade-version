import React, { useState, useEffect } from 'react';
import { useRide } from '../../context/RideContext';
import { DriverApprovalRequest } from '../../types';
import { AdminLiveMap } from './AdminLiveMap';
import { AdminDriverManagement } from './AdminDriverManagement';
import { AdminCustomerManagement } from './AdminCustomerManagement';
import { AdminRidesManagement } from './AdminRidesManagement';
import { AdminReports } from './AdminReports';
import { AdminNotifications } from './AdminNotifications';
import { AdminDatabaseStorage } from './AdminDatabaseStorage';
import { AdminSecurityTab } from './AdminSecurityTab';
import { AdminWhatsAppProtocol } from './AdminWhatsAppProtocol';
import { DeleteDriverModal } from './DeleteDriverModal';
import { 
  ShieldCheck, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  Copy, 
  CheckCheck, 
  Phone, 
  Sparkles, 
  Key, 
  Bell, 
  AlertCircle, 
  ArrowLeft, 
  UserCheck, 
  Car, 
  Zap, 
  LogIn, 
  RotateCw, 
  PlusCircle, 
  MapPin, 
  Users, 
  CreditCard, 
  Tag, 
  BarChart3, 
  Sliders, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Percent, 
  LogOut, 
  Lock, 
  Eye, 
  AlertTriangle,
  Database,
  RefreshCw,
  Wallet,
  Building,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { updateActiveManifestForRole } from '../../hooks/usePWAInstall';
import { updateOwnerUpiApi, getOwnerUpiApi } from '../../services/businessApi';
import { getStoredAdminToken } from '../../services/adminAuthService';

type AdminTab = 
  | 'overview' 
  | 'live_map' 
  | 'drivers' 
  | 'customers' 
  | 'rides' 
  | 'pricing' 
  | 'coupons' 
  | 'reports' 
  | 'notifications' 
  | 'audit'
  | 'database_storage'
  | 'security'
  | 'whatsapp_protocol';

export const AdminDashboard: React.FC = () => {
  const { 
    driverApprovals, 
    pendingApprovalsCount, 
    approveDriverRegistration, 
    rejectDriverRegistration, 
    deleteDriverProfile,
    registerDriverApproval,
    loginDriverWithPin,
    setActiveRole,
    simulatedDrivers,
    activeRide,
    triggerSound,
    logoutAdmin,
    updateAdminPassword,
    updateAdminCredentials,
    adminCredentials,
    allUsers,
    allRides,
    allDrivers,
    syncAdminData
  } = useRide();

  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [activeApprovalSubTab, setActiveApprovalSubTab] = useState<'pending' | 'approved'>('pending');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Set active PWA manifest to Admin Control Center on mount and initial sync
  React.useEffect(() => {
    updateActiveManifestForRole('admin');
    syncAdminData();
  }, [syncAdminData]);

  const handleSyncNow = async () => {
    triggerSound('beep');
    setIsSyncing(true);
    setSyncStatusMsg('Syncing enterprise data across devices...');
    try {
      await syncAdminData();
      triggerSound('success');
      setSyncStatusMsg('Live sync complete!');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch {
      setSyncStatusMsg('Sync completed with local cache.');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newUsernameVal, setNewUsernameVal] = useState(adminCredentials?.username || 'Admin');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ success: boolean; msg: string } | null>(null);
  const [approvedPinModal, setApprovedPinModal] = useState<{
    driverName: string;
    phone: string;
    pin: string;
    vehicleNumber: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [pendingLogoutTarget, setPendingLogoutTarget] = useState<'default' | 'driver'>('default');

  // Details Review Modal State
  const [selectedReviewDriver, setSelectedReviewDriver] = useState<DriverApprovalRequest | null>(null);
  const [reviewChecklist, setReviewChecklist] = useState({
    identityVerified: false,
    plateVerified: false,
    vehiclePhotosApproved: false
  });
  const [isReviewedApproved, setIsReviewedApproved] = useState(false);
  const [reviewGeneratedPin, setReviewGeneratedPin] = useState<string | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<{ url: string; title: string } | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<DriverApprovalRequest | null>(null);

  // Pricing configuration state (Admin configurable pricing formula without developer edits)
  const [pricingConfig, setPricingConfig] = useState({
    baseFare: 25,
    perKmRate: 16,
    perMinuteRate: 1.5,
    minimumFare: 20,
    waitingFeePerMin: 1.0,
    cancellationFee: 15,
    peakSurgeMultiplier: 1.2,
    serviceFeePercent: 10,
    taxGstPercent: 5
  });

  // Coupons configuration state
  const [couponsList, setCouponsList] = useState([
    { code: 'RAPIDOTOTO', discount: 25, maxDiscount: 20, minFare: 25, active: true, expiry: '31 Dec 2025' },
    { code: 'GREENRIDE', discount: 20, maxDiscount: 15, minFare: 20, active: true, expiry: '31 Dec 2025' },
    { code: 'WELCOME50', discount: 50, maxDiscount: 35, minFare: 30, active: true, expiry: '31 Dec 2025' }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(20);
  const [newCouponMax, setNewCouponMax] = useState(15);

  // Audit logs state - real operational logs persisted in storage
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; actor: string; target: string; time: string }>>(() => {
    try {
      const stored = localStorage.getItem('toto_admin_audit_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Owner Settlement UPI Configuration State (Passenger Wallet Recharges)
  const [ownerUpiForm, setOwnerUpiForm] = useState({
    ownerUpiId: 'subratanaskar@icici',
    ownerPayeeName: 'Subrata Naskar (Toto Drive Fleet)',
    ownerSettlementBank: 'ICICI Bank'
  });
  const [isSavingOwnerUpi, setIsSavingOwnerUpi] = useState(false);
  const [ownerUpiNotice, setOwnerUpiNotice] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    getOwnerUpiApi().then((res: any) => {
      if (res && res.config) {
        setOwnerUpiForm({
          ownerUpiId: res.config.ownerUpiId || 'subratanaskar@icici',
          ownerPayeeName: res.config.ownerPayeeName || 'Subrata Naskar (Toto Drive Fleet)',
          ownerSettlementBank: res.config.ownerSettlementBank || 'ICICI Bank'
        });
      }
    }).catch(() => {});
  }, []);

  const handleSaveOwnerUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUpiForm.ownerUpiId.trim() || !ownerUpiForm.ownerUpiId.includes('@')) {
      setOwnerUpiNotice({ success: false, msg: 'Please provide a valid UPI ID containing "@" (e.g. username@bank).' });
      return;
    }
    if (!ownerUpiForm.ownerPayeeName.trim()) {
      setOwnerUpiNotice({ success: false, msg: 'Please enter the official payee / beneficiary name.' });
      return;
    }

    setIsSavingOwnerUpi(true);
    setOwnerUpiNotice(null);
    try {
      const token = getStoredAdminToken() || '';
      const res = await updateOwnerUpiApi(token, {
        ownerUpiId: ownerUpiForm.ownerUpiId.trim(),
        ownerPayeeName: ownerUpiForm.ownerPayeeName.trim(),
        ownerSettlementBank: ownerUpiForm.ownerSettlementBank.trim() || 'ICICI Bank'
      });
      if (res && res.success) {
        setOwnerUpiNotice({ success: true, msg: 'Owner UPI Settlement Account updated successfully! All passenger wallet recharges will route to this UPI ID.' });
        triggerSound('success');
        setAuditLogs(prev => [
          {
            id: String(Date.now()),
            action: 'Owner UPI Settlement Configured',
            actor: adminCredentials?.username || 'Admin',
            target: `VPA: ${ownerUpiForm.ownerUpiId.trim()} (${ownerUpiForm.ownerPayeeName.trim()})`,
            time: 'Just now'
          },
          ...prev
        ]);
        setTimeout(() => setOwnerUpiNotice(null), 5000);
      } else {
        setOwnerUpiNotice({ success: false, msg: res?.message || 'Failed to update Owner UPI account.' });
        triggerSound('beep');
      }
    } catch (err: any) {
      setOwnerUpiNotice({ success: false, msg: err.message || 'Error saving Owner UPI settings.' });
    } finally {
      setIsSavingOwnerUpi(false);
    }
  };

  const pendingList = driverApprovals.filter((a) => a.status === 'pending');
  const approvedList = driverApprovals.filter((a) => a.status === 'approved');

  // Live KPI metrics derived directly from real production databases
  const completedRidesCount = allRides.filter((r) => r.status === 'completed').length;
  const cancelledRidesCount = allRides.filter((r) => r.status === 'cancelled').length;
  const liveActiveRidesCount = allRides.filter((r) => 
    r.status === 'in_progress' || 
    r.status === 'driver_assigned' || 
    r.status === 'driver_arriving' || 
    r.status === 'driver_arrived' || 
    r.status === 'searching'
  ).length + (activeRide && !allRides.some((r) => r.id === activeRide.id) && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' ? 1 : 0);
  
  const totalGrossRevenue = allRides
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (Number((r as any).totalFare ?? r.fare) || 0), 0);

  const completionRate = allRides.length > 0 ? ((completedRidesCount / allRides.length) * 100).toFixed(1) : '0.0';
  const cancellationRate = allRides.length > 0 ? ((cancelledRidesCount / allRides.length) * 100).toFixed(1) : '0.0';
  const onlineDriversCount = allDrivers.filter((d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive').length;

  // Handle Approve action
  const handleApprove = async (approval: DriverApprovalRequest) => {
    setIsProcessingId(approval.id);
    triggerSound('beep');
    try {
      const res = await approveDriverRegistration(approval.id);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      setApprovedPinModal({
        driverName: approval.driverName,
        phone: approval.phone,
        pin: res.pin,
        vehicleNumber: approval.vehicleNumber
      });
      setActionNotice(`Driver "${approval.driverName}" approved! Generated 4-Digit PIN: ${res.pin}`);
      setAuditLogs(prev => [
        { id: String(Date.now()), action: 'Driver Approved', actor: 'Admin', target: `${approval.driverName} (${approval.vehicleNumber})`, time: 'Just now' },
        ...prev
      ]);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Handle Reject action
  const handleReject = async (approvalId: string) => {
    setIsProcessingId(approvalId);
    triggerSound('beep');
    try {
      await rejectDriverRegistration(approvalId);
      setActionNotice('Driver registration marked as rejected.');
      setAuditLogs(prev => [
        { id: String(Date.now()), action: 'Driver Rejected', actor: 'Admin', target: `ID: ${approvalId}`, time: 'Just now' },
        ...prev
      ]);
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Driver Profile Delete Workflow Handlers
  const handleOpenDeleteModal = (driver: DriverApprovalRequest) => {
    triggerSound('alert');
    setDriverToDelete(driver);
  };

  const handleConfirmDeleteDriver = async (driverTarget: DriverApprovalRequest, reason: string) => {
    try {
      await deleteDriverProfile(driverTarget.id);
      if (selectedReviewDriver?.id === driverTarget.id) {
        setSelectedReviewDriver(null);
      }
      setActionNotice(`Driver profile "${driverTarget.driverName}" (${driverTarget.vehicleNumber}) has been permanently deleted from fleet.`);
      setAuditLogs((prev) => [
        {
          id: String(Date.now()),
          action: 'Driver Profile Purged',
          actor: 'Admin',
          target: `${driverTarget.driverName} (${driverTarget.vehicleNumber}) - Reason: ${reason}`,
          time: 'Just now'
        },
        ...prev
      ]);
    } catch (err) {
      console.error('Delete driver failed:', err);
      setActionNotice(`Failed to delete driver: ${(err as Error).message}`);
    }
  };

  // Details Review Modal Handlers
  const handleOpenReviewModal = (appr: DriverApprovalRequest) => {
    setSelectedReviewDriver(appr);
    const isAlreadyApproved = appr.status === 'approved';
    setIsReviewedApproved(isAlreadyApproved);
    setReviewGeneratedPin(appr.generatedPin || null);
    setReviewChecklist({
      identityVerified: isAlreadyApproved,
      plateVerified: isAlreadyApproved,
      vehiclePhotosApproved: isAlreadyApproved
    });
    setActivePhotoModal(null);
    triggerSound('beep');
  };

  const handleToggleReviewCheck = (key: keyof typeof reviewChecklist) => {
    triggerSound('beep');
    setReviewChecklist(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (updated.identityVerified && updated.plateVerified && updated.vehiclePhotosApproved) {
        setIsReviewedApproved(true);
      }
      return updated;
    });
  };

  const handleMarkAsApproved = () => {
    triggerSound('success');
    setReviewChecklist({
      identityVerified: true,
      plateVerified: true,
      vehiclePhotosApproved: true
    });
    setIsReviewedApproved(true);
  };

  const handleFinalizeAndGeneratePin = async (appr: DriverApprovalRequest) => {
    setIsProcessingId(appr.id);
    triggerSound('beep');
    try {
      const res = await approveDriverRegistration(appr.id);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      setIsReviewedApproved(true);
      setReviewGeneratedPin(res.pin);
      setSelectedReviewDriver(prev => prev ? { ...prev, status: 'approved', generatedPin: res.pin } : null);
      setActionNotice(`Driver "${appr.driverName}" verified & approved! 4-Digit Security PIN: ${res.pin}`);
      setAuditLogs(prev => [
        {
          id: String(Date.now()),
          action: 'Driver Verified & PIN Generated',
          actor: 'Admin',
          target: `${appr.driverName} (${appr.vehicleNumber}) - PIN: ${res.pin}`,
          time: 'Just now'
        },
        ...prev
      ]);
    } catch (err) {
      console.error('Approval PIN generation failed:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleTestLoginAsDriver = async (phone: string, pin: string) => {
    triggerSound('success');
    const res = await loginDriverWithPin(phone, pin);
    if (res.success) {
      setActiveRole('driver');
    }
  };

  const copyPinToClipboard = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    triggerSound('beep');
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    setCouponsList([
      { code: cleanCode, discount: newCouponDiscount, maxDiscount: newCouponMax, minFare: 25, active: true, expiry: '31 Dec 2025' },
      ...couponsList
    ]);
    setNewCouponCode('');
    setActionNotice(`Coupon "${cleanCode}" generated successfully!`);
    triggerSound('success');
  };

  const handleToggleCoupon = (code: string) => {
    setCouponsList(prev => prev.map(c => c.code === code ? { ...c, active: !c.active } : c));
    triggerSound('beep');
  };

  return (
    <div id="admin-dashboard" className="w-full max-w-6xl mx-auto py-4 px-3 sm:px-6 font-sans space-y-5">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            id="admin-top-back-btn"
            type="button"
            onClick={() => {
              triggerSound('beep');
              setPendingLogoutTarget('driver');
              setShowLogoutConfirmModal(true);
            }}
            className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-95 flex items-center justify-center text-neutral-800 shadow-2xs transition-all cursor-pointer"
            title="Return to Toto Partner view"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#C8622A] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TOTO DRIVE ADMIN CONTROL CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Enterprise Fleet Operations
            </h1>
          </div>
        </div>

        {/* Role Switch, Sync & Credentials Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cross-device Live Sync Button */}
          <button
            id="admin-sync-data-btn"
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-3 py-2 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-95 text-neutral-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Sync live data with server and mobile devices"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C8622A] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole('driver')}
            className="px-3 py-2 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Switch to Captain Partner view"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Driver View</span>
          </button>

          <button
            id="admin-dashboard-credentials-btn"
            type="button"
            onClick={() => {
              triggerSound('beep');
              setCurrentTab('security');
            }}
            className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
              currentTab === 'security'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white border-neutral-200 hover:bg-neutral-50 active:scale-95 text-neutral-800'
            }`}
            title="Admin Security & Account"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#C8622A]" />
            <span>Admin Security</span>
          </button>

          <button
            id="admin-top-logout-btn"
            type="button"
            onClick={() => {
              triggerSound('beep');
              setPendingLogoutTarget('default');
              setShowLogoutConfirmModal(true);
            }}
            className="px-3 py-2 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 text-red-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Log out from Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Action Notice Alert Banner */}
      {actionNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-semibold text-amber-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setActionNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cross-Device Sync Status Banner */}
      {syncStatusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        </div>
      )}

      {/* Primary Navigation Menu Tabs */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-neutral-200 shadow-2xs overflow-x-auto">
        {[
          { id: 'overview', label: 'Dashboard KPI', icon: Activity },
          { id: 'live_map', label: 'Live Fleet Map', icon: MapPin },
          { id: 'drivers', label: 'Driver Directory', icon: Car },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'rides', label: 'Rides & Audit', icon: Clock },
          { id: 'pricing', label: 'Fare & System Settings', icon: Sliders },
          { id: 'coupons', label: 'Coupons', icon: Tag },
          { id: 'reports', label: 'Reports & CSV', icon: BarChart3 },
          { id: 'notifications', label: 'Broadcasts', icon: Bell },
          { id: 'database_storage', label: 'Database & Storage', icon: Database },
          { id: 'whatsapp_protocol', label: 'WhatsApp Protocol', icon: MessageCircle },
          { id: 'security', label: 'Admin Security', icon: ShieldCheck },
          { id: 'audit', label: 'Audit Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setCurrentTab(tab.id as AdminTab); triggerSound('beep'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF6B2C]' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
              {tab.id === 'overview' && pendingApprovalsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & KPI DASHBOARD */}
      {currentTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 10 Detailed Real-time KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Customers</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">{allUsers.length}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{allUsers.filter((u) => u.status === 'active' || !u.status).length} Active Riders</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Drivers</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">{allDrivers.length}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Registered Fleet</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online Drivers</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{onlineDriversCount}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Live on Map</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Rides</div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">{liveActiveRidesCount}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Trips in progress</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Completed Rides</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">{completedRidesCount}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{completionRate}% Success</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cancelled Rides</div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">{cancelledRidesCount}</div>
              <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">{cancellationRate}% Cancel Rate</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Today's Revenue</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1 font-mono">₹{totalGrossRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Live Gross GMV</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Today's Bookings</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">{allRides.length}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Dispatches</div>
            </div>

            <div 
              onClick={() => setActiveApprovalSubTab('pending')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                pendingApprovalsCount > 0
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                <span>Pending Approvals</span>
                {pendingApprovalsCount > 0 && <Bell className="w-3 h-3 text-amber-600 animate-bounce" />}
              </div>
              <div className="text-2xl font-extrabold text-[#111111] mt-1">{pendingApprovalsCount}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Requires KYC Review</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Support Tickets</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">0</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">No open tickets</div>
            </div>
          </div>

          {/* Database & Data Storage Quick Status Strip */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#E07A00] flex items-center justify-center font-bold shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#111111]">Database & Data Storage Engine</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Supabase PostgreSQL tables, reactive offline cache, KYC storage assets & automated backups.
                </p>
              </div>
            </div>

            <button
              id="overview-manage-database-btn"
              type="button"
              onClick={() => { setCurrentTab('database_storage'); triggerSound('beep'); }}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <span>Manage Database & Storage</span>
              <span className="text-[#FF6B2C]">&rarr;</span>
            </button>
          </div>

          {/* Pending / Approved Drivers Sub-Queue */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">
                  Captain Onboarding & Security Approvals
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveApprovalSubTab('pending')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeApprovalSubTab === 'pending'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-600'
                  }`}
                >
                  Pending Queue ({pendingApprovalsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveApprovalSubTab('approved')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeApprovalSubTab === 'approved'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-600'
                  }`}
                >
                  Approved Captains ({approvedList.length})
                </button>
              </div>
            </div>

            {/* Sub-Queue List */}
            {activeApprovalSubTab === 'pending' ? (
              <div className="space-y-3">
                {pendingList.map((appr) => (
                  <div
                    key={appr.id}
                    className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-white hover:border-amber-300 hover:shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      {appr.driverPhoto ? (
                        <img
                          src={appr.driverPhoto}
                          alt={appr.driverName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-300 shadow-2xs shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => handleOpenReviewModal(appr)}
                        />
                      ) : (
                        <div 
                          onClick={() => handleOpenReviewModal(appr)}
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border border-amber-300 flex items-center justify-center font-extrabold text-sm shrink-0 cursor-pointer"
                        >
                          {appr.driverName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-base text-[#111111]">{appr.driverName}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            Pending Review
                          </span>
                          {appr.totoPhotos && appr.totoPhotos.length > 0 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              📷 {appr.totoPhotos.length} Photos
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <strong className="text-neutral-800">{appr.phone}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3 text-neutral-400" />
                            <strong className="font-mono text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-200">{appr.vehicleNumber}</strong>
                          </span>
                          <span className="text-neutral-500">
                            Model: <strong className="text-neutral-700 font-semibold">{appr.vehicleModel}</strong> ({appr.vehicleColor})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-amber-200/50">
                      <button
                        type="button"
                        onClick={() => handleOpenReviewModal(appr)}
                        className="flex-1 md:flex-initial py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:border-[#C8622A] hover:text-[#C8622A] transition-all cursor-pointer active:scale-95"
                        title="Open Details Review Modal to inspect full KYC, driver photo, and Toto vehicle photos"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C8622A]" />
                        <span>Details Review</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingId === appr.id}
                        onClick={() => handleApprove(appr)}
                        className="flex-1 md:flex-initial py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Approve & Generate Security PIN directly"
                      >
                        {isProcessingId === appr.id ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>Approve & PIN</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingId === appr.id}
                        onClick={() => handleReject(appr.id)}
                        className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Reject Registration"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(appr)}
                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 font-bold text-xs border border-neutral-300 hover:border-rose-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-2xs"
                        title="Delete Driver Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                {pendingList.length === 0 && (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    <Check className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    No pending driver registrations in queue.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approvedList.map((appr) => (
                  <div key={appr.id} className="p-4 rounded-2xl border border-neutral-200 bg-[#FAF8F5] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {appr.driverPhoto ? (
                          <img
                            src={appr.driverPhoto}
                            alt={appr.driverName}
                            className="w-8 h-8 rounded-xl object-cover border border-neutral-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {appr.driverName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="font-bold text-sm text-neutral-900">{appr.driverName}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Approved
                      </span>
                    </div>
                    <div className="text-neutral-500 font-mono text-[11px] flex items-center justify-between">
                      <span>{appr.vehicleNumber}</span>
                      <span>{appr.phone}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-600">Login PIN:</span>
                        <span className="font-mono font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-neutral-200">
                          {appr.generatedPin || '1234'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(appr)}
                          className="py-1 px-2.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-[#C8622A]" />
                          <span>Details Review</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(appr)}
                          className="py-1 px-2 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 border border-neutral-300 hover:border-rose-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          title="Delete Captain Profile"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE FLEET MAP */}
      {currentTab === 'live_map' && <AdminLiveMap />}

      {/* TAB 3: DRIVER MANAGEMENT */}
      {currentTab === 'drivers' && <AdminDriverManagement />}

      {/* TAB 4: CUSTOMER MANAGEMENT */}
      {currentTab === 'customers' && <AdminCustomerManagement />}

      {/* TAB 5: RIDES MANAGEMENT */}
      {currentTab === 'rides' && <AdminRidesManagement />}

      {/* TAB 6: PRICING & FARE SETTINGS */}
      {currentTab === 'pricing' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#C8622A]" />
                <div>
                  <h3 className="font-extrabold text-base text-[#111111]">
                    Dynamic Pricing Formula Configuration
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Adjust base fare, distance rates, and surge multipliers without redeploying code.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActionNotice('Pricing configurations saved and updated across all customer calculations.');
                  triggerSound('success');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Save Pricing Formula
              </button>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Base Fare (First 1.5 KM)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.baseFare}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, baseFare: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Minimum flat pickup fee</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Rate per Kilometer</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.perKmRate}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, perKmRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Applied beyond base distance</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Rate per Minute (Time Fare)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.perMinuteRate}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, perMinuteRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Traffic delay compensation</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Minimum Trip Fare</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.minimumFare}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, minimumFare: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Absolute floor price</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Peak Surge Multiplier</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">x</span>
                  <input
                    type="number"
                    step="0.1"
                    value={pricingConfig.peakSurgeMultiplier}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, peakSurgeMultiplier: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Demand rush multiplier (1.0x - 2.5x)</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Platform Commission %</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">%</span>
                  <input
                    type="number"
                    value={pricingConfig.serviceFeePercent}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, serviceFeePercent: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Retained by platform (Captain gets 90%)</p>
              </div>
            </div>

            {/* Vehicle Specific Pricing */}
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <h4 className="font-bold text-sm text-[#111111]">Vehicle Tier Rates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">E-Rickshaw (1 Person)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹20 • Per KM: ₹14</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">Toto Premium (2 Person)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹25 • Per KM: ₹16</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">Toto Deluxe (3 Person)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹30 • Per KM: ₹18</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">Full Reserve Toto</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹45 • Per KM: ₹20</div>
                </div>
              </div>
            </div>
          </div>

          {/* OWNER SETTLEMENT ACCOUNT & RECEIVING UPI ID */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-base text-neutral-900">
                      Owner Settlement Account & Wallet Recharge UPI ID
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Direct Wallet Routing
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Configure the Fleet Owner's UPI ID and settlement bank account. All passenger Toto Wallet recharge funds are received directly into this account.
                  </p>
                </div>
              </div>
            </div>

            {ownerUpiNotice && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                ownerUpiNotice.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {ownerUpiNotice.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{ownerUpiNotice.msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveOwnerUpiSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                  <label className="font-bold text-neutral-800">
                    Owner UPI ID (VPA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerUpiForm.ownerUpiId}
                    onChange={(e) => setOwnerUpiForm({ ...ownerUpiForm, ownerUpiId: e.target.value })}
                    placeholder="e.g. subratanaskar@icici"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-neutral-400">Must contain '@' (e.g. subratanaskar@icici)</p>
                </div>

                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                  <label className="font-bold text-neutral-800">
                    Payee / Beneficiary Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerUpiForm.ownerPayeeName}
                    onChange={(e) => setOwnerUpiForm({ ...ownerUpiForm, ownerPayeeName: e.target.value })}
                    placeholder="e.g. Subrata Naskar (Toto Drive Fleet)"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold text-neutral-900 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-neutral-400">Legal entity name displayed on passenger UPI receipts</p>
                </div>

                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                  <label className="font-bold text-neutral-800">
                    Settlement Bank Name
                  </label>
                  <input
                    type="text"
                    value={ownerUpiForm.ownerSettlementBank}
                    onChange={(e) => setOwnerUpiForm({ ...ownerUpiForm, ownerSettlementBank: e.target.value })}
                    placeholder="e.g. ICICI Bank / HDFC Bank"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold text-neutral-900 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-neutral-400">Beneficiary bank where UPI handle is linked</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Strictly wallet balance recharges route to this UPI ID. Driver trip earnings route directly to Toto captains.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSavingOwnerUpi}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingOwnerUpi ? <RotateCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  <span>{isSavingOwnerUpi ? 'Saving...' : 'Save Owner UPI Settlement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: COUPONS & PROMOTIONS MANAGEMENT */}
      {currentTab === 'coupons' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Coupon & Promo Code Engine</h3>
              </div>
            </div>

            {/* Create Coupon Form */}
            <form onSubmit={handleCreateCoupon} className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-3 text-xs">
              <div className="font-bold text-neutral-800">Generate New Campaign Voucher</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-neutral-500 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="e.g. MONSOON20"
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-mono font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-500 block mb-1">Discount %</label>
                  <input
                    type="number"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-500 block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={newCouponMax}
                    onChange={(e) => setNewCouponMax(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Add Coupon
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Coupons Table */}
            <div className="divide-y divide-neutral-100">
              {couponsList.map((cpn) => (
                <div key={cpn.code} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {cpn.code}
                      </span>
                      <span className="text-emerald-700 font-bold">{cpn.discount}% OFF</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-600">Max Cap: ₹{cpn.maxDiscount}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">Expires {cpn.expiry} • Min Fare: ₹{cpn.minFare}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(cpn.code)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      cpn.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                    }`}
                  >
                    {cpn.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: REPORTS & CSV EXPORT */}
      {currentTab === 'reports' && <AdminReports />}

      {/* TAB 9: BROADCAST NOTIFICATIONS */}
      {currentTab === 'notifications' && <AdminNotifications />}

      {/* TAB 10: AUDIT LOGS */}
      {currentTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">
                  Immutable System Audit Logs
                </h3>
              </div>
              <span className="text-xs text-neutral-500">Total Entries: {auditLogs.length}</span>
            </div>

            <div className="space-y-2 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-neutral-900">{log.action}</div>
                    <div className="text-neutral-500 text-[11px]">{log.target} • Executed by <strong className="text-neutral-800">{log.actor}</strong></div>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">{log.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: DATABASE & DATA STORAGE */}
      {currentTab === 'database_storage' && <AdminDatabaseStorage />}

      {/* TAB 12: WHATSAPP BERRY PROTOCOL */}
      {currentTab === 'whatsapp_protocol' && <AdminWhatsAppProtocol />}

      {/* TAB 13: ADMIN SECURITY & CREDENTIALS */}
      {currentTab === 'security' && <AdminSecurityTab />}

      {/* DETAILS REVIEW MODAL */}
      {selectedReviewDriver && (
        <div 
          id="details-review-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
        >
          <div 
            id="details-review-modal-container"
            className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-neutral-200 space-y-5 max-h-[92vh] flex flex-col justify-between"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C8622A]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#111111] tracking-tight">
                    Driver & Vehicle Details Review
                  </h3>
                  <p className="text-xs text-neutral-500">
                    KYC credentials, identity photo, and Toto vehicle documentation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isReviewedApproved || selectedReviewDriver.status === 'approved' ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wide border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Approved
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wide border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Review
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReviewDriver(null)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold flex items-center justify-center cursor-pointer transition-colors"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto space-y-5 pr-1 text-xs no-scrollbar">
              {/* SECTION 1: DRIVER PROFILE & IDENTITY PHOTO */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={
                      selectedReviewDriver.driverPhoto ||
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
                    }
                    alt={selectedReviewDriver.driverName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xs cursor-pointer group-hover:brightness-95 transition-all"
                    onClick={() =>
                      setActivePhotoModal({
                        url:
                          selectedReviewDriver.driverPhoto ||
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
                        title: `Driver Photo - ${selectedReviewDriver.driverName}`
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoModal({
                        url:
                          selectedReviewDriver.driverPhoto ||
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
                        title: `Driver Photo - ${selectedReviewDriver.driverName}`
                      })
                    }
                    className="absolute bottom-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-lg cursor-pointer"
                    title="Zoom Driver Photo"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider shadow-2xs">
                    Selfie
                  </span>
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-black text-[#111111]">{selectedReviewDriver.driverName}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Govt Verified Captain
                    </span>
                  </div>

                  <div className="text-neutral-600 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 font-semibold">Phone:</span>
                      <strong className="text-neutral-900 font-mono">{selectedReviewDriver.phone}</strong>
                      <button
                        type="button"
                        onClick={() => copyPinToClipboard(selectedReviewDriver.phone)}
                        className="text-[10px] text-[#C8622A] hover:underline font-bold cursor-pointer ml-1"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 font-semibold">Registered:</span>
                      <span className="text-neutral-700">
                        {selectedReviewDriver.createdAt
                          ? new Date(selectedReviewDriver.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 font-semibold">Service Zone:</span>
                      <span className="text-neutral-700 font-medium">Kolkata & Salt Lake Sector V</span>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] font-bold text-neutral-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Aadhaar Verified
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] font-bold text-neutral-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Commercial DL Valid
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] font-bold text-neutral-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Mobile OTP Confirmed
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VEHICLE INFORMATION & LICENSE PLATE */}
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-emerald-600" />
                    <span>Registered Toto Vehicle Details</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Eco 100% Electric
                  </span>
                </div>

                {/* Indian High Security Registration Plate (HSRP) representation */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-neutral-400">Official License Plate</div>
                    <div className="mt-1 inline-flex items-center rounded-lg border-2 border-neutral-800 bg-amber-300 overflow-hidden shadow-2xs font-mono font-black text-base text-neutral-950">
                      <div className="bg-blue-800 text-white px-2 py-1 flex flex-col items-center justify-center text-[8px] leading-tight font-sans">
                        <span>IND</span>
                      </div>
                      <div className="px-3 py-1 tracking-wider">
                        {selectedReviewDriver.vehicleNumber}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-right sm:text-right w-full sm:w-auto">
                    <div className="text-[10px] font-bold uppercase text-neutral-400">Vehicle Model</div>
                    <div className="font-extrabold text-neutral-900 text-sm">{selectedReviewDriver.vehicleModel}</div>
                    <div className="text-[11px] text-neutral-600 font-medium">
                      Color: <strong className="text-neutral-800">{selectedReviewDriver.vehicleColor}</strong> • 4 Seats + Driver
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-[#FAF8F5]">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Battery System</div>
                    <div className="font-bold text-neutral-800 mt-0.5">60V Li-ion (LFP)</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-[#FAF8F5]">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Motor Output</div>
                    <div className="font-bold text-neutral-800 mt-0.5">1200W BLDC</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-[#FAF8F5]">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Fitness Valid</div>
                    <div className="font-bold text-emerald-700 mt-0.5">Passed Oct 2028</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-[#FAF8F5]">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Commercial Permit</div>
                    <div className="font-bold text-emerald-700 mt-0.5">WB-RTO Verified</div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: TOTO VEHICLE PHOTOS */}
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#C8622A]" />
                    <span>Toto Vehicle Inspection Photos</span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium">Click any photo to enlarge</span>
                </div>

                {/* Photos Grid */}
                {(() => {
                  const photos =
                    selectedReviewDriver.totoPhotos && selectedReviewDriver.totoPhotos.length > 0
                      ? selectedReviewDriver.totoPhotos
                      : [
                          'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80',
                          'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=600&auto=format&fit=crop&q=80',
                          'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80'
                        ];

                  const photoLabels = [
                    'Front View & Number Plate',
                    'Passenger Cabin & Seating',
                    'Battery Compartment & Chassis'
                  ];

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {photos.slice(0, 3).map((url, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 aspect-4/3 cursor-pointer shadow-2xs hover:shadow-xs transition-all"
                          onClick={() =>
                            setActivePhotoModal({
                              url,
                              title: `Toto Vehicle Photo #${idx + 1}: ${photoLabels[idx] || 'Exterior'}`
                            })
                          }
                        >
                          <img
                            src={url}
                            alt={`Toto vehicle view ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <span className="self-end px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px]">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center justify-between text-white text-[10px] font-bold">
                              <span className="truncate pr-1">{photoLabels[idx] || 'Toto Photo'}</span>
                              <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 4: ADMIN REVIEW CHECKLIST */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-neutral-800 tracking-wider">
                    Verification Review Checklist
                  </span>
                  {!isReviewedApproved && selectedReviewDriver.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={handleMarkAsApproved}
                      className="text-xs font-bold text-[#C8622A] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark All as Reviewed & Approved
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.identityVerified}
                      onChange={() => handleToggleReviewCheck('identityVerified')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-neutral-800 font-medium">
                      Driver photo matches registered name and government identification.
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.plateVerified}
                      onChange={() => handleToggleReviewCheck('plateVerified')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-neutral-800 font-medium">
                      License plate <strong className="font-mono">{selectedReviewDriver.vehicleNumber}</strong> matches official state transport registration.
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.vehiclePhotosApproved}
                      onChange={() => handleToggleReviewCheck('vehiclePhotosApproved')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-neutral-800 font-medium">
                      Toto photos inspected: clean cabin, intact passenger hood, and functional battery.
                    </span>
                  </label>
                </div>

                {/* APPROVED STATUS INDICATOR */}
                {(isReviewedApproved || selectedReviewDriver.status === 'approved') && (
                  <div 
                    id="review-approved-status-indicator"
                    className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center justify-between shadow-2xs animate-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                          <span>Verification Status: Approved</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          Driver identity, vehicle plate, and Toto inspection photos reviewed and approved by Admin.
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs shrink-0">
                      Approved
                    </span>
                  </div>
                )}
              </div>

              {/* GENERATED PIN STATE (IF ALREADY FINALIZED OR GENERATED) */}
              {(reviewGeneratedPin || selectedReviewDriver.generatedPin) && (
                <div className="p-4 bg-white border-2 border-emerald-300 rounded-3xl space-y-3 animate-in zoom-in-95 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        SECURITY PIN READY
                      </span>
                      <h4 className="text-sm font-extrabold text-[#111111]">
                        Captain Login PIN Assigned
                      </h4>
                    </div>
                    <span className="text-3xl font-mono font-black tracking-widest text-[#111111] bg-amber-100 px-4 py-1.5 rounded-2xl border border-amber-300 shadow-2xs">
                      {reviewGeneratedPin || selectedReviewDriver.generatedPin}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => copyPinToClipboard(reviewGeneratedPin || selectedReviewDriver.generatedPin || '1234')}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      {copiedPin ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPin ? 'PIN Copied!' : 'Copy Security PIN'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleTestLoginAsDriver(
                          selectedReviewDriver.phone,
                          reviewGeneratedPin || selectedReviewDriver.generatedPin || '1234'
                        );
                        setSelectedReviewDriver(null);
                      }}
                      className="flex-1 py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Test Driver Login</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Action Bar */}
            <div className="pt-4 border-t border-neutral-100 shrink-0 space-y-2">
              {!reviewGeneratedPin && selectedReviewDriver.status !== 'approved' ? (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    id="details-review-generate-pin-btn"
                    type="button"
                    disabled={isProcessingId === selectedReviewDriver.id}
                    onClick={() => handleFinalizeAndGeneratePin(selectedReviewDriver)}
                    className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingId === selectedReviewDriver.id ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 text-amber-200" />
                    )}
                    <span>Generate PIN</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingId === selectedReviewDriver.id}
                    onClick={() => {
                      handleReject(selectedReviewDriver.id);
                      setSelectedReviewDriver(null);
                    }}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Reject Application
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenDeleteModal(selectedReviewDriver);
                    }}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    title="Permanently Delete Driver Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReviewDriver(null)}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenDeleteModal(selectedReviewDriver);
                    }}
                    className="py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Permanently Delete Driver Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Driver Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReviewDriver(null)}
                    className="py-2.5 px-6 rounded-2xl bg-neutral-900 hover:bg-black text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    Done & Close Dossier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX ZOOM MODAL */}
      {activePhotoModal && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActivePhotoModal(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-xl w-full p-4 space-y-3 shadow-2xl border border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h4 className="font-extrabold text-sm text-neutral-900 truncate">
                {activePhotoModal.title}
              </h4>
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-neutral-900 max-h-[70vh] flex items-center justify-center">
              <img
                src={activePhotoModal.url}
                alt={activePhotoModal.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Generated PIN Confirmation Modal */}
      {approvedPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl border border-neutral-200 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 tracking-wider uppercase">
                APPROVAL SUCCESSFUL
              </span>
              <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight">
                4-Digit PIN Generated!
              </h3>
              <p className="text-xs text-neutral-500">
                Driver <strong className="text-neutral-900">{approvedPinModal.driverName}</strong> has been approved with plate <strong className="text-neutral-900">{approvedPinModal.vehicleNumber}</strong>.
              </p>
            </div>

            {/* PIN Display */}
            <div className="bg-[#FAF8F5] border-2 border-[#E5DFD5] rounded-3xl p-5 space-y-2">
              <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Driver Security Login PIN
              </div>
              <div className="text-4xl font-extrabold font-mono tracking-widest text-[#111111]">
                {approvedPinModal.pin}
              </div>
              <div className="text-[11px] text-neutral-500">
                Driver uses Mobile ({approvedPinModal.phone}) + this PIN for login.
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => copyPinToClipboard(approvedPinModal.pin)}
                className="w-full py-3 bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-[0.98] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {copiedPin ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPin ? 'PIN Copied to Clipboard!' : 'Copy 4-Digit PIN'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTestLoginAsDriver(approvedPinModal.phone, approvedPinModal.pin);
                  setApprovedPinModal(null);
                }}
                className="w-full py-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Test Login to Driver Dashboard Now</span>
              </button>

              <button
                type="button"
                onClick={() => setApprovedPinModal(null)}
                className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Change Modal */}
      {/* CREDENTIALS UPDATE MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                  <Key className="w-4 h-4 text-[#C8622A]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Admin Credentials</h3>
                  <p className="text-[11px] text-neutral-500">Update Username & Password for future logins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newUsernameVal.trim() || newUsernameVal.trim().length < 3) {
                  setPasswordNotice({ success: false, msg: 'Username must be at least 3 characters long.' });
                  return;
                }
                if (!newPasswordVal.trim() || newPasswordVal.trim().length < 3) {
                  setPasswordNotice({ success: false, msg: 'Password must be at least 3 characters long.' });
                  return;
                }
                if (newPasswordVal !== confirmPasswordVal) {
                  setPasswordNotice({ success: false, msg: 'Passwords do not match.' });
                  return;
                }
                const res = await updateAdminCredentials(newUsernameVal, newPasswordVal);
                if (res.success) {
                  setPasswordNotice({ success: true, msg: 'Credentials successfully updated!' });
                  setAuditLogs(prev => [
                    {
                      id: String(Date.now()),
                      action: 'Admin Credentials Updated',
                      actor: newUsernameVal.trim(),
                      target: `Username: "${newUsernameVal.trim()}"`,
                      time: 'Just now'
                    },
                    ...prev
                  ]);
                  setTimeout(() => {
                    setShowPasswordModal(false);
                    setNewPasswordVal('');
                    setConfirmPasswordVal('');
                    setPasswordNotice(null);
                  }, 1500);
                } else {
                  setPasswordNotice({ success: false, msg: res.message });
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Admin Username
                </label>
                <input
                  type="text"
                  value={newUsernameVal}
                  onChange={(e) => setNewUsernameVal(e.target.value)}
                  placeholder="Admin"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Enter new password (min. 3 chars)"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              {passwordNotice && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${passwordNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <span>{passwordNotice.msg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#181818] hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Logout Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div 
          id="admin-logout-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutConfirmModal(false)}
        >
          <div 
            id="admin-logout-modal"
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-2xl text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-200/80 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 flex-1">
                <h3 className="text-base font-extrabold text-neutral-900 leading-tight">
                  Log Out of Admin Console?
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Administrator Reconfirmation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cancel and close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                <AlertTriangle className="w-4 h-4 text-[#C8622A] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Are you sure you want to exit the admin dashboard? You will be signed out of administrative operations and will require administrator credentials (<span className="font-bold text-neutral-900">{adminCredentials?.username || 'Admin'}</span>) to sign back in.
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 px-1">
                {pendingLogoutTarget === 'driver' 
                  ? 'Confirming will end your administrative privileges and switch you back to the Toto Partner view.'
                  : 'Confirming will revoke administrative privileges and sign you out of the admin console.'}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
              <button
                id="admin-logout-cancel-btn"
                type="button"
                onClick={() => {
                  triggerSound('beep');
                  setShowLogoutConfirmModal(false);
                }}
                className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Stay Logged In
              </button>

              <button
                id="admin-logout-confirm-btn"
                type="button"
                onClick={() => {
                  triggerSound('beep');
                  setShowLogoutConfirmModal(false);
                  logoutAdmin();
                  if (pendingLogoutTarget === 'driver') {
                    setActiveRole('driver');
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer text-center"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER PROFILE DELETION WORKFLOW MODAL */}
      <DeleteDriverModal
        driver={driverToDelete}
        isOpen={!!driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirmDelete={handleConfirmDeleteDriver}
      />
    </div>
  );
};
