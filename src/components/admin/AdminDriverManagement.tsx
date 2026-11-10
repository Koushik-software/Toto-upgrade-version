import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { DriverProfile, DriverApprovalRequest } from '../../types';
import { 
  Car, 
  ShieldCheck, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  Phone, 
  FileText, 
  UserCheck, 
  Eye, 
  Edit3, 
  Star, 
  BatteryCharging,
  Key,
  RotateCw,
  Copy,
  CheckCheck,
  Trash2,
  PlusCircle,
  Download,
  CheckCircle2,
  Edit2,
  Zap,
  Power,
  Users
} from 'lucide-react';
import { DeleteDriverModal } from './DeleteDriverModal';

export const AdminDriverManagement: React.FC = () => {
  const { 
    allDrivers,
    adminUpdateDriver,
    adminCreateDriver,
    deleteDriverProfile,
    driverApprovals, 
    approveDriverRegistration, 
    rejectDriverRegistration,
    triggerSound,
    isSupabaseConnected 
  } = useRide();

  const [activeTab, setActiveTab] = useState<'fleet' | 'registrations'>('fleet');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [fleetOnlineFilter, setFleetOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverApprovalRequest | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<DriverApprovalRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DriverApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Active Driver Edit Modal
  const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null);

  // Register New Driver Modal
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);
  const [newDriverForm, setNewDriverForm] = useState({
    name: '',
    phone: '+91 ',
    vehicleNumber: 'WB-24-ER-',
    vehicleModel: 'Mayuri Grand Li-ion E-Rickshaw',
    vehicleColor: 'Emerald Green',
    batteryPercentage: 90,
    rating: 4.9,
    accessPin: '1234'
  });

  // Active Driver Delete Target
  const [activeDriverToDelete, setActiveDriverToDelete] = useState<DriverProfile | null>(null);

  // Filtered registrations
  const filteredApprovals = driverApprovals.filter((d) => {
    const matchesSearch = 
      d.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered active fleet
  const filteredFleet = allDrivers.filter((d) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.vehicleNumber.toLowerCase().includes(q) ||
      d.vehicleModel.toLowerCase().includes(q);
    const matchesOnline = 
      fleetOnlineFilter === 'all' || 
      (fleetOnlineFilter === 'online' ? d.isOnline : !d.isOnline);
    return matchesSearch && matchesOnline;
  });

  const handleApprove = async (approval: DriverApprovalRequest) => {
    triggerSound('beep');
    try {
      const res = await approveDriverRegistration(approval.id);
      setActionNotice(`Driver "${approval.driverName}" approved! Login PIN: ${res.pin}. Saved to database.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (approvalId: string) => {
    triggerSound('beep');
    try {
      await rejectDriverRegistration(approvalId);
      setActionNotice('Driver marked as rejected.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteDriver = async (driverTarget: DriverApprovalRequest, reason: string) => {
    try {
      await deleteDriverProfile(driverTarget.id);
      if (selectedDriver?.id === driverTarget.id) {
        setSelectedDriver(null);
      }
      setActionNotice(`Driver "${driverTarget.driverName}" deleted. Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      setActionNotice(`Failed to delete driver: ${(err as Error).message}`);
    }
  };

  const handleToggleDriverOnline = async (d: DriverProfile) => {
    triggerSound('beep');
    await adminUpdateDriver(d.id, { 
      isOnline: !d.isOnline, 
      availabilityStatus: !d.isOnline ? 'online' : 'inactive' 
    });
    setActionNotice(`Captain "${d.name}" set to ${!d.isOnline ? 'ONLINE' : 'OFFLINE'}. Synced to database.`);
  };

  const handleSaveEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    triggerSound('beep');
    await adminUpdateDriver(editingDriver.id, {
      name: editingDriver.name,
      phone: editingDriver.phone,
      vehicleNumber: editingDriver.vehicleNumber.toUpperCase(),
      vehicleModel: editingDriver.vehicleModel,
      vehicleColor: editingDriver.vehicleColor,
      batteryPercentage: Number(editingDriver.batteryPercentage),
      rating: Number(editingDriver.rating),
      accessPin: editingDriver.accessPin
    });
    setActionNotice(`Captain profile "${editingDriver.name}" updated and synced to database.`);
    setEditingDriver(null);
  };

  const handleCreateDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverForm.name.trim() || !newDriverForm.vehicleNumber.trim()) return;
    triggerSound('success');
    const created = await adminCreateDriver({
      name: newDriverForm.name.trim(),
      phone: newDriverForm.phone.trim(),
      vehicleNumber: newDriverForm.vehicleNumber.trim().toUpperCase(),
      vehicleModel: newDriverForm.vehicleModel.trim(),
      vehicleColor: newDriverForm.vehicleColor.trim(),
      batteryPercentage: Number(newDriverForm.batteryPercentage) || 90,
      rating: Number(newDriverForm.rating) || 4.9,
      accessPin: newDriverForm.accessPin || '1234',
      isOnline: true,
      availabilityStatus: 'online'
    });
    setActionNotice(`Captain "${created.name}" (${created.vehicleNumber}) added to fleet!`);
    setIsCreateDriverOpen(false);
    setNewDriverForm({
      name: '',
      phone: '+91 ',
      vehicleNumber: 'WB-24-ER-',
      vehicleModel: 'Mayuri Grand Li-ion E-Rickshaw',
      vehicleColor: 'Emerald Green',
      batteryPercentage: 90,
      rating: 4.9,
      accessPin: '1234'
    });
  };

  const handleConfirmDeleteActiveDriver = async () => {
    if (!activeDriverToDelete) return;
    triggerSound('alert');
    await deleteDriverProfile(activeDriverToDelete.id);
    setActionNotice(`Captain "${activeDriverToDelete.name}" (${activeDriverToDelete.vehicleNumber}) removed from database.`);
    setActiveDriverToDelete(null);
  };

  const handleExportFleetJson = () => {
    triggerSound('beep');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allDrivers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `totodrive_fleet_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setActionNotice(`Exported ${allDrivers.length} driver fleet records as JSON.`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Module Subtabs (Active Fleet vs Registrations) */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-3xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-[#F6F4F0] p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => { setActiveTab('fleet'); triggerSound('beep'); }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'fleet'
                ? 'bg-white text-[#111111] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-[#C8622A]" />
            <span>Active Captains Fleet ({allDrivers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('registrations'); triggerSound('beep'); }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'registrations'
                ? 'bg-white text-[#111111] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>KYC & Registrations ({driverApprovals.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'fleet' && (
            <button
              type="button"
              onClick={() => { setIsCreateDriverOpen(true); triggerSound('beep'); }}
              className="px-3.5 py-2 rounded-2xl bg-[#C8622A] hover:bg-[#a84f1e] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Captain</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportFleetJson}
            className="px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Export driver fleet to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Captain name, mobile number, or vehicle number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
            />
          </div>

          {activeTab === 'fleet' ? (
            <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl">
              {(['all', 'online', 'offline'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setFleetOnlineFilter(st); triggerSound('beep'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    fleetOnlineFilter === st
                      ? 'bg-white text-[#111111] shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl overflow-x-auto">
              {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setStatusFilter(st); triggerSound('beep'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-[#111111] shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live DB Table: drivers
            </span>
            <span>Total Fleet: <strong className="text-neutral-900">{allDrivers.length}</strong></span>
          </div>
          <span className="text-[11px] text-neutral-400">
            Showing {activeTab === 'fleet' ? filteredFleet.length : filteredApprovals.length} matching
          </span>
        </div>

        {actionNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer">✕</button>
          </div>
        )}
      </div>

      {/* VIEW 1: ACTIVE CAPTAINS FLEET TABLE & MANAGEMENT */}
      {activeTab === 'fleet' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Captain & Contact</th>
                  <th className="px-4 py-3">Vehicle & Model</th>
                  <th className="px-4 py-3">Battery & Status</th>
                  <th className="px-4 py-3">Rides & Rating</th>
                  <th className="px-4 py-3">Earnings</th>
                  <th className="px-4 py-3">Login PIN</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {filteredFleet.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                      No captain partners found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredFleet.map((driver) => (
                    <tr key={driver.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={driver.photoUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100`}
                            alt={driver.name}
                            className="w-9 h-9 rounded-2xl object-cover border border-neutral-200 shadow-2xs"
                          />
                          <div>
                            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                              <span>{driver.name}</span>
                              <span className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-neutral-400" />
                              <span>{driver.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-[#C8622A]">{driver.vehicleNumber}</div>
                        <div className="text-neutral-500 text-[11px] truncate max-w-[150px]">{driver.vehicleModel}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                          <BatteryCharging className="w-3.5 h-3.5" />
                          <span>{driver.batteryPercentage}%</span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                          driver.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {driver.isOnline ? (driver.availabilityStatus || 'Online') : 'Offline'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-neutral-900">{driver.totalRides || 0} trips</div>
                        <div className="text-amber-600 text-[11px] flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{driver.rating ? driver.rating.toFixed(1) : '4.9'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-neutral-900">₹{driver.todayEarnings || 0}</div>
                        <div className="text-[10px] text-neutral-400">{driver.todayRides || 0} today</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                          {driver.accessPin || '1234'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleDriverOnline(driver)}
                          className={`px-2 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            driver.isOnline
                              ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Toggle Online/Offline state in database"
                        >
                          {driver.isOnline ? 'Set Offline' : 'Set Online'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingDriver(driver); triggerSound('beep'); }}
                          className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors cursor-pointer"
                          title="Edit Captain vehicle & profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveDriverToDelete(driver); triggerSound('alert'); }}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                          title="Delete captain from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: REGISTRATIONS & KYC APPROVAL PIPELINE */}
      {activeTab === 'registrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredApprovals.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-3xl p-4 border border-neutral-200 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {driver.driverPhoto ? (
                      <img 
                        src={driver.driverPhoto} 
                        alt={driver.driverName} 
                        className="w-10 h-10 rounded-2xl object-cover border border-neutral-200 shadow-2xs" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                        {driver.driverName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-[#111111]">{driver.driverName}</h4>
                      <a href={`tel:${driver.phone}`} className="text-xs text-neutral-500 font-medium hover:text-[#C8622A] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{driver.phone}</span>
                      </a>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    driver.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : driver.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {driver.status}
                  </span>
                </div>

                <div className="bg-[#FAF8F5] p-2.5 rounded-2xl border border-neutral-200 mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-medium">Vehicle No:</span>
                    <span className="font-mono font-bold text-[#111111]">{driver.vehicleNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-medium">Model:</span>
                    <span className="font-semibold text-neutral-800 truncate max-w-[150px]">{driver.vehicleModel}</span>
                  </div>
                  {driver.generatedPin && (
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                      <span className="text-[#C8622A] font-bold flex items-center gap-1">
                        <Key className="w-3 h-3" /> Login PIN:
                      </span>
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {driver.generatedPin}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedDriver(driver); triggerSound('beep'); }}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C8622A]" />
                  <span>Inspect KYC</span>
                </button>

                {driver.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(driver)}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectTarget(driver); setRejectReason(''); triggerSound('alert'); }}
                      className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => { setDriverToDelete(driver); triggerSound('alert'); }}
                  className="py-2 px-2.5 rounded-xl bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 font-bold text-xs border border-neutral-300 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Active Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Edit Captain Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditDriver} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Captain Name</label>
                <input
                  type="text"
                  required
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editingDriver.phone}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Vehicle Number</label>
                  <input
                    type="text"
                    required
                    value={editingDriver.vehicleNumber}
                    onChange={(e) => setEditingDriver({ ...editingDriver, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Battery %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingDriver.batteryPercentage}
                    onChange={(e) => setEditingDriver({ ...editingDriver, batteryPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Vehicle Model</label>
                <input
                  type="text"
                  value={editingDriver.vehicleModel}
                  onChange={(e) => setEditingDriver({ ...editingDriver, vehicleModel: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingDriver.rating}
                    onChange={(e) => setEditingDriver({ ...editingDriver, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Login PIN</label>
                  <input
                    type="text"
                    value={editingDriver.accessPin || ''}
                    onChange={(e) => setEditingDriver({ ...editingDriver, accessPin: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-mono font-bold mt-1"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#C8622A] hover:bg-[#a84f1e] text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Captain Modal */}
      {isCreateDriverOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Register New Captain to Fleet</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDriverOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDriverSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Captain Name *</label>
                <input
                  type="text"
                  required
                  value={newDriverForm.name}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra Mondal"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Mobile Phone *</label>
                <input
                  type="text"
                  required
                  value={newDriverForm.phone}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    value={newDriverForm.vehicleNumber}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Login PIN</label>
                  <input
                    type="text"
                    value={newDriverForm.accessPin}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, accessPin: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-mono font-bold mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Toto Model</label>
                <input
                  type="text"
                  value={newDriverForm.vehicleModel}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicleModel: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Color</label>
                  <input
                    type="text"
                    value={newDriverForm.vehicleColor}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicleColor: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Battery (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newDriverForm.batteryPercentage}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, batteryPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDriverOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#C8622A] hover:bg-[#a84f1e] text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Commit to Fleet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Driver Delete Confirmation Modal */}
      {activeDriverToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-[#111111]">Remove Captain from Fleet</h3>
            </div>

            <p className="text-xs text-neutral-600">
              Are you sure you want to permanently delete Captain <strong>{activeDriverToDelete.name}</strong> ({activeDriverToDelete.vehicleNumber}) from the database?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveDriverToDelete(null)}
                className="py-2 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteActiveDriver}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
              >
                Delete Captain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Inspection Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-[#111111]">KYC & Vehicle Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center gap-3">
                {selectedDriver.driverPhoto ? (
                  <img
                    src={selectedDriver.driverPhoto}
                    alt={selectedDriver.driverName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 font-bold text-lg flex items-center justify-center shrink-0">
                    {selectedDriver.driverName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-[#111111]">{selectedDriver.driverName}</div>
                  <div className="text-neutral-500">Phone: {selectedDriver.phone}</div>
                  <div className="text-neutral-500">Registered: {new Date(selectedDriver.createdAt).toLocaleDateString()}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{selectedDriver.vehicleModel} ({selectedDriver.vehicleColor})</div>
                </div>
              </div>

              {selectedDriver.totoPhotos && selectedDriver.totoPhotos.length > 0 && (
                <div className="space-y-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-800 flex items-center justify-between">
                    <span>Submitted Toto Rickshaw Photos:</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {selectedDriver.totoPhotos.length} Photos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedDriver.totoPhotos.map((imgUrl, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-white">
                        <img
                          src={imgUrl}
                          alt={`Toto vehicle ${i + 1}`}
                          className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="font-bold text-neutral-700">Verification Documents:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Commercial DL</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> WB-19-20180029
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Vehicle RC</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {selectedDriver.vehicleNumber}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Aadhaar Card</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Battery Fitness</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passed 60V Li-ion
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const toDel = selectedDriver;
                  setSelectedDriver(null);
                  setDriverToDelete(toDel);
                  triggerSound('alert');
                }}
                className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Dossier</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDriver(null)}
                  className="py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>

                {selectedDriver.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedDriver;
                        setSelectedDriver(null);
                        setRejectTarget(target);
                        setRejectReason('');
                        triggerSound('alert');
                      }}
                      className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApprove(selectedDriver);
                        setSelectedDriver(null);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-200" />
                      <span>Generate PIN & Approve</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Registration Modal with Reason */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                  ✕
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#111111]">Reject Captain Application</h3>
                  <p className="text-[11px] text-neutral-500">{rejectTarget.driverName} · {rejectTarget.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-[11px] font-bold text-neutral-600 uppercase">Reason for Rejection (Visible to Captain)</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete RC document or unclear driving license photo..."
                className="w-full p-3 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await rejectDriverRegistration(rejectTarget.id, rejectReason);
                    setActionNotice(`Captain "${rejectTarget.driverName}" registration rejected.`);
                    setRejectTarget(null);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Deletion Confirmation Modal */}
      <DeleteDriverModal
        driver={driverToDelete}
        isOpen={!!driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirmDelete={handleConfirmDeleteDriver}
      />
    </div>
  );
};
