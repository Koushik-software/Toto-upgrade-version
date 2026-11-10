import React from 'react';
import { AdminDashboard } from '../../../src/components/admin/AdminDashboard';
import { AdminLogin } from '../../../src/components/admin/AdminLogin';
import { Header } from '../../../src/components/common/Header';
import { ErrorBoundary } from '../../../src/components/common/ErrorBoundary';
import { RideProvider, useRide } from '../../../src/context/RideContext';

const AdminContent: React.FC = () => {
  const { isAdminAuthenticated, setActiveRole } = useRide();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#0F172A] text-white flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col justify-start">
        <ErrorBoundary fallbackTitle="Toto Central Admin Console View">
          {isAdminAuthenticated ? (
            <AdminDashboard />
          ) : (
            <div className="py-12 flex flex-col items-center">
              <AdminLogin
                onLoginSuccess={() => setActiveRole('admin')}
                onBack={() => setActiveRole('user')}
              />
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default function AdminApp() {
  return (
    <RideProvider>
      <AdminContent />
    </RideProvider>
  );
}
