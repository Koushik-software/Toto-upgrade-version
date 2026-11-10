import React from 'react';
import { useRide } from '../../context/RideContext';
import { Home, Car, User } from 'lucide-react';
import { motion } from 'motion/react';

export const BottomNavigation: React.FC = () => {
  const { activeRole, user, driver, triggerSound, activeNavTab, setActiveNavTab } = useRide();

  // Show bottom navigation for both passenger and driver apps when logged in
  if (activeRole === 'admin') return null;
  if (activeRole === 'user' && !user) return null;
  if (activeRole === 'driver' && !driver) return null;

  const navItems: Array<{ id: 'home' | 'rides' | 'profile'; icon: typeof Home; label: string }> = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'rides', icon: Car, label: 'My Ride' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav 
      aria-label="App Navigation"
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-auto max-w-sm sm:max-w-md select-none pointer-events-none mb-1"
    >
      {/* Outer Floating Pill Capsule Container */}
      <div className="pointer-events-auto flex items-center justify-between w-full sm:w-auto gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-[#FFFDF9]/95 backdrop-blur-xl border border-[#EDE6D8] shadow-[0_12px_40px_rgba(30,20,10,0.12),0_4px_14px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.03]">
        {navItems.map((item) => {
          const isActive = activeNavTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveNavTab(item.id);
                if (item.id === 'profile') {
                  window.dispatchEvent(new CustomEvent('openProfileSettings'));
                } else if (item.id === 'rides') {
                  window.dispatchEvent(new CustomEvent('openRideHistory'));
                } else {
                  window.dispatchEvent(new CustomEvent('closeAllModals'));
                }
                triggerSound('click');
              }}
              className="relative flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-6 py-2.5 sm:py-3 rounded-full cursor-pointer transition-colors duration-200 select-none group focus:outline-hidden min-h-[48px] sm:min-h-[50px]"
              aria-label={item.label}
            >
              {/* Animated Floating Pill Background Indicator */}
              {isActive && (
                <>
                  <motion.div
                    layoutId="activeNavPillHalo"
                    className="absolute -inset-0.5 rounded-full bg-amber-200/50 blur-[3px]"
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 32,
                    }}
                  />
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 rounded-full bg-[#FFA726] shadow-[0_3px_14px_rgba(255,167,38,0.42)]"
                    transition={{
                      type: 'spring',
                      stiffness: 460,
                      damping: 34,
                      mass: 0.85,
                    }}
                  />
                </>
              )}

              {/* Icon */}
              <item.icon
                className={`relative z-10 w-5 h-5 sm:w-5 sm:h-5 transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'stroke-[2.25] text-[#141414]'
                    : 'stroke-[1.85] text-[#4A4A4A] group-hover:text-[#18181B]'
                }`}
              />

              {/* Label */}
              <span
                className={`relative z-10 text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap transition-colors duration-200 ${
                  isActive
                    ? 'font-extrabold text-[#141414]'
                    : 'font-medium text-[#4A4A4A] group-hover:text-[#18181B]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

