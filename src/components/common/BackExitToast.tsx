import React, { useEffect, useState } from 'react';
import { mobileNav } from '../../services/mobileNavigation';
import { LogOut } from 'lucide-react';

export const BackExitToast: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    mobileNav.setExitToastCallback((shouldShow) => {
      setShow(shouldShow);
    });

    return () => {
      mobileNav.setExitToastCallback(null);
    };
  }, []);

  if (!show) return null;

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-60 animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
    >
      <div className="flex items-center gap-2 bg-neutral-900/95 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl border border-neutral-700/80">
        <LogOut className="w-3.5 h-3.5 text-amber-400" />
        <span>Press back again to exit Toto Drive</span>
      </div>
    </div>
  );
};
