import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level storage so deferredPrompt is preserved across component re-renders and page navigation
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

export type PWARole = 'user' | 'driver' | 'admin';

interface PWAConfig {
  role: PWARole;
  name: string;
  shortName: string;
  manifestUrl: string;
  themeColor: string;
}

const ROLE_PWA_CONFIGS: Record<PWARole, PWAConfig> = {
  user: {
    role: 'user',
    name: 'Toto Drive - Customer App',
    shortName: 'Toto Ride',
    manifestUrl: '/manifest-customer.webmanifest',
    themeColor: '#F5C518'
  },
  driver: {
    role: 'driver',
    name: 'Toto Captain - Driver Partner',
    shortName: 'Toto Captain',
    manifestUrl: '/manifest-driver.webmanifest',
    themeColor: '#10B981'
  },
  admin: {
    role: 'admin',
    name: 'Toto Admin - Control Center',
    shortName: 'Toto Admin',
    manifestUrl: '/manifest-admin.webmanifest',
    themeColor: '#C8622A'
  }
};

/**
 * Dynamically switches the active Web App Manifest and Theme Color in the document head
 */
export function updateActiveManifestForRole(roleInput: PWARole | string) {
  if (typeof document === 'undefined') return;

  const role: PWARole = roleInput === 'driver' ? 'driver' : roleInput === 'admin' ? 'admin' : 'user';
  const config = ROLE_PWA_CONFIGS[role] || ROLE_PWA_CONFIGS.user;

  // 1. Update manifest link tag
  let manifestLink = document.getElementById('app-manifest') as HTMLLinkElement | null;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.id = 'app-manifest';
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  if (manifestLink.getAttribute('href') !== config.manifestUrl) {
    manifestLink.setAttribute('href', config.manifestUrl);
  }

  // 2. Update theme color meta tag
  let themeMeta = document.getElementById('meta-theme-color') as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.querySelector('meta[name="theme-color"]');
  }
  if (themeMeta) {
    themeMeta.setAttribute('content', config.themeColor);
  }
}

// Global listener setup (executed once)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
  });
}

/**
 * Synchronously checks if the PWA is currently running in standalone/installed display mode
 * Does NOT rely on a permanent localStorage flag so users who uninstall can reinstall when visiting via browser.
 */
export function checkIsPWAInstalledSync(_role: string = 'user'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://') ||
      new URLSearchParams(window.location.search).get('pwa') === 'installed' ||
      new URLSearchParams(window.location.search).get('installed') === 'true';
    return Boolean(isStandalone);
  } catch {
    return false;
  }
}

export function usePWAInstall(currentRoleInput: PWARole | string = 'user') {
  const role: PWARole = currentRoleInput === 'driver' ? 'driver' : currentRoleInput === 'admin' ? 'admin' : 'user';
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsPWAInstalledSync(role));
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode
    const checkStandalone = () => {
      setIsInstalled(checkIsPWAInstalledSync(role));
    };

    checkStandalone();

    // Listen to display-mode changes
    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    try {
      mql.addEventListener('change', handleMqlChange);
    } catch {
      try {
        mql.addListener(handleMqlChange);
      } catch {}
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handlePromptUpdate = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      setIsInstalled(checkIsPWAInstalledSync(role));
    };

    promptListeners.add(handlePromptUpdate);
    setDeferredPrompt(globalDeferredPrompt);

    // Sync active manifest for the provided role
    updateActiveManifestForRole(role);

    return () => {
      promptListeners.delete(handlePromptUpdate);
      try {
        mql.removeEventListener('change', handleMqlChange);
      } catch {
        try {
          mql.removeListener(handleMqlChange);
        } catch {}
      }
    };
  }, [role]);

  const install = useCallback(async (): Promise<boolean> => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (!promptToUse) return false;

    try {
      await promptToUse.prompt();
      const choice = await promptToUse.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        promptListeners.forEach((fn) => fn(null));
        return true;
      }
    } catch (err) {
      console.warn('Error during PWA installation:', err);
    }
    return false;
  }, [deferredPrompt, role]);

  const config = ROLE_PWA_CONFIGS[role] || ROLE_PWA_CONFIGS.user;

  return {
    isInstallable: Boolean(deferredPrompt || globalDeferredPrompt),
    isInstalled,
    isIOS,
    install,
    config
  };
}
