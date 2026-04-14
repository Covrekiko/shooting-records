import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children,
  showHandle = true,
  closeOnBackdropClick = true
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
            onClick={() => closeOnBackdropClick && onClose()}
            className="fixed inset-0 z-[50000] bg-black/30 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: 'blur(8px)' }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-[50001] flex flex-col max-h-[90vh] bg-white/98 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-white/40 overflow-hidden"
            style={{ WebkitBackdropFilter: 'blur(20px)' }}
          >
            {/* Handle + Header */}
            <div className="flex flex-col items-center px-4 pt-3 pb-2">
              {showHandle && (
                <div className="w-12 h-1 bg-slate-300 rounded-full mb-3" />
              )}
              {title && (
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </motion.button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}