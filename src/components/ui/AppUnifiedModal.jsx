import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Z_INDEX } from '@/lib/uiSystem';

/**
 * Unified modal component for all modal types
 * Features:
 * - Locks body scroll
 * - Prevents background interaction
 * - Keyboard escape support
 * - Click outside to close
 * - Theme-aware styling
 */
export default function AppUnifiedModal({
  open = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '420px',
  showClose = true,
  closeOnOutside = true,
  closeOnEscape = true,
}) {
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape') onClose?.();
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
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: Z_INDEX.overlay }}
            onClick={() => closeOnOutside && onClose?.()}
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
              className="bg-card border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col w-full"
              style={{ width: width, maxWidth: 'calc(100vw - 2rem)' }}
            >
              {/* Header */}
              {title && (
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-foreground">{title}</h2>
                    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                  </div>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1 hover:bg-secondary rounded-lg transition-colors ml-2 flex-shrink-0"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Content (scrollable) */}
              <div className="overflow-y-auto flex-1">
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