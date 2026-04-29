import { Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function RecordsList({ records, category, onDelete, onView, emptyMessage }) {
  const filteredRecords = records.filter(r => r.category === category);

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage || `No records yet for this category`}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredRecords.map((record) => (
        <div key={record.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{record.place_name || record.club_id || 'Session'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(record.date), 'MMM d, yyyy')} at {record.checkin_time || record.start_time}
              </p>
              {record.notes && <p className="text-xs text-foreground mt-2 line-clamp-2">{record.notes}</p>}
            </div>
            <div className="flex gap-2 ml-3 flex-shrink-0">
              {onView && (
                <button
                  onClick={() => onView(record)}
                  className="p-2 hover:bg-secondary rounded transition-colors"
                  title="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(record)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}