import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { AppLogo } from './AppLogo';
import { Zap } from 'lucide-react';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { 
    activeRole, 
    setActiveRole, 
    user, 
    driver, 
    logoutDriver, 
    triggerSound,
    activeNavTab,
    setActiveNavTab
  } = useRide();

  // Track page scrolling system for fixed header feedback & progress
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 12);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / totalHeight) * 100));
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Automatically logout driver or captains whenever returning to the users login page
  React.useEffect(() => {
    if (activeRole === 'user' && !user && driver) {
      logoutDriver('user');
    }
  }, [activeRole, user, driver, logoutDriver]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header 
      id="app-fixed-header"
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-200 select-none pt-[env(safe-area-inset-top,0px)] ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-[#E2DDD3] shadow-[0_4px_20px_rgba(0,0,0,0.06)] py-1.5 sm:py-2' 
          : 'bg-white/90 backdrop-blur-md border-b border-[#EDE8E0]/80 py-2 sm:py-2.5'
      }`}
    >
      {/* Dynamic Scroll Progress Bar along header bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-100/40 pointer-events-none overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#C8622A] via-[#E07A00] to-[#FFB703] transition-all duration-75 ease-out rounded-r-full"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Internal header content container */}
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-2.5">
        {/* Left: Brand Logo & Title with scroll-to-top feature */}
        <div 
          onClick={() => { 
            setActiveNavTab('home'); 
            triggerSound('beep');
            handleScrollToTop();
          }}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
          title="Toto Drive Home (Click to navigate home & scroll to top)"
        >
          <AppLogo 
            size="sm" 
            iconStyle={{ width: '45px', height: '45px' }}
            iconClassName="!w-[45px] !h-[45px]"
          />
          <div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span 
                style={{ fontSize: '16px' }}
                className="font-black text-[16px] tracking-tight text-[#111111]"
              >
                Toto<span className="text-[#E07A00]">Drive</span>
              </span>
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full hidden xs:inline-block ${
                activeRole === 'driver' 
                  ? 'text-[#C8622A] bg-[#FFF2E8] border border-[#FF6B2C]/30' 
                  : 'text-[#8C5200] bg-[#FFF3C4]'
              }`}>
                {activeRole === 'driver' ? 'Captain' : 'Kolkata'}
              </span>
            </div>
          </div>
        </div>

        {/* Scroll workflow helper: Scroll to top shortcut pill when scrolled */}
        {isScrolled && (
          <button
            type="button"
            onClick={() => {
              triggerSound('click');
              handleScrollToTop();
            }}
            className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1 rounded-full transition-all cursor-pointer border border-neutral-200/70 shrink-0 active:scale-95"
            title="Scroll page to top"
          >
            <span>Top</span>
            <span className="text-[10px]">↑</span>
          </button>
        )}

        {/* Middle & Right: Actions & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Captain button on right side top corner - visible only when passenger is not logged in */}
          {activeRole === 'user' && !user && (
            <button
              id="header-captain-btn"
              type="button"
              onClick={() => {
                triggerSound('beep');
                setActiveRole('driver');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-1.5 bg-[#181818] hover:bg-black active:scale-[0.96] text-white text-xs font-bold shadow-xs border border-neutral-800 hover:border-neutral-700 select-none shrink-0"
              title="Become a Captain / Driver Portal"
            >
              <Zap className="w-3.5 h-3.5 text-[#FFB703] fill-[#FFB703]" />
              <div className="flex flex-col text-left leading-tight">
                <span className="font-extrabold text-xs text-white tracking-tight">
                  Captain
                </span>
                <span className="text-[9px] text-neutral-400 font-medium hidden sm:inline-block">
                  Driver Portal
                </span>
              </div>
            </button>
          )}

          {/* User Profile Info when passenger is logged in */}
          {activeRole === 'user' && user && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="header-passenger-profile-pill"
                onClick={() => {
                  setActiveNavTab('profile');
                  triggerSound('click');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 sm:py-1.5 rounded-xl border transition-all text-xs shadow-2xs cursor-pointer ${
                  activeNavTab === 'profile'
                    ? 'bg-[#FFF2E8] border-[#FF6B2C]/40 text-[#C8622A]'
                    : 'bg-[#FAF8F5] hover:bg-[#F2ECE1] border-neutral-200 text-neutral-800'
                }`}
                title="View Profile & Settings"
              >
                <div className="w-6 h-6 rounded-full bg-[#E07A00] text-white flex items-center justify-center font-bold text-[11px] uppercase shadow-2xs shrink-0">
                  {user.name ? user.name.charAt(0) : 'P'}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-[#111111] text-xs max-w-[110px] truncate">
                    {user.name || 'Passenger'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium hidden sm:inline-block">
                    {user.phone ? `+91 ${user.phone.slice(-5)}` : 'Rider'}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Driver Profile Info when driver is logged in and viewing dashboard */}
          {activeRole === 'driver' && driver && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="header-driver-profile-pill"
                onClick={() => {
                  setActiveNavTab('profile');
                  triggerSound('beep');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs shadow-2xs transition-all cursor-pointer ${
                  activeNavTab === 'profile'
                    ? 'bg-[#181818] text-white border-neutral-800'
                    : 'bg-[#FAF8F5] hover:bg-[#F2ECE1] border-neutral-200 text-[#111111]'
                }`}
                title="View Captain Profile & Vehicle Setup"
              >
                {driver.driverPhoto || driver.avatarUrl ? (
                  <img
                    src={driver.driverPhoto || driver.avatarUrl}
                    alt={driver.name}
                    className="w-6 h-6 rounded-full object-cover shadow-2xs shrink-0"
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] uppercase shadow-2xs shrink-0 ${
                    activeNavTab === 'profile' ? 'bg-white text-neutral-900' : 'bg-[#181818] text-white'
                  }`}>
                    {driver.name ? driver.name.charAt(0) : 'D'}
                  </div>
                )}
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-xs max-w-[110px] truncate">
                    {driver.name ? driver.name.split(' ')[0] : 'Captain'}
                  </span>
                  <span className={`text-[10px] font-semibold hidden sm:inline-block ${
                    activeNavTab === 'profile' ? 'text-emerald-300' : 'text-emerald-600'
                  }`}>
                    {driver.isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
