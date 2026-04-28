import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PullToRefreshIndicator({ pulling, progress, refreshing }) {
  if (!pulling && !refreshing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-center pt-3 pb-1 pointer-events-none"
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: refreshing ? 360 : progress * 180 }}
          transition={{ rotate: { duration: refreshing ? 1 : 0, repeat: refreshing ? Infinity : 0 } }}
          className="flex-shrink-0"
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </motion.div>
        {refreshing && (
          <span className="text-xs font-medium text-primary">Updating…</span>
        )}
        {pulling && !refreshing && (
          <span className="text-xs font-medium text-muted-foreground">
            {progress >= 0.8 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        )}
      </div>
    </motion.div>
  );
}