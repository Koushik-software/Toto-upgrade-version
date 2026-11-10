import React from 'react';
import { 
  X, 
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
  User as UserIcon
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useRide } from '../../context/RideContext';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
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
  onLogout
}) => {
  if (!isOpen) return null;

  const { triggerSound } = useRide();

  const handleAction = (callback: () => void) => {
    onClose();
    setTimeout(() => {
      callback();
    }, 150);
  };

  const handleLogoutClick = () => {
    onClose();
    setTimeout(() => {
      onLogout();
    }, 150);
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
      action: () => handleAction(onOpenWallet)
    },
    {
      id: 'schedule',
      title: 'Schedule Ride',
      subtitle: 'Plan upcoming metro & office trips',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      action: () => handleAction(onOpenSchedule)
    },
    {
      id: 'saved_places',
      title: 'Saved Places',
      subtitle: 'Home, Work, Station & favorite hubs',
      icon: Bookmark,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      action: () => handleAction(onOpenSavedPlaces)
    },
    {
      id: 'history',
      title: 'My Rides',
      subtitle: `${completedRidesCount} past journeys & downloadable receipts`,
      badge: `${completedRidesCount} trips`,
      badgeColor: 'bg-neutral-100 text-neutral-700 border-neutral-200',
      icon: History,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      action: () => handleAction(onOpenHistory)
    },
    {
      id: 'coupons',
      title: 'Offers & Coupons',
      subtitle: 'Discounts, cashbacks & festival codes',
      icon: Tag,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      action: () => handleAction(onOpenCoupons)
    },
    {
      id: 'safety',
      title: 'Safety Center',
      subtitle: 'SOS trigger, emergency contacts & live sharing',
      icon: ShieldCheck,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100',
      action: () => handleAction(onOpenSafety)
    },
    {
      id: 'support',
      title: 'Help & Support',
      subtitle: '24/7 ride assistance & support tickets',
      icon: LifeBuoy,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      action: () => handleAction(onOpenSupport)
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#EDE8E0] max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#F0EBE1] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4 text-[#FF7A1A]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#111111] tracking-tight">Account & Settings</h2>
              <p className="text-[11px] text-neutral-500 font-medium">Manage preferences and ride tools</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors border border-neutral-200 cursor-pointer shadow-2xs"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* User Profile Header Card */}
          <div className="bg-[#181818] text-white rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs border border-neutral-800">
            {/* Background Accent Glow */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#FF7A1A]/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7A1A] to-[#E05300] text-white font-extrabold text-xl flex items-center justify-center shadow-md ring-2 ring-white/20 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-base text-white tracking-tight truncate">
                    {user?.name || 'Verified Passenger'}
                  </h3>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <p className="text-xs text-neutral-300 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span>{user?.phone || '+91 98311 02458'}</span>
                  </p>
                  {user?.email && (
                    <p className="text-[11px] text-neutral-300 flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-neutral-300">
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>4.9 Rating</span>
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/80">
                    {completedRidesCount} {completedRidesCount === 1 ? 'ride' : 'rides'} completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Menu Options */}
          <div className="bg-white rounded-2xl border border-[#EDE8E0] divide-y divide-[#F2EDE5] overflow-hidden shadow-2xs">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#111111] group-hover:text-[#FF7A1A] transition-colors truncate">
                          {item.title}
                        </p>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Logout Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full py-3 px-4 bg-[#FFF5F5] hover:bg-[#FFEBEB] text-[#D93838] border border-[#FFD5D5] rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Account</span>
            </button>
          </div>

          {/* App Info Footer */}
          <div className="text-center pt-1 pb-1">
            <p className="text-[10px] text-gray-400 font-medium">
              RapidoToto Electric Mobility • Version 2.4.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
