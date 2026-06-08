import { useEffect } from 'react';

/**
 * Prevents body scroll when a modal/sheet is open
 * Handles iOS Safari overscroll behavior
 */
export function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      return;
    }

    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Prevent iOS Safari bounce scroll
    const preventScroll = (e) => {
      if (e.target.closest('[data-scrollable]')) {
        return; // Allow scroll inside modal
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isLocked]);
}

/**
 * Hook to manage inert attribute on background elements
 * Makes background elements non-interactive when modal is open
 */
export function useBackgroundInert(isInert = true, selector = 'main, nav') {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach((el) => {
      if (isInert) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    });

    return () => {
      elements.forEach((el) => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      });
    };
  }, [isInert, selector]);
}