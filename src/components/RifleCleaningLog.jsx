import { Calendar, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RifleCleaningLog({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600 dark:text-slate-400">No cleaning history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, idx) => (
        <motion.div
          key={log.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {new Date(log.created_date || log.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold">
                Total Rounds
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {log.total_rounds_at_cleaning || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold">
                Rounds Since Previous
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {log.rounds_since_previous_cleaning || 0}
              </p>
            </div>
          </div>

          {log.notes && (
            <p className="text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              {log.notes}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}