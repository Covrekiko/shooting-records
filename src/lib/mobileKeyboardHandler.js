/**
 * Mobile Keyboard Handler
 * Adjusts modal when keyboard appears on mobile devices
 * Uses 100dvh (dynamic viewport height) which adjusts for keyboard
 */
import { useEffect } from 'react';

export const useMobileKeyboardHandler = (inputRef) => {
  useEffect(() => {
    if (!inputRef?.current) return;
    
    // Focus handler: scroll input into view when keyboard appears
    const handleFocus = () => {
      setTimeout(() => {
        const input = inputRef.current;
        if (input) {
          const rect = input.getBoundingClientRect();
          // Check if input is below keyboard area
          if (rect.bottom > window.innerHeight * 0.75) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    };

    // Blur handler: reset
    const handleBlur = () => {
      // Keyboard will auto-hide on blur
    };

    inputRef.current.addEventListener('focus', handleFocus);
    inputRef.current.addEventListener('blur', handleBlur);

    return () => {
      inputRef.current?.removeEventListener('focus', handleFocus);
      inputRef.current?.removeEventListener('blur', handleBlur);
    };
  }, [inputRef]);
};

/**
 * Global keyboard handler setup
 * Call once on app init to adjust modals for keyboard
 */
export const setupMobileKeyboardAdjustment = () => {
  if (typeof window === 'undefined') return;

  // iOS: Use visualViewport API if available
  if (typeof window.visualViewport !== 'undefined') {
    const handleResize = () => {
      const vvHeight = window.visualViewport?.height || window.innerHeight;
      const vh = vvHeight / 100;
      // Set CSS variable for dvh fallback
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }

  // Android: Monitor window resize for keyboard
  const initialHeight = window.innerHeight;

  const handleResize = () => {
    const currentHeight = window.innerHeight;
    // If height reduced by more than 25%, keyboard likely showing
    if (currentHeight < initialHeight * 0.75) {
      document.body.style.overscrollBehavior = 'contain';
    } else {
      document.body.style.overscrollBehavior = 'auto';
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
};