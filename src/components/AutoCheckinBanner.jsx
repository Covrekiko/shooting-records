/**
 * AutoCheckinBanner
 * Shows when an auto check-in has been triggered.
 * User can confirm, cancel, or dismiss.
 */
import { useState } from 'react';
import { MapPin, X, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoCheckinBanner({ match, onConfirm, onCancel, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const typeLabel = match.type === 'area' ? 'Stalking Area' : match.clubType || 'Shooting Club';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[49000] w-[calc(100%-24px)] max-w-sm pointer-events-auto"
      >
        <div className="bg-white dark:bg-slate-800 border border-primary/30 rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Auto Check-In Detected</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                You've been at <span className="font-semibold text-slate-700 dark:text-slate-200">{match.name}</span> for 10+ minutes.
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{typeLabel} · Auto by Geolocation</p>
            </div>
            <button onClick={() => { setDismissed(true); onDismiss?.(); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex-shrink-0">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Check In
            </button>
            <button
              onClick={() => { setDismissed(true); onCancel?.(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Not Now
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}