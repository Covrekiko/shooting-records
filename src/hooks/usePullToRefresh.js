import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom pull-to-refresh hook.
 * Returns { pulling, progress (0-1), refreshing }
 * Call onRefresh when pull exceeds threshold.
 */
export function usePullToRefresh(onRefresh, threshold = 80) {
  const [state, setState] = useState({ pulling: false, progress: 0, refreshing: false });
  const startY = useRef(null);
  const currentY = useRef(null);
  const callbackRef = useRef(onRefresh);

  // Update callback ref whenever onRefresh changes
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (startY.current === null) return;
      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        e.preventDefault();
        setState(s => ({ ...s, pulling: true, progress: Math.min(1, delta / threshold) }));
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      const delta = (currentY.current || 0) - startY.current;
      if (delta >= threshold) {
        setState({ pulling: false, progress: 0, refreshing: true });
        Promise.resolve(callbackRef.current()).finally(() => {
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
  }, [threshold]);

  return state;
}