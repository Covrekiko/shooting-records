/**
 * Mobile Keyboard Handler
 * Adjusts modal position when keyboard appears on mobile devices
 */
export const useMobileKeyboardHandler = (modalRef) => {
  if (typeof window === 'undefined') return;

  const handleKeyboardShow = () => {
    if (modalRef?.current) {
      // Scroll modal into view when keyboard appears
      setTimeout(() => {
        modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleKeyboardHide = () => {
    if (modalRef?.current) {
      // Reset scroll position when keyboard hides
      const scrollTop = window.scrollY;
      window.scrollTo(0, scrollTop);
    }
  };

  // iOS keyboard events
  const setupIOSKeyboardListeners = () => {
    window.addEventListener('focus', handleKeyboardShow, true);
    window.addEventListener('blur', handleKeyboardHide, true);

    return () => {
      window.removeEventListener('focus', handleKeyboardShow, true);
      window.removeEventListener('blur', handleKeyboardHide, true);
    };
  };

  // Android keyboard events
  const setupAndroidKeyboardListeners = () => {
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      if (currentHeight < initialHeight * 0.75) {
        handleKeyboardShow();
      } else {
        handleKeyboardHide();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isIOS ? setupIOSKeyboardListeners() : setupAndroidKeyboardListeners();
};