import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { ActiveRide } from '../../types';
import { 
  Car, 
  Search, 
  Clock, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Eye, 
  User, 
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Trash2,
  Download,
  Edit2
} from 'lucide-react';

export const AdminRidesManagement: React.FC = () => {
  const { 
    allRides, 
    adminUpdateRide, 
    adminCreateRide, 
    adminDeleteRide, 
    allDrivers, 
    allUsers, 
    triggerSound, 
    isSupabaseConnected 
  } = useRide();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [selectedRide, setSelectedRide] = useState<ActiveRide | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Create Ride Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRideForm, setNewRideForm] = useState({
    userName: '',
    userPhone: '+91 ',
    driverName: '',
    driverPhone: '+91 ',
    vehicleNumber: '',
    pickupName: '',
    dropoffName: '',
    fare: 30,
    paymentMethod: 'cash' as 'cash' | 'upi' | 'wallet',
    status: 'completed' as 'completed' | 'in_progress' | 'cancelled'
  });

  // Edit Ride Modal
  const [editingRide, setEditingRide] = useState<ActiveRide | null>(null);

  // Delete Ride Confirmation Modal
  const [rideToDelete, setRideToDelete] = useState<ActiveRide | null>(null);

  const filteredRides = allRides.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      r.id.toLowerCase().includes(q) ||
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.userPhone && r.userPhone.includes(q)) ||
      (r.driverName && r.driverName.toLowerCase().includes(q)) ||
      (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(q)) ||
      (r.pickup?.name && r.pickup.name.toLowerCase().includes(q)) ||
      (r.dropoff?.name && r.dropoff.name.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (rideId: string, newStatus: ActiveRide['status']) => {
    triggerSound('beep');
    await adminUpdateRide(rideId, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined 
    });
    setActionNotice(`Ride ${rideId} marked as ${newStatus.toUpperCase()}. Updated in database.`);
    if (selectedRide?.id === rideId) {
      setSelectedRide({ ...selectedRide, status: newStatus });
    }
  };

  const handleCreateRideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerSound('success');
    const created = await adminCreateRide({
      userName: newRideForm.userName,
      userPhone: newRideForm.userPhone,
      driverName: newRideForm.driverName,
      driverPhone: newRideForm.driverPhone,
      vehicleNumber: newRideForm.vehicleNumber,
      pickup: {
        lat: 22.5735,
        lng: 88.4331,
        name: newRideForm.pickupName,
        address: newRideForm.pickupName
      },
      dropoff: {
        lat: 22.5898,
        lng: 88.4082,
        name: newRideForm.dropoffName,
        address: newRideForm.dropoffName
      },
      totalFare: Number(newRideForm.fare) || 35,
      driverEarnings: Math.round((Number(newRideForm.fare) || 35) * 0.9),
      paymentMethod: newRideForm.paymentMethod,
      status: newRideForm.status,
      bookedAt: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setActionNotice(`Ride ${created.id} created and committed to Supabase / appDb!`);
    setIsCreateModalOpen(false);
  };

  const handleSaveEditRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRide) return;
    triggerSound('beep');
    await adminUpdateRide(editingRide.id, {
      totalFare: editingRide.totalFare,
      driverEarnings: Math.round(editingRide.totalFare * 0.9),
      paymentMethod: editingRide.paymentMethod,
      paymentStatus: editingRide.paymentStatus,
      status: editingRide.status,
      pickup: editingRide.pickup,
      dropoff: editingRide.dropoff
    });
    setActionNotice(`Ride ${editingRide.id} updated in database.`);
    if (selectedRide?.id === editingRide.id) {
      setSelectedRide(editingRide);
    }
    setEditingRide(null);
  };

  const handleConfirmDelete = async () => {
    if (!rideToDelete) return;
    triggerSound('alert');
    await adminDeleteRide(rideToDelete.id);
    setActionNotice(`Ride ${rideToDelete.id} permanently removed from database.`);
    if (selectedRide?.id === rideToDelete.id) {
      setSelectedRide(null);
    }
    setRideToDelete(null);
  };

  const handleExportRidesJson = () => {
    triggerSound('beep');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allRides, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `totodrive_rides_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setActionNotice(`Exported ${allRides.length} ride records as JSON.`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ride ID, passenger, captain or vehicle number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl">
              {(['all', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
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
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setIsCreateModalOpen(true); triggerSound('beep'); }}
              className="px-3.5 py-2 rounded-2xl bg-[#C8622A] hover:bg-[#a84f1e] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Ride</span>
            </button>

            <button
              type="button"
              onClick={handleExportRidesJson}
              className="px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Export ride logs to JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live DB Table: rides
            </span>
            <span>Total Bookings: <strong className="text-neutral-900">{allRides.length}</strong></span>
          </div>
          <span className="text-[11px] text-neutral-400">Showing {filteredRides.length} matching</span>
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

      {/* Rides Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Ride ID & Date</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Captain & Toto</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Fare & Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredRides.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    No rides found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredRides.map((ride) => (
                  <tr key={ride.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-[#111111] font-mono">{ride.id}</div>
                      <div className="text-[11px] text-neutral-400">{ride.bookedAt || 'Recent'}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-neutral-900">{ride.userName || 'Passenger'}</div>
                      <div className="text-[11px] text-neutral-400">{ride.userPhone || '—'}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-neutral-900">{ride.driverName || 'Unassigned'}</div>
                      <div className="text-[11px] font-mono text-[#C8622A]">{ride.vehicleNumber || 'Toto Partner'}</div>
                    </td>

                    <td className="px-4 py-3.5 max-w-[200px]">
                      <div className="text-neutral-800 truncate font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{ride.pickup?.name || 'Pickup Point'}</span>
                      </div>
                      <div className="text-neutral-500 truncate text-[11px] flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="truncate">{ride.dropoff?.name || 'Destination'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-neutral-900 font-mono">₹{ride.totalFare}</div>
                      <span className="text-[10px] font-bold uppercase text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {ride.paymentMethod}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        ride.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ride.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {(ride.status || 'completed').replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => { setSelectedRide(ride); triggerSound('beep'); }}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                        title="Audit journey dossier"
                      >
                        Audit
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingRide(ride); triggerSound('beep'); }}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                        title="Edit ride data"
                      >
                        <Edit2 className="w-3 h-3 inline" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRideToDelete(ride); triggerSound('alert'); }}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                        title="Delete ride record"
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

      {/* Ride Audit & Timeline Modal */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">
                  Ride Audit Dossier ({selectedRide.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRide(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Route Summary */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Pickup Location</div>
                    <div className="font-bold text-neutral-800">{selectedRide.pickup?.name || 'Pickup Point'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Destination</div>
                    <div className="font-bold text-neutral-800">{selectedRide.dropoff?.name || 'Destination Point'}</div>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">Passenger</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{selectedRide.userName || 'Passenger'}</div>
                  <div className="text-neutral-500 text-[11px]">{selectedRide.userPhone || '—'}</div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">Captain</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{selectedRide.driverName || 'Unassigned'}</div>
                  <div className="font-mono text-[#C8622A] text-[11px]">{selectedRide.vehicleNumber || 'Toto'}</div>
                </div>
              </div>

              {/* Financial Ledger Breakdown */}
              <div className="p-3 bg-white rounded-2xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900 pb-1 border-b border-neutral-100 flex items-center justify-between">
                  <span>Fare & Settlement Ledger</span>
                  <span className="font-mono text-emerald-700">Total: ₹{selectedRide.totalFare}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Distance ({selectedRide.distanceKm || 1.8} km) & Time ({selectedRide.estimatedMins || 6} min)</span>
                  <span>₹{selectedRide.totalFare}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Captain Payout (90%)</span>
                  <span>₹{selectedRide.driverEarnings ?? Math.round(selectedRide.totalFare * 0.9)}</span>
                </div>
                <div className="flex items-center justify-between text-[#C8622A] font-bold">
                  <span>Platform Commission (10%)</span>
                  <span>₹{selectedRide.totalFare - (selectedRide.driverEarnings ?? Math.round(selectedRide.totalFare * 0.9))}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                  <span>Payment Method & Status</span>
                  <span className="uppercase font-mono font-bold">{selectedRide.paymentMethod} ({selectedRide.paymentStatus || 'paid'})</span>
                </div>
              </div>

              {/* Status Change Quick Controls */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900 text-[11px]">Manage Ride Status:</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRide.id, 'completed')}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs cursor-pointer"
                  >
                    Mark Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRide.id, 'in_progress')}
                    className="flex-1 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs cursor-pointer"
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRide.id, 'cancelled')}
                    className="flex-1 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer"
                  >
                    Cancel Ride
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRide(null)}
                className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ride Modal */}
      {editingRide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Edit Ride Booking ({editingRide.id})</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRide(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditRide} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Pickup Location</label>
                <input
                  type="text"
                  required
                  value={editingRide.pickup?.name || ''}
                  onChange={(e) => setEditingRide({
                    ...editingRide,
                    pickup: { ...(editingRide.pickup || { lat: 22.58, lng: 88.42 }), name: e.target.value, address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Dropoff Location</label>
                <input
                  type="text"
                  required
                  value={editingRide.dropoff?.name || ''}
                  onChange={(e) => setEditingRide({
                    ...editingRide,
                    dropoff: { ...(editingRide.dropoff || { lat: 22.59, lng: 88.43 }), name: e.target.value, address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Total Fare (₹)</label>
                  <input
                    type="number"
                    value={editingRide.totalFare}
                    onChange={(e) => setEditingRide({ ...editingRide, totalFare: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Status</label>
                  <select
                    value={editingRide.status}
                    onChange={(e) => setEditingRide({ ...editingRide, status: e.target.value as ActiveRide['status'] })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  >
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Payment Method</label>
                  <select
                    value={editingRide.paymentMethod}
                    onChange={(e) => setEditingRide({ ...editingRide, paymentMethod: e.target.value as 'cash' | 'upi' | 'wallet' })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Payment Status</label>
                  <select
                    value={editingRide.paymentStatus || 'paid'}
                    onChange={(e) => setEditingRide({ ...editingRide, paymentStatus: e.target.value as 'paid' | 'pending' })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRide(null)}
                  className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#C8622A] hover:bg-[#a84f1e] text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Update Ride
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Manual Ride Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Commit Ride to Database</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRideSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Passenger Name</label>
                  <input
                    type="text"
                    required
                    value={newRideForm.userName}
                    onChange={(e) => setNewRideForm({ ...newRideForm, userName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Passenger Phone</label>
                  <input
                    type="text"
                    required
                    value={newRideForm.userPhone}
                    onChange={(e) => setNewRideForm({ ...newRideForm, userPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Captain Name</label>
                  <input
                    type="text"
                    required
                    value={newRideForm.driverName}
                    onChange={(e) => setNewRideForm({ ...newRideForm, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Vehicle Number</label>
                  <input
                    type="text"
                    required
                    value={newRideForm.vehicleNumber}
                    onChange={(e) => setNewRideForm({ ...newRideForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Pickup Location</label>
                <input
                  type="text"
                  required
                  value={newRideForm.pickupName}
                  onChange={(e) => setNewRideForm({ ...newRideForm, pickupName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Dropoff Destination</label>
                <input
                  type="text"
                  required
                  value={newRideForm.dropoffName}
                  onChange={(e) => setNewRideForm({ ...newRideForm, dropoffName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Fare (₹)</label>
                  <input
                    type="number"
                    value={newRideForm.fare}
                    onChange={(e) => setNewRideForm({ ...newRideForm, fare: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Payment</label>
                  <select
                    value={newRideForm.paymentMethod}
                    onChange={(e) => setNewRideForm({ ...newRideForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Status</label>
                  <select
                    value={newRideForm.status}
                    onChange={(e) => setNewRideForm({ ...newRideForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  >
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#C8622A] hover:bg-[#a84f1e] text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Record Ride
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Ride Confirmation Modal */}
      {rideToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-[#111111]">Delete Ride Record</h3>
            </div>

            <p className="text-xs text-neutral-600">
              Are you sure you want to permanently delete ride <strong>{rideToDelete.id}</strong> ({rideToDelete.pickup?.name} → {rideToDelete.dropoff?.name}) from Supabase and local storage?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRideToDelete(null)}
                className="py-2 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
