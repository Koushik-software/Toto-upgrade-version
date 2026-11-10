import React, { useState, useEffect } from 'react';
import { RideProvider, useRide } from './context/RideContext';
import { Header } from './components/common/Header';
import { BottomNavigation } from './components/common/BottomNavigation';
import { SplashScreen } from './components/common/SplashScreen';
import { BackExitToast } from './components/common/BackExitToast';
import { useBackHandler } from './hooks/useBackHandler';
import { UserLogin } from './components/user/UserLogin';
import { UserDashboard } from './components/user/UserDashboard';
import { DriverLogin } from './components/driver/DriverLogin';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainAppContent: React.FC = () => {
  const { 
    activeRole, 
    user, 
    driver, 
    userGpsPoint, 
    setActiveRole, 
    logoutUser, 
    logoutDriver, 
    isAdminAuthenticated,
    triggerSound,
    activeNavTab,
  } = useRide();
  const [showSplash, setShowSplash] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const alreadyLoaded = sessionStorage.getItem('toto_splash_shown') === 'true';
        if (alreadyLoaded) return false;
        const params = new URLSearchParams(window.location.search);
        if (params.get('role')) return false;
      }
    } catch {}
    return true;
  });

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem('toto_splash_shown', 'true');
    } catch {}
    setShowSplash(false);
  };

  // System back handler for admin role to return to user dashboard
  useBackHandler('role:admin', activeRole === 'admin', () => setActiveRole('user'), 15);

  if (showSplash) {
    return (
      <SplashScreen
        onComplete={handleSplashComplete}
        isAuthenticated={!!user}
        hasLocationPermission={!!userGpsPoint}
      />
    );
  }

  const isUserHomeMap = activeRole === 'user' && !!user && activeNavTab === 'home';

  return (
    <div className={`min-h-screen min-h-[100dvh] w-full bg-[#FAF8F5] text-[#111111] flex flex-col font-sans selection:bg-[#FDE8DC] selection:text-[#C8622A] overflow-x-hidden ${
      isUserHomeMap
        ? 'pt-0'
        : 'pt-[calc(56px+env(safe-area-inset-top,0px))] sm:pt-[calc(64px+env(safe-area-inset-top,0px))]'
    }`}>
      {/* Top Application Header */}
      <Header />

      {/* Main Screen Content Body */}
      <main className={`flex-1 w-full pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:pb-28 flex flex-col justify-start ${
        isUserHomeMap
          ? 'max-w-none p-0'
          : 'max-w-6xl mx-auto p-0 sm:p-3 md:p-6'
      }`}>
        {/* Role 1: User / Passenger App View ("Where to next?") */}
        {activeRole === 'user' && (
          <ErrorBoundary fallbackTitle="Passenger Experience View">
            <div className="w-full flex-1 flex flex-col animate-in fade-in duration-300">
              {user ? (
                <div className="w-full flex-1 flex flex-col p-0">
                  <UserDashboard />
                </div>
              ) : (
                <div className="w-full flex-1 flex flex-col items-center justify-center px-2 py-4 sm:py-6 bg-white">
                  <UserLogin />
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* Role 2: Toto Captain / Driver Partner View ("Your workday") */}
        {activeRole === 'driver' && (
          <ErrorBoundary fallbackTitle="Toto Captain Console View">
            <div className="w-full flex-1 flex flex-col animate-in fade-in duration-300">
              {driver ? (
                <div className="w-full flex-1 flex flex-col p-0">
                  <DriverDashboard />
                </div>
              ) : (
                <div className="w-full flex-1 flex flex-col items-center justify-center px-2 py-4 sm:py-6">
                  <DriverLogin
                    onBack={() => {
                      logoutDriver();
                      setActiveRole('user');
                    }}
                    onLoginSuccess={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* Role 3: Admin Console & Driver Approval System */}
        {activeRole === 'admin' && (
          <ErrorBoundary fallbackTitle="Toto Central Admin Console View">
            <div className="w-full animate-in fade-in duration-300">
              {isAdminAuthenticated ? (
                <AdminDashboard />
              ) : (
                <div className="py-6 flex flex-col items-center">
                  <AdminLogin 
                    onLoginSuccess={() => setActiveRole('admin')}
                    onBack={() => setActiveRole('user')}
                  />
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>

      {/* Bottom Sub-footer - automatically hidden when user is logged in on dashboard */}
      {!(activeRole === 'user' && user) && !(activeRole === 'driver' && driver) && (
        <footer className="border-t border-[#EDE8E0] bg-white text-gray-500 px-6 py-4 text-xs select-none mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-gray-700">Toto Drive Live Network</span>
              <span>•</span>
              <span>Zero Emission Electric Fleet</span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-gray-600 text-center sm:text-right">
              <span>
                Owned by <strong className="text-gray-900 font-semibold">Subrata Naskar</strong>
              </span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span>
                Co-Founder & Design, Built by <strong className="text-gray-900 font-semibold">Koushik Haldar</strong>
              </span>
              {!(activeRole === 'user' && !user) && (
                <>
                  <span className="hidden sm:inline text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveRole('admin')}
                    className="text-[10px] text-gray-400 hover:text-gray-700 underline transition-colors cursor-pointer"
                  >
                    Admin Console
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      )}
      <BottomNavigation />
      <BackExitToast />
    </div>
  );
};

export default function App() {
  return (
    <RideProvider>
      <MainAppContent />
    </RideProvider>
  );
}
