/**
 * GlobalModal — THE one canonical centered modal for the entire app.
 * Also exports sub-components used by GlobalSheet.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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

function useModalScrollLock(isOpen) {
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

// ── Sub-components (also used by GlobalSheet) ──────────────────────────────

export function ModalHeader({ title, subtitle, onClose, showClose = true }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border flex-shrink-0 min-w-0">
      <div className="min-w-0 flex-1">
        {title && <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>}
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {showClose && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-3 p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children }) {
  return (
    <div
      data-modal-scroll
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-4"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        WebkitTouchCallout: 'none',
      }}
    >
      <div className="min-w-0 w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({ children }) {
  if (!children) return null;
  return (
    <div
      className="flex gap-3 px-5 border-t border-border flex-shrink-0 bg-card"
      style={{
        paddingTop: '12px',
        paddingBottom: 'calc(var(--safe-bottom) + 16px)',
      }}
    >
      {children}
    </div>
  );
}

export function ModalSaveButton({ children = 'Save', danger = false, disabled = false, type = 'submit', onClick }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 h-11 rounded-xl font-semibold text-sm transition-colors active:scale-95 disabled:opacity-50 ${
        danger
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
    >
      {children}
    </button>
  );
}

export function ModalCancelButton({ children = 'Cancel', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-95"
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function GlobalModal({
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
  maxWidth = 'max-w-md',
}) {
  useModalScrollLock(open);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handle = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, closeOnEscape, onClose]);

  const Wrapper = onSubmit ? 'form' : 'div';
  const wrapperProps = onSubmit
    ? { onSubmit: (e) => { e.preventDefault(); onSubmit(); } }
    : {};

  const defaultFooter = (
    <>
      <ModalCancelButton onClick={onClose}>{secondaryAction}</ModalCancelButton>
      <ModalSaveButton
        type={onSubmit ? 'submit' : 'button'}
        onClick={onSubmit ? undefined : onClose}
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
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: Z_OVERLAY, touchAction: 'none' }}
            onClick={() => closeOnBackdrop && onClose?.()}
          />

          {/* Dialog — floats above safe area on mobile, centred on desktop */}
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center pointer-events-none"
            style={{
              zIndex: Z_MODAL,
              paddingLeft: '12px',
              paddingRight: '12px',
              paddingTop: 'calc(var(--safe-top) + 8px)',
              paddingBottom: 'calc(var(--safe-bottom) + 8px)',
              height: '100dvh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            <motion.div
              key="modal-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className={`w-full ${maxWidth} pointer-events-auto`}
              style={{ maxWidth: 'min(100%, calc(100vw - 24px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Wrapper
                {...wrapperProps}
                className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full min-h-0"
                style={{
                  maxWidth: '100%',
                  overflowX: 'hidden',
                  maxHeight: 'calc(100dvh - var(--safe-top) - var(--safe-bottom) - 16px)',
                }}
              >
                {(title || showClose) && (
                  <ModalHeader title={title} subtitle={subtitle} onClose={onClose} showClose={showClose} />
                )}
                <ModalBody>{children}</ModalBody>
                <ModalFooter>{footer !== undefined ? footer : defaultFooter}</ModalFooter>
              </Wrapper>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}