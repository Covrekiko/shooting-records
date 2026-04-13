import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import GpsPathViewer from '@/components/GpsPathViewer';
import { Download, Eye, Trash2, X, FileText, Map } from 'lucide-react';
import { format } from 'date-fns';
import { exportRecordsToPdf, getRecordsPdfBlob } from '@/utils/recordsPdfExport';

export default function Records() {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [users, setUsers] = useState({});
  const [previewingPdf, setPreviewingPdf] = useState(null);
  const [viewingTrack, setViewingTrack] = useState(null);

  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allRecords]);

  const loadRecords = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Load all users for record display
      const allUsers = await base44.entities.User.list();
      const userMap = {};
      allUsers.forEach(u => {
        userMap[u.email] = u;
      });
      setUsers(userMap);

      let query = {};
      if (currentUser.role !== 'admin') {
        query.created_by = currentUser.email;
      }

      const [targetShoots, clayShoots, deerMgmt] = await Promise.all([
        base44.entities.TargetShooting.filter(query),
        base44.entities.ClayShooting.filter(query),
        base44.entities.DeerManagement.filter(query),
      ]);

      const records = [
        ...targetShoots.map((r) => ({ ...r, recordType: 'target' })),
        ...clayShoots.map((r) => ({ ...r, recordType: 'clay' })),
        ...deerMgmt.map((r) => ({ ...r, recordType: 'deer' })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setAllRecords(records);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allRecords;

    if (filters.type !== 'all') {
      filtered = filtered.filter((r) => r.recordType === filters.type);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((r) => r.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((r) => r.date <= filters.dateTo);
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Delete this record?')) return;
    try {
      const entityName = type === 'target' ? 'TargetShooting' : type === 'clay' ? 'ClayShooting' : 'DeerManagement';
      await base44.entities[entityName].delete(id);
      setAllRecords(allRecords.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">All Records</h1>
            {filteredRecords.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewingPdf(filteredRecords)}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Preview PDF
                </button>
                <button
                  onClick={() => exportRecordsToPdf(filteredRecords, user)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mb-6">View and manage all your shooting records</p>

          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Record Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="all">All Records</option>
                  <option value="target">Target Shooting</option>
                  <option value="clay">Clay Shooting</option>
                  <option value="deer">Deer Management</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={handleDelete} user={user} onView={setViewingRecord} recordUser={users[record.created_by]} onViewTrack={setViewingTrack} />
            ))}
          </div>
        )}
        
        {viewingRecord && (
          <RecordModal record={viewingRecord} onClose={() => setViewingRecord(null)} />
        )}
        
        {previewingPdf && (
          <PdfPreviewModal records={previewingPdf} userInfo={user} onClose={() => setPreviewingPdf(null)} />
        )}
        
        {viewingTrack && (
          <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />
        )}
      </main>
    </div>
  );
}

function RecordCard({ record, onDelete, user, onView, recordUser, onViewTrack }) {
  const getRecordTitle = () => {
    if (record.recordType === 'target') return `Target Shooting - ${record.rounds_fired} rounds`;
    if (record.recordType === 'clay') return `Clay Shooting - ${record.rounds_fired} rounds`;
    if (record.recordType === 'deer') return `Deer: ${record.number_shot || 0} ${record.deer_species || 'Unknown'}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{getRecordTitle()}</h3>
          <p className="text-sm text-muted-foreground mb-2">{record.date} • {getBadgeLabel(record.recordType)}</p>
          {recordUser && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">User:</span> {recordUser.full_name}</p>
              {recordUser.date_of_birth && (
                <p><span className="font-medium">DOB:</span> {format(new Date(recordUser.date_of_birth), 'dd/MM/yyyy')}</p>
              )}
              {recordUser.address && (
                <p><span className="font-medium">Address:</span> {recordUser.address}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {record.photos && record.photos.length > 0 && (
            <img src={record.photos[0]} alt="record" className="w-20 h-20 object-cover rounded" />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onView(record)}
              className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
            </button>
            {record.gps_track && record.gps_track.length > 0 && (
              <button
                onClick={() => onViewTrack(record.gps_track)}
                className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
              >
                <Map className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(record.id, record.recordType)}
              className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordModal({ record, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Record Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {record.photos && record.photos.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Photos</p>
            <div className="flex flex-wrap gap-2">
              {record.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt="record" className="h-24 w-24 object-cover rounded" />
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-3 text-sm">
          <div>
            <label className="font-semibold text-muted-foreground">Date</label>
            <p>{record.date}</p>
          </div>
          {record.recordType === 'target' && (
            <>
              <div><label className="font-semibold text-muted-foreground">Check-in Time</label><p>{record.checkin_time}</p></div>
              <div><label className="font-semibold text-muted-foreground">Check-out Time</label><p>{record.checkout_time || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Rounds Fired</label><p>{record.rounds_fired}</p></div>
              <div><label className="font-semibold text-muted-foreground">Ammunition Brand</label><p>{record.ammunition_brand || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Notes</label><p>{record.notes || '-'}</p></div>
            </>
          )}
          {record.recordType === 'clay' && (
            <>
              <div><label className="font-semibold text-muted-foreground">Check-in Time</label><p>{record.checkin_time}</p></div>
              <div><label className="font-semibold text-muted-foreground">Check-out Time</label><p>{record.checkout_time || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Rounds Fired</label><p>{record.rounds_fired}</p></div>
              <div><label className="font-semibold text-muted-foreground">Notes</label><p>{record.notes || '-'}</p></div>
            </>
          )}
          {record.recordType === 'deer' && (
            <>
              <div><label className="font-semibold text-muted-foreground">Location</label><p>{record.place_name || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Check-in Time</label><p>{record.start_time}</p></div>
              <div><label className="font-semibold text-muted-foreground">Check-out Time</label><p>{record.end_time || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Species</label><p>{record.deer_species || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Number Shot</label><p>{record.number_shot || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Ammunition</label><p>{record.ammunition_used || '-'}</p></div>
              <div><label className="font-semibold text-muted-foreground">Notes</label><p>{record.notes || '-'}</p></div>
            </>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function getBadgeLabel(type) {
  if (type === 'target') return 'Target Shooting';
  if (type === 'clay') return 'Clay Shooting';
  if (type === 'deer') return 'Deer Management';
}

function PdfPreviewModal({ records, userInfo, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const blob = await getRecordsPdfBlob(records, userInfo);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setLoading(false);
    })();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [records, userInfo]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold">PDF Preview</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full border-0" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to generate PDF</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={() => exportRecordsToPdf(records, userInfo)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}