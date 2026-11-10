import React from 'react';
import { DriverDashboard } from '../../../src/components/driver/DriverDashboard';
import { DriverLogin } from '../../../src/components/driver/DriverLogin';
import { Header } from '../../../src/components/common/Header';
import { BottomNavigation } from '../../../src/components/common/BottomNavigation';
import { BackExitToast } from '../../../src/components/common/BackExitToast';
import { ErrorBoundary } from '../../../src/components/common/ErrorBoundary';
import { RideProvider, useRide } from '../../../src/context/RideContext';

const CaptainContent: React.FC = () => {
  const { driver, logoutDriver } = useRide();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#0F172A] text-white flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full flex flex-col justify-start">
        <ErrorBoundary fallbackTitle="Toto Captain Console View">
          {driver ? (
            <div className="w-full flex-1 flex flex-col p-0">
              <DriverDashboard />
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center px-2 py-4 sm:py-6">
              <DriverLogin
                onBack={() => {
                  logoutDriver();
                }}
                onLoginSuccess={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </ErrorBoundary>
      </main>
      <BottomNavigation />
      <BackExitToast />
    </div>
  );
};

export default function CaptainApp() {
  return (
    <RideProvider>
      <CaptainContent />
    </RideProvider>
  );
}
