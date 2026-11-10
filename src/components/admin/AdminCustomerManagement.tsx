import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Wallet, 
  Star, 
  Phone, 
  Mail, 
  History, 
  PlusCircle, 
  Ban, 
  CheckCircle2,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  Download,
  FileText,
  UserPlus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const AdminCustomerManagement: React.FC = () => {
  const { 
    allUsers, 
    adminUpdateUser, 
    adminCreateUser, 
    adminDeleteUser, 
    adminAdjustUserWallet, 
    adminToggleUserStatus, 
    triggerSound,
    isSupabaseConnected 
  } = useRide();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [walletAmount, setWalletAmount] = useState<number>(100);
  const [walletNote, setWalletNote] = useState<string>('Dispute refund / Promo balance');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Edit User Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Create User Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    phone: '+91 ',
    email: '',
    walletBalance: 200,
    rating: 5.0,
    notes: 'Registered via Admin Panel'
  });

  // Delete User Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const filteredCustomers = allUsers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (c.status || 'active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (user: UserProfile) => {
    triggerSound('beep');
    await adminToggleUserStatus(user.id);
    const newStatus = user.status === 'blocked' ? 'ACTIVE' : 'BLOCKED';
    setActionNotice(`User "${user.name}" status updated to ${newStatus}. Synced with database.`);
    if (selectedCustomer?.id === user.id) {
      setSelectedCustomer({ ...user, status: user.status === 'blocked' ? 'active' : 'blocked' });
    }
  };

  const handleAddWalletBalance = async (customerId: string) => {
    if (walletAmount <= 0) return;
    triggerSound('success');
    await adminAdjustUserWallet(customerId, walletAmount, walletNote);
    setActionNotice(`Credited ₹${walletAmount} to wallet. Synced with Supabase & appDb.`);
    if (selectedCustomer && selectedCustomer.id === customerId) {
      setSelectedCustomer({
        ...selectedCustomer,
        walletBalance: (selectedCustomer.walletBalance || 0) + walletAmount
      });
    }
  };

  const handleDeductWalletBalance = async (customerId: string) => {
    if (walletAmount <= 0) return;
    triggerSound('alert');
    await adminAdjustUserWallet(customerId, -walletAmount, walletNote);
    setActionNotice(`Debited ₹${walletAmount} from wallet. Synced with Supabase & appDb.`);
    if (selectedCustomer && selectedCustomer.id === customerId) {
      setSelectedCustomer({
        ...selectedCustomer,
        walletBalance: Math.max(0, (selectedCustomer.walletBalance || 0) - walletAmount)
      });
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    triggerSound('beep');
    await adminUpdateUser(editingUser.id, {
      name: editingUser.name,
      phone: editingUser.phone,
      email: editingUser.email,
      rating: editingUser.rating,
      notes: editingUser.notes
    });
    setActionNotice(`Profile details for "${editingUser.name}" updated successfully.`);
    setIsEditModalOpen(false);
    if (selectedCustomer?.id === editingUser.id) {
      setSelectedCustomer(editingUser);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.phone.trim()) return;
    triggerSound('success');
    const created = await adminCreateUser({
      name: newUserForm.name.trim(),
      phone: newUserForm.phone.trim(),
      email: newUserForm.email.trim(),
      walletBalance: Number(newUserForm.walletBalance) || 0,
      rating: Number(newUserForm.rating) || 5.0,
      notes: newUserForm.notes.trim(),
      totalRides: 0,
      status: 'active',
      avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(newUserForm.name)}`
    });
    setActionNotice(`Passenger "${created.name}" created and committed to database! ID: ${created.id}`);
    setIsCreateModalOpen(false);
    setNewUserForm({
      name: '',
      phone: '+91 ',
      email: '',
      walletBalance: 200,
      rating: 5.0,
      notes: 'Registered via Admin Panel'
    });
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    triggerSound('alert');
    await adminDeleteUser(userToDelete.id);
    setActionNotice(`Passenger "${userToDelete.name}" (${userToDelete.id}) removed from database.`);
    if (selectedCustomer?.id === userToDelete.id) {
      setSelectedCustomer(null);
    }
    setUserToDelete(null);
  };

  const handleExportUsersJson = () => {
    triggerSound('beep');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allUsers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `totodrive_users_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setActionNotice(`Exported ${allUsers.length} user records as JSON.`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Search, Status Filter & Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passengers by name, phone, email or ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl">
              {(['all', 'active', 'blocked'] as const).map((st) => (
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

            <button
              type="button"
              onClick={() => { setIsCreateModalOpen(true); triggerSound('beep'); }}
              className="px-3.5 py-2 rounded-2xl bg-[#C8622A] hover:bg-[#a84f1e] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Passenger</span>
            </button>

            <button
              type="button"
              onClick={handleExportUsersJson}
              className="px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Export all user records to JSON"
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
              Supabase DB Connected
            </span>
            <span>Total Passengers: <strong className="text-neutral-900">{allUsers.length}</strong></span>
          </div>
          <span className="text-[11px] text-neutral-400">Showing {filteredCustomers.length} matching</span>
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

      {/* Passenger Table Layout */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Rides & Rating</th>
                <th className="px-4 py-3">Wallet Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No passengers found matching query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={customer.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${customer.id}`}
                          alt={customer.name}
                          className="w-8 h-8 rounded-full bg-[#FDE8DC] object-cover border border-neutral-200"
                        />
                        <div>
                          <div className="font-bold text-neutral-900">{customer.name}</div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <span className="font-mono text-[9px]">{customer.id}</span>
                            {customer.createdAt && (
                              <span>• {new Date(customer.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-neutral-700 font-semibold">{customer.phone}</div>
                      <div className="text-neutral-400 text-[11px] truncate max-w-[150px]">{customer.email || 'No email provided'}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-neutral-900 font-bold">{customer.totalRides || 0} trips</div>
                      <div className="text-amber-600 text-[11px] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{customer.rating ? customer.rating.toFixed(1) : '5.0'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-emerald-700 font-mono text-sm">
                        ₹{customer.walletBalance ?? 0}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        customer.status === 'blocked'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {customer.status || 'active'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => { setSelectedCustomer(customer); triggerSound('beep'); }}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                        title="View & manage wallet"
                      >
                        Wallet
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingUser(customer); setIsEditModalOpen(true); triggerSound('beep'); }}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                        title="Edit profile"
                      >
                        <Edit2 className="w-3 h-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(customer)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                          customer.status === 'blocked'
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                        title={customer.status === 'blocked' ? 'Unblock rider' : 'Block rider'}
                      >
                        {customer.status === 'blocked' ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUserToDelete(customer); triggerSound('alert'); }}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                        title="Delete passenger record"
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

      {/* Customer Manage / Wallet Credit Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Passenger Wallet & Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1">
                <div className="font-bold text-sm text-[#111111]">{selectedCustomer.name}</div>
                <div className="text-neutral-500">Phone: <strong>{selectedCustomer.phone}</strong></div>
                <div className="text-neutral-500">Email: {selectedCustomer.email || 'None'}</div>
                {selectedCustomer.notes && (
                  <div className="text-neutral-600 italic pt-1 border-t border-neutral-200 text-[11px]">
                    "{selectedCustomer.notes}"
                  </div>
                )}
              </div>

              {/* Wallet Adjustment Controls */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>Balance Adjustment Tool</span>
                  <span className="font-mono text-emerald-800 text-sm">₹{selectedCustomer.walletBalance ?? 0}</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Adjustment Amount (₹)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Reason / Note</label>
                  <input
                    type="text"
                    value={walletNote}
                    onChange={(e) => setWalletNote(e.target.value)}
                    placeholder="e.g. Promo credit, ride dispute settlement"
                    className="w-full px-3 py-1.5 mt-1 bg-white border border-neutral-200 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddWalletBalance(selectedCustomer.id)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    + Credit ₹{walletAmount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeductWalletBalance(selectedCustomer.id)}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    - Debit ₹{walletAmount}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Edit Passenger Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Rating (1 - 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingUser.rating}
                    onChange={(e) => setEditingUser({ ...editingUser, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Status</label>
                  <select
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'blocked' })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Admin Internal Notes</label>
                <textarea
                  rows={2}
                  value={editingUser.notes || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, notes: e.target.value })}
                  placeholder="Notes about commuter patterns, dispute history, etc."
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl mt-1 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#C8622A] hover:bg-[#a84f1e] text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Passenger Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Register New Passenger</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Passenger Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Tanmoy Banerjee"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="+91 98300 00000"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="tanmoy@example.com"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Initial Wallet Balance (₹)</label>
                  <input
                    type="number"
                    value={newUserForm.walletBalance}
                    onChange={(e) => setNewUserForm({ ...newUserForm, walletBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Initial Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={newUserForm.rating}
                    onChange={(e) => setNewUserForm({ ...newUserForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl font-bold mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Internal Notes</label>
                <input
                  type="text"
                  value={newUserForm.notes}
                  onChange={(e) => setNewUserForm({ ...newUserForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-neutral-200 rounded-xl mt-1 text-xs"
                />
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
                  Commit to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-[#111111]">Delete Passenger Record</h3>
            </div>

            <p className="text-xs text-neutral-600">
              Are you sure you want to permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.phone}) from both Supabase and appDb? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="py-2 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
