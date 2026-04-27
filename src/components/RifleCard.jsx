import { Edit2, Trash2, Droplet, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function RifleCard({ rifle, onEdit, onDelete, onClean }) {
  const [marking, setMarking] = useState(false);

  const roundsSinceClean = (rifle.total_rounds_fired || 0) - (rifle.rounds_at_last_cleaning || 0);
  const cleaningThreshold = rifle.cleaning_reminder_threshold || 100;
  const needsCleaning = roundsSinceClean >= cleaningThreshold;
  const isClean = roundsSinceClean < cleaningThreshold;

  const handleMarkClean = async (e) => {
    e.stopPropagation();
    setMarking(true);
    await onClean(rifle);
    setMarking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
    >
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl">
            🔫
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{rifle.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{rifle.make} {rifle.model}</p>
          </div>
        </div>
      </div>

      {/* Calibre */}
      <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-3">
        {rifle.caliber}
      </p>

      {/* Serial Number */}
      {rifle.serial_number && (
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-3">S/N: {rifle.serial_number}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1">
            Rounds Fired
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {rifle.total_rounds_fired || 0}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1">
            Since Clean
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {roundsSinceClean}
          </p>
        </div>
      </div>

      {/* Last Cleaned */}
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
        Last cleaned: {rifle.last_cleaning_date ? new Date(rifle.last_cleaning_date).toLocaleDateString() : 'Never'}
      </p>

      {/* Status Badge */}
      <div className="mb-4">
        {isClean ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-600" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Clean</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
              Needs Cleaning ({roundsSinceClean}/{cleaningThreshold})
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMarkClean}
          disabled={marking}
          className="flex-1 px-3 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Droplet className="w-4 h-4" />
          {marking ? 'Marking...' : 'Mark Clean'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onEdit(rifle)}
          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center"
        >
          <Edit2 className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (confirm(`Delete ${rifle.name}?`)) onDelete(rifle.id);
          }}
          className="px-3 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}