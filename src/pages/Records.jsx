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
  const [rifles, setRifles] = useState({});
  const [shotguns, setShotguns] = useState({});
  const [clubs, setClubs] = useState({});
  const [deerLocations, setDeerLocations] = useState({});
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

      // Load rifles, shotguns, clubs, and locations
      const [allRifles, allShotguns, allClubs, allLocations] = await Promise.all([
        base44.entities.Rifle.list(),
        base44.entities.Shotgun.list(),
        base44.entities.Club.list(),
        base44.entities.DeerLocation.list(),
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
              <RecordCard key={record.id} record={record} onDelete={handleDelete} user={user} onView={setViewingRecord} recordUser={users[record.created_by]} onViewTrack={setViewingTrack} rifles={rifles} shotguns={shotguns} clubs={clubs} locations={deerLocations} />
            ))}
          </div>
        )}
        
        {viewingRecord && (
          <RecordModal record={viewingRecord} onClose={() => setViewingRecord(null)} rifles={rifles} shotguns={shotguns} clubs={clubs} locations={deerLocations} user={user} />
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

function RecordCard({ record, onDelete, user, onView, recordUser, onViewTrack, rifles, shotguns, clubs, locations }) {
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
  const getRifleName = (rifleId) => rifles[rifleId]?.name || 'Unknown Rifle';
  const getRifleDetails = (rifleId) => rifles[rifleId];
  const getShotgunName = (shotgunId) => shotguns[shotgunId]?.name || 'Unknown Shotgun';
  const getShotgunDetails = (shotgunId) => shotguns[shotgunId];
  const getClubName = (clubId) => clubs[clubId]?.name || 'Unknown Club';
  const getLocationName = (locationId) => locations[locationId]?.place_name || 'Unknown Location';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg max-w-3xl w-full p-8 my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
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
        {record.photos && record.photos.length > 0 && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-3">Evidence Photos</h3>
            <div className="grid grid-cols-4 gap-2">
              {record.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt="record" className="h-28 w-28 object-cover rounded-lg border border-border" />
              ))}
            </div>
          </div>
        )}

        {/* Basic Session Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <label className="font-bold text-sm text-primary">Session Date</label>
            <p className="text-lg">{format(new Date(record.date), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div>
            <label className="font-bold text-sm text-primary">Session Type</label>
            <p className="text-lg">{record.recordType === 'target' ? 'Target Shooting' : record.recordType === 'clay' ? 'Clay Shooting' : 'Deer Management'}</p>
          </div>
          <div>
            <label className="font-bold text-sm text-primary">Check-In Time</label>
            <p className="text-lg">{record.recordType === 'deer' ? record.start_time : record.checkin_time}</p>
          </div>
          <div>
            <label className="font-bold text-sm text-primary">Check-Out Time</label>
            <p className="text-lg">{record.recordType === 'deer' ? record.end_time || 'N/A' : record.checkout_time || 'N/A'}</p>
          </div>
        </div>

        {/* Target Shooting Section */}
        {record.recordType === 'target' && (
          <>
            {/* Venue Information */}
            {getClubName(record.club_id) && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Venue Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="font-semibold text-base">{getClubName(record.club_id)}</p>
                  {clubs[record.club_id]?.location && (
                    <p className="text-sm text-muted-foreground mt-1">{clubs[record.club_id].location}</p>
                  )}
                  {clubs[record.club_id]?.notes && (
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
        {record.recordType === 'clay' && (
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-sm text-primary">Total Rounds Fired</label>
                  <p className="text-lg">{record.rounds_fired || '0'} rounds</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Deer Management Section */}
        {record.recordType === 'deer' && (
          <>
            <div className="mb-6 pb-4 border-b border-border">
              <h3 className="font-bold text-lg mb-3 text-primary">Location & Hunting Details</h3>
              <div className="bg-secondary/30 p-4 rounded-lg">
                <p className="font-semibold text-base">{getLocationName(record.location_id) || record.place_name || 'N/A'}</p>
                {locations[record.location_id]?.location && (
                  <p className="text-sm text-muted-foreground mt-1">{locations[record.location_id].location}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-border">
              <div>
                <label className="font-bold text-sm text-primary">Species</label>
                <p className="text-lg font-semibold">{record.deer_species || '-'}</p>
              </div>
              <div>
                <label className="font-bold text-sm text-primary">Number Harvested</label>
                <p className="text-lg font-semibold">{record.number_shot || '0'}</p>
              </div>
            </div>

            {record.rifle_id && rifles[record.rifle_id] && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Rifle Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="font-semibold text-base">{getRifleName(record.rifle_id)}</p>
                  <div className="grid grid-cols-3 gap-3 mt-3">
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
              </div>
            )}

            {record.ammunition_used && (
              <div className="mb-6 pb-4 border-b border-border">
                <label className="font-bold text-sm text-primary">Ammunition Used</label>
                <p className="text-base">{record.ammunition_used}</p>
              </div>
            )}
          </>
        )}

        {/* Notes Section */}
        {record.notes && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-2 text-primary">Session Notes</h3>
            <div className="bg-secondary/20 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{record.notes}</p>
            </div>
          </div>
        )}

        {/* Footer with record info */}
        <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg text-center">
          <p>Record ID: {record.id}</p>
          <p>Created: {format(new Date(record.created_date), 'PPpp')}</p>
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