import { AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MissingFieldsAlert({ fields, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[50002] flex items-center justify-center p-4 sm:p-0"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-full flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Complete Required Fields</h3>
              <p className="text-sm text-muted-foreground mt-1">Please fill in the following before continuing:</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <ul className="space-y-3">
            {fields.map((field, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span className="text-foreground font-medium">{field}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-base hover:opacity-90 transition-all active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </motion.div>
  );
}