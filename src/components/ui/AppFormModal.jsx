import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Z_INDEX } from '@/lib/designSystem';

/**
 * Form modal with fixed header/footer and scrollable content
 * Ideal for forms with many fields
 * Features:
 * - Fixed header
 * - Scrollable form content
 * - Fixed action buttons in footer
 * - Safe area aware
 * - Buttons always visible (never hidden behind keyboard)
 */
export default function AppFormModal({
  open = false,
  onClose,
  onSubmit,
  title,
  subtitle,
  children,
  primaryAction = 'Save',
  secondaryAction = 'Cancel',
  isLoading = false,
  isDangerous = false,
  showClose = true,
  closeOnEscape = true,
  width = '560px',
}) {
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: Z_INDEX.overlay }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.modal }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
              }}
              className="bg-card border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col w-full"
              style={{ width: width, maxWidth: 'calc(100vw - 2rem)' }}
              data-scrollable
            >
              {/* Fixed Header */}
              <div className="px-6 py-4 border-b border-border flex items-start justify-between flex-shrink-0">
                <div className="flex-1">
                  {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
                  {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 hover:bg-secondary rounded-lg transition-colors ml-2 flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-6 py-4" data-scrollable>
                {children}
              </div>

              {/* Fixed Footer */}
              <div className="border-t border-border px-6 py-4 bg-secondary/20 flex gap-3 flex-col-reverse sm:flex-row safe-area-bottom flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 h-11 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 rounded-lg font-semibold transition-colors active:scale-95"
                >
                  {secondaryAction}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 h-11 rounded-lg font-semibold transition-colors active:scale-95 disabled:opacity-50 ${
                    isDangerous
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isLoading ? 'Loading...' : primaryAction}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}