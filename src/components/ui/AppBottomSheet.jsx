import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';
import { Z_INDEX, SIZING } from '@/lib/designSystem';

/**
 * Standard bottom sheet for mobile actions, forms, and selections
 * Features:
 * - Locks body scroll
 * - Swipe to dismiss on mobile
 * - Drag handle for visual feedback
 * - Safe area bottom padding
 * - Scrollable content with fixed footer
 */
export default function AppBottomSheet({
  open = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = '85vh',
  showClose = true,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  isDraggable = true,
}) {
  const [dragStart, setDragStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragStart = (e) => {
    if (!isDraggable) return;
    setDragStart(e.clientY || e.touches?.[0]?.clientY);
    setIsDragging(true);
  };

  const handleDragEnd = (e) => {
    if (!isDraggable) return;
    const dragEnd = e.clientY || e.changedTouches?.[0]?.clientY;
    const distance = dragEnd - dragStart;

    if (distance > 100) {
      onClose?.();
    }
    setIsDragging(false);
  };

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
            onClick={() => closeOnOutsideClick && onClose?.()}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            drag={isDraggable ? 'y' : false}
            dragElastic={0.2}
            dragConstraints={{ top: 0 }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl flex flex-col"
            style={{ zIndex: Z_INDEX.modal, maxHeight: maxHeight }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            {isDraggable && (
              <div className="flex justify-center pt-3 pb-1">
                <GripHorizontal className="w-5 h-5 text-muted-foreground" />
              </div>
            )}

            {/* Header */}
            {(title || showClose) && (
              <div className="px-6 py-3 border-b border-border flex items-start justify-between">
                <div className="flex-1">
                  {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
                  {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-secondary rounded-lg transition-colors ml-2 flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content (scrollable) */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-border px-6 py-4 bg-secondary/20 flex gap-3 safe-area-bottom">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}