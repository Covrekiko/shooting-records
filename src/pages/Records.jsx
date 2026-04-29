import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getRepository } from '@/lib/offlineSupport';
import Navigation from '@/components/Navigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import GpsPathViewer from '@/components/GpsPathViewer';
import ManualRecordModal from '@/components/ManualRecordModal';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Download, Eye, Trash2, X, FileText, Map, Image, ChevronDown, Plus, Edit, Search } from 'lucide-react';
import { format } from 'date-fns';
import { exportRecordsToPdf, getRecordsPdfBlob } from '@/utils/recordsPdfExport';
import { DESIGN } from '@/lib/designConstants';
import RecordDetailModal from '@/components/RecordDetailModal';

export default function Records() {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [users, setUsers] = useState({});
  const [rifles, setRifles] = useState({});
  const [shotguns, setShotguns] = useState({});
  const [clubs, setClubs] = useState({});
  const [deerLocations, setDeerLocations] = useState({});
  const [previewingPdf, setPreviewingPdf] = useState(null);
  const [viewingTrack, setViewingTrack] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [manualRecordModal, setManualRecordModal] = useState(null);

  const [filters, setFilters] = useState({
    category: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const anyModalOpen = !!(viewingRecord || previewingPdf || viewingTrack || viewingPhoto || manualRecordModal);
  useBodyScrollLock(anyModalOpen);

  const loadRecordsRef = useRef(null);
  const { pulling, progress, refreshing } = usePullToRefresh(useCallback(() => {
    loadRecordsRef.current?.();
  }, []));

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allRecords]);

  const loadRecords = async () => {
    loadRecordsRef.current = loadRecords;
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

      // Load rifles, shotguns, clubs, and locations (offline-aware)
      const [allRifles, allShotguns, allClubs, allLocations] = await Promise.all([
        getRepository('Rifle').filter({ created_by: currentUser.email }),
        getRepository('Shotgun').filter({ created_by: currentUser.email }),
        getRepository('Club').filter({ created_by: currentUser.email }),
        getRepository('Area').filter({ created_by: currentUser.email }),
      ]);

      const rifleMap = {};
      allRifles.forEach(r => rifleMap[r.id] = r);
      setRifles(rifleMap);

      const shotgunMap = {};
      allShotguns.forEach(s => shotgunMap[s.id] = s);
      setShotguns(shotgunMap);

      const clubMap = {};
      allClubs.forEach(c => clubMap[c.id] = c);
      setClubs(clubMap);

      const locationMap = {};
      allLocations.forEach(l => locationMap[l.id] = l);
      setDeerLocations(locationMap);

      let query = {};
      if (currentUser.role !== 'admin') {
        query.created_by = currentUser.email;
      }

      const sessionRecords = await getRepository('SessionRecord').filter(query);

      // Map category to recordType for compatibility
      const records = sessionRecords.map((r) => {
        const recordTypeMap = {
          'target_shooting': 'target',
          'clay_shooting': 'clay',
          'deer_management': 'deer'
        };
        return { ...r, recordType: recordTypeMap[r.category] || r.category };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      setAllRecords(records);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allRecords;

    if (filters.category !== 'all') {
      filtered = filtered.filter((r) => r.recordType === filters.category);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((r) => r.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((r) => r.date <= filters.dateTo);
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async (record) => {
    if (!confirm('Delete this record? This will restore all ammunition stock.')) return;
    try {
      // Prevent delete if offline
      const isOnline = navigator.onLine;
      if (!isOnline) {
        alert('You are offline. You must be online to delete records and restore ammunition stock. Please connect to the internet and try again.');
        return;
      }

      // Refund ammunition using client-side helper
      const { refundAmmoForRecord } = await import('@/lib/ammoUtils');
      const refundResult = await refundAmmoForRecord(record, record.category);

      if (!refundResult.success) {
        alert('Error restoring ammunition: ' + refundResult.error);
        return;
      }

      // Delete the record
      await base44.entities.SessionRecord.delete(record.id);

      // Update local state
      setAllRecords(allRecords.filter((r) => r.id !== record.id));

      // Force reload
      setTimeout(() => loadRecords(), 500);
    } catch (error) {
      console.error('🔴 [handleDelete] Error deleting record:', error);
      alert('Error deleting record: ' + error.message);
    }
  };

  const handleSaveManualRecord = async (data, recordType, recordId) => {
    try {
      const categoryMap = { 'target': 'target_shooting', 'clay': 'clay_shooting', 'deer': 'deer_management' };
      const recordData = { ...data, category: categoryMap[recordType] };
      
      if (recordId) {
        // For existing records: restore old stock first, then save, then apply new stock
        try {
          await base44.functions.invoke('restoreSessionStock', { sessionId: recordId });
        } catch (e) {
          console.warn('Could not restore old stock before edit (may be a new manual record):', e.message);
        }
        await base44.entities.SessionRecord.update(recordId, recordData);
        // Re-apply ammo decrement based on new data
        if (recordData.category === 'clay_shooting' && recordData.ammunition_id && recordData.rounds_fired) {
          const { decrementAmmoStock } = await import('@/lib/ammoUtils');
          await decrementAmmoStock(recordData.ammunition_id, parseInt(recordData.rounds_fired), 'clay_shooting', recordId);
        } else if (recordData.category === 'deer_management' && recordData.ammunition_id && recordData.total_count) {
          const { decrementAmmoStock } = await import('@/lib/ammoUtils');
          await decrementAmmoStock(recordData.ammunition_id, parseInt(recordData.total_count), 'deer_management', recordId);
        } else if (recordData.category === 'target_shooting' && Array.isArray(recordData.rifles_used)) {
          const { decrementAmmoStock } = await import('@/lib/ammoUtils');
          const ammoTotals = {};
          for (const rifle of recordData.rifles_used) {
            if (rifle.ammunition_id && parseInt(rifle.rounds_fired) > 0) {
              ammoTotals[rifle.ammunition_id] = (ammoTotals[rifle.ammunition_id] || 0) + parseInt(rifle.rounds_fired);
            }
          }
          for (const [ammoId, totalRounds] of Object.entries(ammoTotals)) {
            await decrementAmmoStock(ammoId, totalRounds, 'target_shooting', recordId);
          }
        }
        setAllRecords(allRecords.map(r => r.id === recordId ? { ...r, ...recordData, recordType } : r));
      } else {
        // Create new manual record — no ammo deduction (manual records are historical logs)
        const newRecord = await base44.entities.SessionRecord.create(recordData);
        setAllRecords([{ ...newRecord, recordType }, ...allRecords]);
      }
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
      <Navigation />
      {(pulling || refreshing) && (
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none', opacity: refreshing ? 1 : progress, transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      )}
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Records</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setManualRecordModal({ isNew: true })}
                className="p-2 sm:px-3 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
                title="Add Record"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Record</span>
              </button>
              {filteredRecords.length > 0 && (
                <>
                  <button
                    onClick={() => setPreviewingPdf(filteredRecords)}
                    className="p-2 sm:px-3 sm:py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
                    title="Preview PDF"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview PDF</span>
                  </button>
                  <button
                    onClick={() => exportRecordsToPdf(filteredRecords, null, 'shooting-records.pdf', rifles, clubs, shotguns)}
                    className="p-2 sm:px-3 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
                    title="Export PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">All your shooting activity logs</p>

          {/* Filters */}
           <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-6">
             <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
               <div>
                 <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Record Type</label>
                 <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Records</option>
                    <option value="target">Target Shooting</option>
                    <option value="clay">Clay Shooting</option>
                    <option value="deer">Deer Management</option>
                  </select>
               </div>
               <div>
                 <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">From Date</label>
                 <input
                   type="date"
                   value={filters.dateFrom}
                   onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                   placeholder="From date"
                   className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">To Date</label>
                 <input
                   type="date"
                   value={filters.dateTo}
                   onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                   placeholder="To date"
                   className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                 />
               </div>
             </div>
           </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
            <div className="flex justify-center mb-3">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">No records found</p>
            <p className="text-sm text-muted-foreground">Try changing the filters or add a new record to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={() => handleDelete(record)} user={user} onView={setViewingRecord} recordUser={users[record.created_by]} onViewTrack={setViewingTrack} onViewPhoto={setViewingPhoto} rifles={rifles} shotguns={shotguns} clubs={clubs} locations={deerLocations} onEdit={() => setManualRecordModal({ isNew: false, record })} />
            ))}
          </div>
        )}
        
        {viewingRecord && (
          <RecordDetailModal record={viewingRecord} onClose={() => setViewingRecord(null)} rifles={rifles} shotguns={shotguns} clubs={clubs} locations={deerLocations} />
        )}
        
        {previewingPdf && createPortal(
           <PdfPreviewModal records={previewingPdf} userInfo={null} rifles={rifles} clubs={clubs} shotguns={shotguns} onClose={() => setPreviewingPdf(null)} />,
           document.body
         )}
        
        {viewingTrack && createPortal(
          <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />,
          document.body
        )}
        
        {viewingPhoto && createPortal(
          <PhotoModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />,
          document.body
        )}

        {manualRecordModal && (
          <ManualRecordModal
            record={manualRecordModal.record}
            onClose={() => setManualRecordModal(null)}
            onSave={handleSaveManualRecord}
          />
        )}
      </main>
    </div>
  );
}

function RecordCard({ record, onDelete, user, onView, recordUser, onViewTrack, onViewPhoto, rifles, shotguns, clubs, locations, onEdit }) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const getRecordTitle = () => {
    if (record.recordType === 'target') {
      const totalRounds = record.rifles_used?.reduce((sum, r) => sum + (parseInt(r.rounds_fired) || 0), 0) || 0;
      return `Target Shooting - ${totalRounds} rounds`;
    }
    if (record.recordType === 'clay') return `Clay Shooting - ${record.rounds_fired || 0} rounds`;
    if (record.recordType === 'deer') {
      if (!record.total_count) return 'Deer Management - No shots fired';
      const speciesList = record.species_list?.map(s => `${s.species}(${s.count})`).join(', ') || 'Unknown';
      return `Deer Management: ${speciesList} - ${record.total_count} shots fired`;
    }
  };



  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg break-words" style={{ overflowWrap: 'anywhere' }}>{getRecordTitle()}</h3>
          <p className="text-sm text-muted-foreground mb-2">{record.date} • {getBadgeLabel(record.recordType)}</p>

          {recordUser && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">User:</span> {recordUser.full_name}</p>
              {recordUser.dateOfBirth && (
                <p><span className="font-medium">DOB:</span> {format(new Date(recordUser.dateOfBirth), 'dd/MM/yyyy')}</p>
              )}
              {recordUser.addressLine1 && (
                <p><span className="font-medium">Address:</span> {recordUser.addressLine1}{recordUser.addressLine2 ? ', ' + recordUser.addressLine2 : ''}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex gap-2">
            {record.photos && record.photos.length > 0 && (
              <div className="relative inline-block">
                <button
                  className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
                  title="View photo"
                  onClick={record.photos.length === 1 ? () => onViewPhoto(record.photos[0]) : () => setShowPhotoMenu(!showPhotoMenu)}
                >
                  <Image className="w-4 h-4" />
                  {record.photos.length > 1 && <ChevronDown className="w-3 h-3" />}
                </button>
                {record.photos.length > 1 && showPhotoMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded shadow-lg z-10">
                    {record.photos.map((photo, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onViewPhoto(photo);
                          setShowPhotoMenu(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors whitespace-nowrap first:rounded-t last:rounded-b"
                      >
                        Photo {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => onView(record)}
              className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
              title="View full report"
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
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
              title="Edit record"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
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



function PhotoModal({ photo, onClose }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  useBodyScrollLock(true);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.2));
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, offset]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[50001]" onClick={onClose}>
      <div className="relative w-[95vw] h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 bg-black/40 border-b border-white/10">
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 text-sm text-white hover:bg-white/20 rounded transition-colors"
            title="Zoom out"
          >
            −
          </button>
          <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 text-sm text-white hover:bg-white/20 rounded transition-colors"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 text-xs text-white hover:bg-white/20 rounded transition-colors ml-2"
            title="Reset zoom and position"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="ml-auto text-white hover:text-gray-300"
            title="Close (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imgRef}
            src={typeof photo === 'string' ? photo : photo.url}
            alt="Full view"
            className="rounded-lg select-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.2s',
              maxHeight: '85vh',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
            onMouseDown={handleMouseDown}
            onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2218%22 dominant-baseline=%22middle%22%3EPhoto not found%3C/text%3E%3C/svg%3E'}
          />
        </div>
      </div>
    </div>
  );
  }

function getBadgeLabel(type) {
  if (type === 'target') return 'Target Shooting';
  if (type === 'clay') return 'Clay Shooting';
  if (type === 'deer') return 'Deer Management';
}

function PdfPreviewModal({ records, userInfo, rifles, clubs, shotguns, onClose }) {
   const [pdfUrl, setPdfUrl] = useState(null);
   const [loading, setLoading] = useState(true);
   useBodyScrollLock(true);

   useEffect(() => {
     (async () => {
       const blob = await getRecordsPdfBlob(records, userInfo, rifles, clubs, shotguns);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setLoading(false);
    })();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [records, userInfo]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[50001]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-slate-200/70 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-slate-700">
          <h2 className="text-xl font-bold">PDF Preview</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
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
        <div className="p-4 border-t border-slate-200/70 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={() => exportRecordsToPdf(records, null, 'shooting-records.pdf', rifles, clubs, shotguns)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}