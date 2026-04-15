import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import GpsPathViewer from '@/components/GpsPathViewer';
import ManualRecordModal from '@/components/ManualRecordModal';
import { createPortal } from 'react-dom';
import { Download, Eye, Trash2, X, FileText, Map, Image, ChevronDown, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { exportRecordsToPdf, getRecordsPdfBlob } from '@/utils/recordsPdfExport';
import { DESIGN } from '@/lib/designConstants';

export default function Records() {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { pulling, progress, refreshing } = usePullToRefresh(useCallback(() => loadRecords(), []));
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

      // Load rifles, shotguns, clubs, and locations
      const [allRifles, allShotguns, allClubs, allLocations] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
        base44.entities.Shotgun.filter({ created_by: currentUser.email }),
        base44.entities.Club.filter({ created_by: currentUser.email }),
        base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
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

      const sessionRecords = await base44.entities.SessionRecord.filter(query);

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
      const typeMap = { 'target_shooting': 'target', 'clay_shooting': 'clay', 'deer_management': 'deer' };
      filtered = filtered.filter((r) => r.recordType === typeMap[filters.category]);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((r) => r.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((r) => r.date <= filters.dateTo);
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record? This will restore all ammunition stock.')) return;
    try {
      console.log(`🟡 [handleDelete] Starting delete for session: ${id}`);
      
      // Fetch the record first to see what data we have
      const recordToDelete = await base44.entities.SessionRecord.get(id);
      console.log('🟡 [handleDelete] Record data:', { category: recordToDelete.category, ammunition_id: recordToDelete.ammunition_id, rounds_fired: recordToDelete.rounds_fired, rifles_used: recordToDelete.rifles_used?.length });
      
      // Call backend to restore stock
      const restoreResponse = await base44.functions.invoke('restoreSessionStock', { sessionId: id });
      console.log('🟢 [handleDelete] Stock restored:', restoreResponse.data);

      // After stock is restored, delete the record
      await base44.entities.SessionRecord.delete(id);
      console.log('🟢 [handleDelete] Session record deleted');
      
      setAllRecords(allRecords.filter((r) => r.id !== id));
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
        // Update existing
        await base44.entities.SessionRecord.update(recordId, recordData);
        setAllRecords(allRecords.map(r => r.id === recordId ? { ...r, ...recordData, recordType } : r));
      } else {
        // Create new
        const newRecord = await base44.entities.SessionRecord.create(recordData);
        setAllRecords([{ ...newRecord, recordType }, ...allRecords]);
      }
    } catch (error) {
      console.error('Error saving record:', error);
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
      <main className="max-w-6xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h1 className="text-3xl font-bold">All Records</h1>
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
          <p className="text-muted-foreground mb-6">View and manage all your shooting records</p>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Record Type</label>
                <select
                   value={filters.category}
                   onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                   className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                 >
                   <option value="all">All Records</option>
                   <option value="target_shooting">Target Shooting</option>
                   <option value="clay_shooting">Clay Shooting</option>
                   <option value="deer_management">Deer Management</option>
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
          <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-muted-foreground">No records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={() => handleDelete(record.id)} user={user} onView={setViewingRecord} recordUser={users[record.created_by]} onViewTrack={setViewingTrack} onViewPhoto={setViewingPhoto} rifles={rifles} shotguns={shotguns} clubs={clubs} locations={deerLocations} onEdit={() => setManualRecordModal({ isNew: false, record })} />
            ))}
          </div>
        )}
        
        {viewingRecord && createPortal(
          <RecordModal record={viewingRecord} onClose={() => setViewingRecord(null)} rifles={rifles} shotguns={shotguns} clubs={clubs} locations={deerLocations} user={user} />,
          document.body
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
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{getRecordTitle()}</h3>
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

function RecordModal({ record, onClose, rifles, shotguns, clubs, locations, user }) {
  const [currentRecord, setCurrentRecord] = useState(record);

  useEffect(() => {
    const refreshRecord = async () => {
      try {
        const updatedRecord = await base44.entities.SessionRecord.get(record.id);
        setCurrentRecord({ ...updatedRecord, recordType: record.recordType });
      } catch (error) {
        console.error('Error refreshing record:', error);
      }
    };

    refreshRecord();
  }, [record.id, record.recordType]);

  const getRifleName = (rifleId) => rifles[rifleId]?.name || 'Unknown Rifle';
  const getRifleDetails = (rifleId) => rifles[rifleId];
  const getShotgunName = (shotgunId) => shotguns[shotgunId]?.name || 'Unknown Shotgun';
  const getShotgunDetails = (shotgunId) => shotguns[shotgunId];
  const getClubName = (clubId) => clubs[clubId]?.name || 'Unknown Club';
  const getLocationName = (locationId) => locations[locationId]?.place_name || 'Unknown Location';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[50001] overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 my-4 shadow-2xl border border-slate-200/70 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 border-b border-border pb-8">
          <div>
            <h2 className="text-3xl font-bold">Session Report</h2>
            <p className="text-muted-foreground text-sm mt-1">Detailed Activity Record</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Photos Section */}
        {currentRecord.photos && currentRecord.photos.length > 0 && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-3">Evidence Photos</h3>
            <div className="grid grid-cols-4 gap-2">
              {currentRecord.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt="record" className="h-28 w-28 object-cover rounded-lg border border-border" />
              ))}
            </div>
          </div>
        )}

        {/* Basic Session Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <label className="font-bold text-sm text-primary">Session Date</label>
            <p className="text-lg">{format(new Date(currentRecord.date), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div>
            <label className="font-bold text-sm text-primary">Session Type</label>
            <p className="text-lg">{currentRecord.recordType === 'target' ? 'Target Shooting' : currentRecord.recordType === 'clay' ? 'Clay Shooting' : 'Deer Management'}</p>
          </div>
          <div>
            <label className="font-bold text-sm text-primary">Check-In Time</label>
            <p className="text-lg">{currentRecord.recordType === 'deer' ? currentRecord.start_time : currentRecord.checkin_time}</p>
          </div>
          <div>
            <label className="font-bold text-sm text-primary">Check-Out Time</label>
            <p className="text-lg">{currentRecord.end_time || currentRecord.checkout_time || 'N/A'}</p>
          </div>
        </div>

        {/* Target Shooting Section */}
        {currentRecord.recordType === 'target' && (
          <>
            {/* Venue Information */}
            {record.club_id && clubs[record.club_id] && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Venue Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="font-semibold text-base">{clubs[record.club_id].name}</p>
                  <p className="text-sm text-muted-foreground mt-2">{clubs[record.club_id].location}</p>
                  {clubs[record.club_id].notes && (
                    <p className="text-sm mt-2">{clubs[record.club_id].notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Firearms Used Section */}
            {(record.rifles_used && record.rifles_used.length > 0) || record.rifle_id ? (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-4 text-primary">Firearms & Ammunition</h3>
                <div className="space-y-4">
                  {record.rifles_used && record.rifles_used.length > 0 ? (
                    record.rifles_used.map((rifleStat, idx) => {
                      const rifleData = getRifleDetails(rifleStat.rifle_id);
                      return (
                        <div key={idx} className="bg-secondary/30 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="text-xs font-bold text-muted-foreground uppercase">Firearm #{idx + 1}</label>
                              <p className="font-semibold text-base">{rifleStat.rifle_id ? getRifleName(rifleStat.rifle_id) : 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-muted-foreground uppercase">Rounds Fired</label>
                              <p className="font-semibold text-base">{rifleStat.rounds_fired || '0'} rounds</p>
                            </div>
                          </div>

                          {rifleData && (
                            <>
                              <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-border">
                                <div>
                                  <label className="text-xs font-bold text-muted-foreground">Make</label>
                                  <p className="text-sm">{rifleData.make || '-'}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-muted-foreground">Model</label>
                                  <p className="text-sm">{rifleData.model || '-'}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-muted-foreground">Caliber</label>
                                  <p className="text-sm">{rifleData.caliber || '-'}</p>
                                </div>
                              </div>

                              {rifleData.serial_number && (
                                <div className="mb-3 pb-3 border-b border-border bg-yellow-50/30 p-2 rounded">
                                  <label className="text-xs font-bold text-muted-foreground">Serial Number</label>
                                  <p className="font-mono text-sm font-bold">{rifleData.serial_number}</p>
                                </div>
                              )}
                            </>
                          )}

                          <div className="bg-blue-50/30 p-3 rounded mb-3 border border-blue-200/50">
                            <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">Ammunition & Ballistics</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-muted-foreground">Brand</label>
                                <p className="text-sm font-semibold">{rifleStat.ammunition_brand || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-muted-foreground">Bullet Type</label>
                                <p className="text-sm font-semibold">{rifleStat.bullet_type || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-muted-foreground">Grain Weight</label>
                                <p className="text-sm font-semibold">{rifleStat.grain || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-muted-foreground">Rounds Fired</label>
                                <p className="text-sm font-semibold">{rifleStat.rounds_fired || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-muted-foreground">Range Distance</label>
                                <p className="text-sm font-semibold">{rifleStat.meters_range ? `${rifleStat.meters_range}m` : '-'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : record.rifle_id ? (
                    <div className="bg-secondary/30 p-4 rounded-lg">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Firearm</label>
                        <p className="font-semibold text-base">{getRifleName(record.rifle_id)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* Clay Shooting Section */}
        {currentRecord.recordType === 'clay' && (
          <>
            {getClubName(record.club_id) && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Venue Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="font-semibold text-base">{getClubName(record.club_id)}</p>
                  {clubs[record.club_id]?.location && (
                    <p className="text-sm text-muted-foreground mt-1">{clubs[record.club_id].location}</p>
                  )}
                </div>
              </div>
            )}

            {record.shotgun_id && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Shotgun Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  {getShotgunDetails(record.shotgun_id) && (
                    <>
                      <p className="font-semibold text-base">{getShotgunName(record.shotgun_id)}</p>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Make</label>
                          <p className="text-sm">{getShotgunDetails(record.shotgun_id).make || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Model</label>
                          <p className="text-sm">{getShotgunDetails(record.shotgun_id).model || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Gauge</label>
                          <p className="text-sm">{getShotgunDetails(record.shotgun_id).gauge || '-'}</p>
                        </div>
                      </div>
                      {getShotgunDetails(record.shotgun_id).serial_number && (
                        <div className="mt-3">
                          <label className="text-xs font-bold text-muted-foreground">Serial Number</label>
                          <p className="font-mono text-sm">{getShotgunDetails(record.shotgun_id).serial_number}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6 pb-4 border-b border-border">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-bold text-sm text-primary">Total Rounds Fired</label>
                  <p className="text-lg">{record.rounds_fired || '0'} rounds</p>
                </div>
              </div>
              {record.ammunition_used && (
                <div className="bg-blue-50/30 p-3 rounded border border-blue-200/50">
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Ammunition Used</label>
                  <p className="text-sm font-medium">{record.ammunition_used}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Deer Management Section */}
        {currentRecord.recordType === 'deer' && (
          <>
            <div className="mb-6 pb-4 border-b border-border">
              <h3 className="font-bold text-lg mb-3 text-primary">Location & Hunting Details</h3>
              <div className="bg-secondary/30 p-4 rounded-lg">
                <p className="font-semibold text-base">{locations[record.location_id]?.place_name || record.place_name || 'N/A'}</p>
                {locations[record.location_id]?.location && (
                  <p className="text-sm text-muted-foreground mt-2">{locations[record.location_id].location}</p>
                )}
              </div>
            </div>

            <div className="mb-6 pb-4 border-b border-border">
              {record.total_count && record.total_count !== '0' ? (
                <>
                  <h3 className="font-bold text-lg mb-3 text-primary">Species Harvested</h3>
                  {record.species_list && record.species_list.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {record.species_list.map((s, idx) => (
                        <div key={idx} className="bg-secondary/30 p-3 rounded-lg flex justify-between">
                          <span className="font-medium">{s.species}</span>
                          <span className="font-semibold">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="bg-primary/10 p-3 rounded-lg mb-4">
                    <label className="text-xs font-bold text-primary">Total Shots Fired</label>
                    <p className="text-lg font-semibold">{record.total_count}</p>
                  </div>
                  {record.ammunition_used && (
                    <div className="bg-blue-50/30 p-3 rounded border border-blue-200/50">
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Ammunition Used</label>
                      <p className="text-sm font-medium">{record.ammunition_used}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-blue-50/30 p-4 rounded-lg border border-blue-200/50">
                  <p className="text-base font-semibold text-blue-600">No shots fired during this session</p>
                </div>
              )}
            </div>

            {record.total_count && record.total_count !== '0' && record.rifle_id && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Rifle & Ammunition Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg space-y-4">
                  <div>
                    <p className="font-semibold text-base mb-3">{getRifleName(record.rifle_id)}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Make</label>
                        <p className="text-sm">{rifles[record.rifle_id].make || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Model</label>
                        <p className="text-sm">{rifles[record.rifle_id].model || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Caliber</label>
                        <p className="text-sm">{rifles[record.rifle_id].caliber || '-'}</p>
                      </div>
                    </div>
                    {rifles[record.rifle_id].serial_number && (
                      <div className="mt-3">
                        <label className="text-xs font-bold text-muted-foreground">Serial Number</label>
                        <p className="font-mono text-sm">{rifles[record.rifle_id].serial_number}</p>
                      </div>
                    )}
                  </div>
                  {record.ammunition_used && (
                    <div className="border-t border-border pt-3">
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Ammunition</label>
                      <p className="text-sm font-medium">{record.ammunition_used}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Photos Section */}
        {currentRecord.photos && currentRecord.photos.length > 0 && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-3 text-primary">Photos</h3>
            <div className="grid grid-cols-2 gap-3">
              {currentRecord.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt="Session photo" className="rounded-lg w-full h-40 object-cover" />
              ))}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {currentRecord.notes && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-2 text-primary">Session Notes</h3>
            <div className="bg-secondary/20 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{currentRecord.notes}</p>
            </div>
          </div>
        )}

        {/* Footer with record info */}
        <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg text-center">
          <p>Record ID: {currentRecord.id}</p>
          <p>Created: {format(new Date(currentRecord.created_date), 'PPpp')}</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
        >
          Close Report
        </button>
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