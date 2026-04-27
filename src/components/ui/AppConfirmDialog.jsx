import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Z_INDEX } from '@/lib/designSystem';

/**
 * Standard confirmation dialog for destructive actions
 * Features:
 * - Warning icon
 * - Title and message
 * - Cancel and destructive action buttons
 * - Locks background interaction
 */
export default function AppConfirmDialog({
  open = false,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDangerous = true,
  icon: Icon = AlertCircle,
}) {
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [open, onClose]);

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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.modal }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              {/* Content */}
              <div className="px-6 py-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className={isDangerous ? 'bg-destructive/10 p-3 rounded-full' : 'bg-primary/10 p-3 rounded-full'}>
                    <Icon className={isDangerous ? 'w-6 h-6 text-destructive' : 'w-6 h-6 text-primary'} />
                  </div>
                </div>

                <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
                <p className="text-sm text-muted-foreground mb-6">{message}</p>

                {/* Buttons */}
                <div className="flex gap-3 flex-col-reverse sm:flex-row">
                  <button
                    onClick={onClose}
                    className="flex-1 h-11 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg font-semibold transition-colors active:scale-95"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                      onConfirm?.();
                      onClose?.();
                    }}
                    className={`flex-1 h-11 rounded-lg font-semibold transition-colors active:scale-95 ${
                      isDangerous
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}