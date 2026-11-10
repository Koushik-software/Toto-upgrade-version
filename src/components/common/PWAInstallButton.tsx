import React from 'react';
import { PWARole } from '../../hooks/usePWAInstall';

export interface PWAInstallButtonProps {
  role?: PWARole;
  variant?: 'header' | 'banner' | 'card' | 'compact';
  className?: string;
  onInstalled?: () => void;
}

/**
 * PWA Install Button component
 * Disabled / removed per user request
 */
export const PWAInstallButton: React.FC<PWAInstallButtonProps> = () => {
  return null;
};
