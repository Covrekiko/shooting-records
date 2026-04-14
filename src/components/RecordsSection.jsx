import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function RecordsSection({ category, title, emptyMessage = 'No records yet' }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);

  useEffect(() => {
    async function loadRecords() {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const recordsList = await base44.entities.SessionRecord.filter({
          created_by: currentUser.email,
          category,
        });

        setRecords(recordsList);
      } catch (error) {
        console.error('Error loading records:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, [category]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await base44.entities.SessionRecord.delete(id);
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  if (records.length === 0) {
    return <div className="text-center py-12"><p className="text-muted-foreground">{emptyMessage}</p></div>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{record.location_name || record.place_name || 'Session'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(record.date), 'MMM d, yyyy')} at {record.checkin_time || record.start_time}
              </p>
              {record.created_by && (
                <p className="text-xs text-muted-foreground mt-1">by {record.created_by}</p>
              )}
              {record.notes && <p className="text-xs text-foreground mt-2 line-clamp-2">{record.notes}</p>}
            </div>
            <div className="flex gap-2 ml-3 flex-shrink-0">
              <button
                onClick={() => setViewingRecord(record)}
                className="p-2 hover:bg-secondary rounded transition-colors"
                title="View details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(record.id)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                title="Delete record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Record detail modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Record Details</h2>
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Date:</span> {format(new Date(viewingRecord.date), 'PPP')}</div>
              <div><span className="font-medium">Location:</span> {viewingRecord.location_name || viewingRecord.place_name}</div>
              {viewingRecord.checkin_time && <div><span className="font-medium">Check-in:</span> {viewingRecord.checkin_time}</div>}
              {viewingRecord.checkout_time && <div><span className="font-medium">Check-out:</span> {viewingRecord.checkout_time}</div>}
              {viewingRecord.rounds_fired && <div><span className="font-medium">Rounds:</span> {viewingRecord.rounds_fired}</div>}
              {viewingRecord.notes && <div><span className="font-medium">Notes:</span> {viewingRecord.notes}</div>}
            </div>
            <button
              onClick={() => setViewingRecord(null)}
              className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}