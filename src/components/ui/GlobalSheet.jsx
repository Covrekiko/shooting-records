/**
 * GlobalSheet — THE one canonical bottom-sheet for the entire app.
 *
 * Replaces: AppBottomSheet, AppUnifiedSheet, ModalShell (bottom-sheet variant)
 *
 * Rules:
 *  - Slides up from bottom
 *  - Body scroll locked
 *  - Backdrop touch: none
 *  - Content scrollable (pan-y, overscroll-contain)
 *  - Safe area bottom
 *  - Drag to dismiss (optional)
 *  - Portal to document.body
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';
import { ModalHeader, ModalBody, ModalFooter, ModalSaveButton, ModalCancelButton } from './GlobalModal';

const Z_OVERLAY = 50000;
const Z_MODAL   = 50001;

let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
  }
  lockCount++;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }
}

function useSheetScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    const preventBg = (e) => {
      if (e.target.closest('[data-modal-scroll]')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventBg, { passive: false });
    return () => {
      unlockBodyScroll();
      document.removeEventListener('touchmove', preventBg);
    };
  }, [isOpen]);
}

export default function GlobalSheet({
  open = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  onSubmit,
  primaryAction = 'Save',
  secondaryAction = 'Cancel',
  isLoading = false,
  isDangerous = false,
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  isDraggable = true,
  maxHeight = '90dvh',
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  useSheetScrollLock(open);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handle = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, closeOnEscape, onClose]);

  const handleTouchStart = (e) => {
    if (!isDraggable) return;
    setStartY(e.touches[0].clientY);
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (dragY > 100) onClose?.();
    setDragY(0);
    setDragging(false);
  };

  const Wrapper = onSubmit ? 'form' : 'div';
  const wrapperProps = onSubmit
    ? { onSubmit: (e) => { e.preventDefault(); onSubmit(); } }
    : {};

  const defaultFooter = (
    <>
      <ModalCancelButton onClick={onClose}>{secondaryAction}</ModalCancelButton>
      <ModalSaveButton
        type={onSubmit ? 'submit' : 'button'}
        disabled={isLoading}
        danger={isDangerous}
      >
        {isLoading ? 'Saving…' : primaryAction}
      </ModalSaveButton>
    </>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: Z_OVERLAY, touchAction: 'none' }}
            onClick={() => closeOnBackdrop && onClose?.()}
          />

          {/* Sheet panel */}
          <motion.div
            key="sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            transition={dragging ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 flex flex-col"
            style={{
              zIndex: Z_MODAL,
              maxHeight: `min(${maxHeight}, 95dvh)`,
              paddingBottom: 'env(safe-area-inset-bottom, 0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Wrapper
              {...wrapperProps}
              className="bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col overflow-hidden w-full h-full"
              style={{ maxWidth: '100vw', overflowX: 'hidden' }}
            >
              {/* Drag handle */}
              {isDraggable && (
                <div
                  className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="w-10 h-1 bg-border rounded-full" />
                </div>
              )}

              {/* Header */}
              {(title || showClose) && (
                <ModalHeader
                  title={title}
                  subtitle={subtitle}
                  onClose={onClose}
                  showClose={showClose}
                />
              )}

              {/* Body */}
              <ModalBody>{children}</ModalBody>

              {/* Footer */}
              <ModalFooter>{footer !== undefined ? footer : defaultFooter}</ModalFooter>
            </Wrapper>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}