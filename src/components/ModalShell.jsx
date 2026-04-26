import { motion } from 'framer-motion';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * ModalShell — unified bottom-sheet on mobile, centered dialog on desktop.
 * Props:
 *   title      — string header
 *   onClose    — called when backdrop/X is tapped
 *   footer     — ReactNode rendered in a sticky footer bar
 *   maxWidth   — override max-width class (default "sm:max-w-md")
 *   children   — scrollable body content
 */
export default function ModalShell({ title, onClose, footer, children, maxWidth = 'sm:max-w-md' }) {
  useBodyScrollLock(true);

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={`bg-white dark:bg-slate-800/95 w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden`}
      style={{ maxHeight: 'min(90dvh, 700px)' }}
    >
      {/* Drag handle (mobile only) */}
      <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 safe-area-bottom"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
}