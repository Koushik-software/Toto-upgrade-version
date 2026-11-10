import { useEffect, useRef } from 'react';
import { mobileNav } from '../services/mobileNavigation';

/**
 * useBackHandler
 * 
 * Automatically registers an Android / iOS system back button action when a modal,
 * sub-page, or sub-view becomes active.
 * 
 * @param id Unique identifier for the navigation state (e.g. 'tab:rides', 'modal:wallet')
 * @param isActive Boolean indicating whether this screen/modal is currently open
 * @param onBack Callback executed when the system back button or back gesture is performed
 * @param priority Number indicating precedence (higher numbers close first, default 10)
 */
export function useBackHandler(
  id: string,
  isActive: boolean,
  onBack: () => void,
  priority = 10
) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isActive) return;

    mobileNav.push(id, () => onBackRef.current(), priority);

    return () => {
      mobileNav.pop(id);
    };
  }, [id, isActive, priority]);
}
