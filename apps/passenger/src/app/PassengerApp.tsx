import React from 'react';
import { UserDashboard } from '../../../src/components/user/UserDashboard';
import { UserLogin } from '../../../src/components/user/UserLogin';
import { Header } from '../../../src/components/common/Header';
import { BottomNavigation } from '../../../src/components/common/BottomNavigation';
import { BackExitToast } from '../../../src/components/common/BackExitToast';
import { ErrorBoundary } from '../../../src/components/common/ErrorBoundary';
import { RideProvider, useRide } from '../../../src/context/RideContext';

const PassengerContent: React.FC = () => {
  const { user } = useRide();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#FAF8F5] text-[#111111] flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full flex flex-col justify-start">
        <ErrorBoundary fallbackTitle="Passenger Experience View">
          {user ? (
            <div className="w-full flex-1 flex flex-col p-0">
              <UserDashboard />
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center px-2 py-4 sm:py-6 bg-white">
              <UserLogin />
            </div>
          )}
        </ErrorBoundary>
      </main>
      <BottomNavigation />
      <BackExitToast />
    </div>
  );
};

export default function PassengerApp() {
  return (
    <RideProvider>
      <PassengerContent />
    </RideProvider>
  );
}
