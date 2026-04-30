import { useState, useEffect, useRef } from 'react';

/**
 * Custom pull-to-refresh hook.
 * Returns { pulling, progress (0-1), refreshing }
 * Call onRefresh when pull exceeds threshold.
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const config = typeof options === 'number' ? { threshold: options } : options;
  const threshold = config.threshold || 80;
  const disabled = config.disabled || false;
  const [state, setState] = useState({ pulling: false, progress: 0, refreshing: false });
  const startY = useRef(null);
  const currentY = useRef(null);
  const callbackRef = useRef(onRefresh);
  const refreshingRef = useRef(false);

  // Update callback ref whenever onRefresh changes
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const isMobileTouch = () => window.matchMedia?.('(pointer: coarse)').matches;
    const shouldIgnoreTarget = (target) => Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"], [data-modal-scroll], .leaflet-container'));

    const onTouchStart = (e) => {
      if (disabled || refreshingRef.current || !isMobileTouch() || window.scrollY > 0 || shouldIgnoreTarget(e.target)) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (disabled || refreshingRef.current || startY.current === null) return;
      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        e.preventDefault();
        setState(s => ({ ...s, pulling: true, progress: Math.min(1, delta / threshold) }));
      }
    };

    const onTouchEnd = () => {
      if (disabled || refreshingRef.current || startY.current === null) {
        startY.current = null;
        currentY.current = null;
        setState({ pulling: false, progress: 0, refreshing: false });
        return;
      }
      const delta = (currentY.current || 0) - startY.current;
      if (delta >= threshold) {
        refreshingRef.current = true;
        setState({ pulling: false, progress: 0, refreshing: true });
        Promise.resolve(callbackRef.current()).finally(() => {
          refreshingRef.current = false;
          setState({ pulling: false, progress: 0, refreshing: false });
        });
      } else {
        setState({ pulling: false, progress: 0, refreshing: false });
      }
      startY.current = null;
      currentY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [threshold, disabled]);

  return state;
}