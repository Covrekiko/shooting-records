import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Z_INDEX } from '@/lib/designSystem';

/**
 * Standard centered modal for confirmations, alerts, and small forms
 * Features:
 * - Locks body scroll
 * - Prevents background interaction
 * - Centered on screen
 * - Click outside to close (optional)
 * - Keyboard escape to close (optional)
 */
export default function AppModal({
  open = false,
  onClose,
  title,
  children,
  footer,
  width = '420px',
  showClose = true,
  closeOnOutsideClick = true,
  closeOnEscape = true,
}) {
  useEffect(() => {
    if (!open) return;

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Handle escape key
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.overlay, touchAction: 'none' }}
            onClick={() => closeOnOutsideClick && onClose?.()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.modal }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-card border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
              style={{ width: width, maxWidth: 'calc(100vw - 2rem)' }}
            >
              {/* Header */}
              {title && (
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{title}</h2>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1 hover:bg-secondary rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Content (scrollable) */}
              <div className="overflow-y-auto flex-1 px-6 py-4 overscroll-contain" style={{ touchAction: 'pan-y' }}>
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-border px-6 py-4 bg-secondary/20 flex gap-3 safe-area-bottom">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}