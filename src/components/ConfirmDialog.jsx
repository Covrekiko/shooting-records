import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  icon = null
}) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[50000] bg-black/30 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: 'blur(8px)', touchAction: 'none' }}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[50001] flex items-center justify-center pointer-events-none"
          >
            <div className="max-w-sm w-[calc(100%-2rem)] pointer-events-auto bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden p-6" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
              {/* Icon */}
              {icon ? (
                <div className="flex justify-center mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {icon}
                  </div>
                </div>
              ) : isDestructive ? (
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              ) : null}

              {/* Content */}
              <div className="text-center mb-6">
                {title && (
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                )}
                {message && (
                  <p className="text-sm text-slate-600">{message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-col-reverse sm:flex-row">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-slate-200 text-slate-900 hover:bg-slate-300 transition-all text-sm"
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-all text-sm ${
                    isDestructive
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-primary hover:opacity-90'
                  }`}
                >
                  {confirmText}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}