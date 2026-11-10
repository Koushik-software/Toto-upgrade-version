/**
 * mobileNavigation.ts
 * 
 * Standard Android & iOS System Navigation Handler for Toto Drive PWA.
 * 
 * Manages:
 * 1. Physical & software device Back button (popstate handling)
 * 2. Hierarchical back stack for tabs ('rides', 'profile'), roles ('driver', 'admin'), and modals
 * 3. Synchronization between programmatic on-screen navigation and system back gestures
 * 4. Safe root exit prevention ("Press back again to exit") for standalone installed PWAs
 */

export interface NavEntry {
  id: string;
  onBack: () => void;
  priority?: number; // Higher priority entries (e.g. modals) close before lower ones (e.g. tabs)
}

class MobileNavigationManager {
  private stack: NavEntry[] = [];
  private isProcessingPopState = false;
  private isProgrammaticBack = false;
  private backExitTimer: NodeJS.Timeout | null = null;
  private lastBackPressTime = 0;
  private exitToastCallback: ((show: boolean) => void) | null = null;
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // Ensure baseline state exists in history so system back can be intercepted
    try {
      if (!window.history.state || (!window.history.state.toto_base && !window.history.state.toto_root)) {
        window.history.replaceState({ toto_root: true, depth: 0 }, '', window.location.href);
        window.history.pushState({ toto_base: true, depth: 1 }, '', window.location.href);
      }
    } catch {
      // Ignore history access errors in restricted environments
    }

    // Global listener for system back button / gesture / browser back
    window.addEventListener('popstate', this.handlePopState);
  }

  /**
   * Register a toast listener for "Press back again to exit" notifications
   */
  public setExitToastCallback(cb: ((show: boolean) => void) | null) {
    this.exitToastCallback = cb;
  }

  /**
   * Push an entry to the mobile navigation stack.
   * This creates a history state so the Android/iOS system back button triggers popstate.
   */
  public push(id: string, onBack: () => void, priority = 10) {
    if (typeof window === 'undefined') return;

    // Avoid duplicate registration for the same ID
    const existingIndex = this.stack.findIndex((item) => item.id === id);
    if (existingIndex !== -1) {
      this.stack[existingIndex].onBack = onBack;
      return;
    }

    this.stack.push({ id, onBack, priority });

    try {
      window.history.pushState(
        { toto_nav: id, depth: this.stack.length },
        '',
        window.location.href
      );
    } catch {
      // Silently continue if history.pushState is restricted
    }
  }

  /**
   * Remove an entry programmatically (e.g. user clicked an on-screen "X" or "Done" button)
   * Pops the matching history entry so the history stack stays in sync with UI.
   */
  public pop(id: string) {
    if (typeof window === 'undefined') return;

    const index = this.stack.findIndex((item) => item.id === id);
    if (index === -1) return;

    this.stack.splice(index, 1);

    // If we're not inside a popstate event, pop the browser history entry
    if (!this.isProcessingPopState) {
      this.isProgrammaticBack = true;
      try {
        window.history.back();
      } catch {
        // Ignore
      }
      setTimeout(() => {
        this.isProgrammaticBack = false;
      }, 100);
    }
  }

  /**
   * Clear all entries with a specific prefix or all entries
   */
  public clearAll() {
    this.stack = [];
  }

  /**
   * Get current stack depth
   */
  public getDepth(): number {
    return this.stack.length;
  }

  /**
   * Check if an entry with the given id is currently active
   */
  public has(id: string): boolean {
    return this.stack.some((item) => item.id === id);
  }

  /**
   * Main popstate handler triggered when user hits the system Back button or swipes back
   */
  private handlePopState = () => {
    // If this was triggered by our own programmatic window.history.back(), skip
    if (this.isProgrammaticBack) {
      this.isProgrammaticBack = false;
      return;
    }

    this.isProcessingPopState = true;

    try {
      if (this.stack.length > 0) {
        // Pop the top-most item (highest priority first, or most recently added)
        // Sort stack so highest priority items are popped first
        this.stack.sort((a, b) => (b.priority ?? 10) - (a.priority ?? 10));
        const topEntry = this.stack.pop();

        if (topEntry && typeof topEntry.onBack === 'function') {
          topEntry.onBack();
        }
      } else {
        // We are at the root level (e.g. Dashboard Home)
        const now = Date.now();
        // Implement double-press back to exit on all mobile devices / PWAs
        if (now - this.lastBackPressTime < 2000) {
          // User pressed back twice within 2 seconds -> Allow natural system exit
          if (this.exitToastCallback) this.exitToastCallback(false);
          try {
            window.history.back();
          } catch {}
          return;
        } else {
          // First press: Show toast and re-push base state so app doesn't exit immediately
          this.lastBackPressTime = now;
          if (this.exitToastCallback) {
            this.exitToastCallback(true);
            if (this.backExitTimer) clearTimeout(this.backExitTimer);
            this.backExitTimer = setTimeout(() => {
              if (this.exitToastCallback) this.exitToastCallback(false);
            }, 2000);
          }

          try {
            window.history.pushState({ toto_base: true, depth: 1 }, '', window.location.href);
          } catch {
            // Ignore
          }
        }
      }
    } finally {
      setTimeout(() => {
        this.isProcessingPopState = false;
      }, 150);
    }
  };
}

export const mobileNav = new MobileNavigationManager();
