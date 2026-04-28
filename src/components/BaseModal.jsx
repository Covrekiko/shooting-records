import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function BaseModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true
}) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[calc(100%-2rem)]'
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeOnBackdropClick && onClose()}
            className="fixed inset-0 z-[50000] bg-black/30 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: 'blur(8px)', touchAction: 'none' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className={`fixed inset-0 z-[50001] flex items-center justify-center pointer-events-none`}
          >
            <div className={`${sizeClasses[size]} w-full sm:w-auto pointer-events-auto bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]`} style={{ WebkitBackdropFilter: 'blur(20px)' }}>
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50">
                  {title && (
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                  )}
                  {!title && <div />}
                  {showCloseButton && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <X className="w-5 h-5 text-slate-600" />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                {children}
              </div>

              {/* Footer / Actions */}
              {actions && actions.length > 0 && (
                <div className="border-t border-slate-200/50 p-4 bg-slate-50/50 flex gap-3 flex-col-reverse sm:flex-row">
                  {actions.map((action, idx) => (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.98 }}
                      onClick={action.onClick}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm ${
                        action.variant === 'primary'
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : action.variant === 'destructive'
                          ? 'bg-destructive text-white hover:opacity-90'
                          : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      }`}
                    >
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}