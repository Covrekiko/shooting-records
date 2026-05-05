import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';

export default function CleaningStatusBadge({ lastCleaningDate, className = '' }) {
  const label = lastCleaningDate
    ? `Cleaned ${formatDistanceToNow(new Date(lastCleaningDate), { addSuffix: true })}`
    : 'Never cleaned';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold ${className}`}>
      <Clock className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}