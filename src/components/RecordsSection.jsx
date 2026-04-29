import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Eye, X, Download, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getRecordsPdfBlob } from '@/utils/recordsPdfExport';

export default function RecordsSection({ category, title, emptyMessage = 'No records yet', onRecordDeleted, showTargetAnalysis = false }) {
   const [records, setRecords] = useState([]);
   const [loading, setLoading] = useState(true);
   const [user, setUser] = useState(null);
   const [viewingRecord, setViewingRecord] = useState(null);
   const [rifles, setRifles] = useState({});
   const [shotguns, setShotguns] = useState({});
   const [clubs, setClubs] = useState({});
   const [locations, setLocations] = useState({});
   const [previewingPdf, setPreviewingPdf] = useState(null);
   const [generatingPdf, setGeneratingPdf] = useState(null);

   useEffect(() => {
     async function loadRecords() {
       try {
         const currentUser = await base44.auth.me();
         setUser(currentUser);

         const [recordsListRaw, riflesList, shotgunsList, clubsList, locationsList] = await Promise.all([
           base44.entities.SessionRecord.filter({
             created_by: currentUser.email,
             category,
             status: 'completed',
           }),
           base44.entities.Rifle.filter({ created_by: currentUser.email }),
           base44.entities.Shotgun.filter({ created_by: currentUser.email }),
           base44.entities.Club.filter({ created_by: currentUser.email }),
           base44.entities.Area.filter({ created_by: currentUser.email }),
         ]);

         // Filter out soft-deleted records
         const recordsList = recordsListRaw.filter((r) => r.isDeleted !== true && r.status !== 'deleted');
         setRecords(recordsList);
         setRifles(riflesList.reduce((acc, r) => ({ ...acc, [r.id]: r }), {}));
         setShotguns(shotgunsList.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}));
         setClubs(clubsList.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}));
         setLocations(locationsList.reduce((acc, l) => ({ ...acc, [l.id]: l }), {}));
       } catch (error) {
         console.error('Error loading records:', error);
       } finally {
         setLoading(false);
       }
     }

     loadRecords();
   }, [category]);

  const handlePdfPreview = async (record) => {
    try {
      setGeneratingPdf(record.id);
      let targetGroups = [];
      if (showTargetAnalysis && record.category === 'target_shooting') {
        targetGroups = await base44.entities.TargetGroup.filter({ session_id: record.id });
      }
      const blob = await getRecordsPdfBlob([record], null, rifles, clubs, shotguns, locations, targetGroups);
      const url = URL.createObjectURL(blob);
      setPreviewingPdf({ record, url });
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      alert('Failed to generate PDF preview');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDelete = async (recordId) => {
     if (!confirm('Delete this record? Ammunition and firearm counts will be restored.')) return;
    try {
      const isOnline = navigator.onLine;
      if (!isOnline) {
        alert('You must be online to delete records and restore ammunition. Please connect to the internet and try again.');
        return;
      }

      if (!recordId) {
        console.error('Record ID is missing or invalid');
        alert('Error: Record ID is missing. Cannot delete.');
        return;
      }

      // Load fresh record from Base44 before any changes
      let freshRecord;
      try {
        freshRecord = await base44.entities.SessionRecord.get(recordId);
        if (!freshRecord) {
          console.error('Record no longer exists in database');
          alert('Error: Record no longer exists in database.');
          return;
        }
      } catch (err) {
        console.error('Error loading record from database:', err);
        alert('Error loading record from database: ' + err.message);
        return;
      }

      // Check if already deleted
      if (freshRecord.isDeleted === true || freshRecord.status === 'deleted') {
        console.warn('Record already marked as deleted, removing from UI');
        setRecords(records.filter((r) => r.id !== recordId));
        return;
      }

      // Prevent double refund (idempotency check)
       let refundResult = null;
       if (freshRecord.ammoRefunded === true) {
         console.warn('Record already refunded, skipping refund');
       } else {
         // Refund ammunition using fresh record
         const { refundAmmoForRecord } = await import('@/lib/ammoUtils');
         refundResult = await refundAmmoForRecord(freshRecord, freshRecord.category);
         if (!refundResult.success) {
           console.error('Ammunition refund failed:', refundResult.error);
           alert('Ammunition refund failed. Record was not deleted.');
           return;
         }
       }

       const { reverseArmoryCountersForRecord } = await import('@/lib/ammoUtils');
       const armoryResult = await reverseArmoryCountersForRecord(freshRecord, freshRecord.category);
       if (!armoryResult.success) {
         alert('Armory counter update failed. Record was not deleted.');
         return;
       }

       // Soft delete the record (mark as deleted, do not hard delete)
      
      try {
        const now = new Date().toISOString();
        await base44.entities.SessionRecord.update(freshRecord.id, {
          isDeleted: true,
          deletedAt: now,
          status: 'deleted',
          ammoRefunded: true,
          ammoRefundedAt: now,
        });
        
      } catch (updateErr) {
        console.error('Error deleting record:', updateErr);

        // Rollback ammo refund if soft delete fails
        if (refundResult?.success && freshRecord.ammoRefunded !== true) {
          console.warn('Delete failed, rolling back ammo refund');
          try {
            const { decrementAmmoStock } = await import('@/lib/ammoUtils');
            // Re-decrement the stock to undo the refund
            if (freshRecord.category === 'target_shooting' && freshRecord.rifles_used) {
              const ammoTotals = {};
              for (const rifle of freshRecord.rifles_used) {
                if (rifle.ammunition_id && parseInt(rifle.rounds_fired) > 0) {
                  ammoTotals[rifle.ammunition_id] = (ammoTotals[rifle.ammunition_id] || 0) + parseInt(rifle.rounds_fired);
                }
              }
              for (const [ammoId, totalRounds] of Object.entries(ammoTotals)) {
                await decrementAmmoStock(ammoId, totalRounds, 'target_shooting', recordId);
              }
            } else if (freshRecord.category === 'clay_shooting' && freshRecord.ammunition_id) {
              await decrementAmmoStock(freshRecord.ammunition_id, parseInt(freshRecord.rounds_fired), 'clay_shooting', recordId);
            } else if (freshRecord.category === 'deer_management' && freshRecord.ammunition_id) {
              await decrementAmmoStock(freshRecord.ammunition_id, parseInt(freshRecord.total_count), 'deer_management', recordId);
            }
            
          } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
            alert('⚠️ Delete failed and rollback encountered an error. Contact support.');
            return;
          }
        }

        alert('Error deleting record: ' + updateErr.message);
        return;
      }

      // Delete succeeded — update local state
      setRecords(records.filter((r) => r.id !== recordId));

      // Notify parent to refresh analytics + dashboard
      if (onRecordDeleted) onRecordDeleted();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record: ' + error.message);
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
               {showTargetAnalysis && category === 'target_shooting' && (
                 <button
                   onClick={() => handlePdfPreview(record)}
                   disabled={generatingPdf === record.id}
                   className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-50"
                   title="PDF Preview"
                 >
                   {generatingPdf === record.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                 </button>
               )}
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

      {/* Full Session Report Modal */}
       {viewingRecord && createPortal(
         <SessionReportModal 
           record={viewingRecord} 
           onClose={() => setViewingRecord(null)} 
           rifles={rifles}
           shotguns={shotguns}
           clubs={clubs}
           locations={locations}
           category={category}
           showTargetAnalysis={showTargetAnalysis}
         />,
         document.body
       )}

       {/* PDF Preview Modal */}
       {previewingPdf && createPortal(
         <PdfPreviewModal 
           pdfUrl={previewingPdf.url}
           onClose={() => { setPreviewingPdf(null); URL.revokeObjectURL(previewingPdf.url); }}
           record={previewingPdf.record}
         />,
         document.body
       )}
    </div>
  );
}

function SessionReportModal({ record, onClose, rifles, shotguns, clubs, locations, category, showTargetAnalysis = false }) {
   const [currentRecord, setCurrentRecord] = useState(record);
   const [targetGroups, setTargetGroups] = useState([]);
   const [loadingGroups, setLoadingGroups] = useState(false);
   useBodyScrollLock(true);

   useEffect(() => {
      const refreshRecord = async () => {
        try {
          const updatedRecord = await base44.entities.SessionRecord.get(record.id);
          setCurrentRecord(updatedRecord);

          // Load target groups if target analysis should be shown
          if (showTargetAnalysis && category === 'target_shooting') {
            setLoadingGroups(true);
            const groups = await base44.entities.TargetGroup.filter({ session_id: record.id });
            setTargetGroups(groups.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
            console.log(`[TARGET ANALYSIS LINK DEBUG] activeSessionId = ${record.id}`);
            console.log(`[TARGET ANALYSIS LINK DEBUG] analysesFound = ${groups.length}`);
            setLoadingGroups(false);
          }
        } catch (error) {
          console.error('Error refreshing record:', error);
        }
      };
      refreshRecord();
    }, [record.id, showTargetAnalysis, category]);

   const getRifleName = (rifleId) => rifles[rifleId]?.name || 'Unknown Rifle';
   const getRifleDetails = (rifleId) => rifles[rifleId];
   const getShotgunName = (shotgunId) => shotguns[shotgunId]?.name || 'Unknown Shotgun';
   const getShotgunDetails = (shotgunId) => shotguns[shotgunId];
   const getClubName = (clubId) => clubs[clubId]?.name || 'Unknown Club';
   const getLocationName = (locationId) => locations[locationId]?.name || 'Unknown Location';

   return (
     <div className="fixed inset-0 bg-black/50 z-[50001] flex items-end sm:items-center justify-center p-4 sm:p-0" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
       <div className="bg-card rounded-t-3xl sm:rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh] sm:max-h-[90vh]" style={{ maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0 sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Session Report</h2>
            <p className="text-muted-foreground text-xs mt-1">Detailed Activity Record</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded flex-shrink-0 ml-3">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>

        {/* Basic Session Info - 2 col on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <label className="font-bold text-xs text-primary uppercase">Session Date</label>
            <p className="text-base sm:text-lg">{format(new Date(currentRecord.date), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <label className="font-bold text-xs text-primary uppercase">Session Type</label>
            <p className="text-base sm:text-lg">{category === 'target_shooting' ? 'Target Shooting' : category === 'clay_shooting' ? 'Clay Shooting' : 'Deer Management'}</p>
          </div>
          <div>
            <label className="font-bold text-xs text-primary uppercase">Check-In</label>
            <p className="text-base sm:text-lg">{category === 'deer_management' ? currentRecord.start_time : currentRecord.checkin_time}</p>
          </div>
          <div>
            <label className="font-bold text-xs text-primary uppercase">Check-Out</label>
            <p className="text-base sm:text-lg">{currentRecord.end_time || currentRecord.checkout_time || 'N/A'}</p>
          </div>
          {category === 'target_shooting' && (
            <div>
              <label className="font-bold text-xs text-primary uppercase">Club / Range</label>
              <p className="text-base sm:text-lg">{currentRecord.club_name || (currentRecord.club_id && clubs[currentRecord.club_id]?.name) || currentRecord.location_name || 'Not recorded'}</p>
            </div>
          )}
        </div>

        {/* Target Shooting Section */}
        {category === 'target_shooting' && (
          <>
            {(currentRecord.club_id && clubs[currentRecord.club_id]) && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Venue Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="font-semibold text-base">{clubs[currentRecord.club_id].name}</p>
                  <p className="text-sm text-muted-foreground mt-2">{clubs[currentRecord.club_id].location}</p>
                  {clubs[currentRecord.club_id].notes && (
                    <p className="text-sm mt-2">{clubs[currentRecord.club_id].notes}</p>
                  )}
                </div>
              </div>
            )}

            {(currentRecord.rifles_used && currentRecord.rifles_used.length > 0) || currentRecord.rifle_id ? (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-4 text-primary">Firearms & Ammunition</h3>
                <div className="space-y-4">
                  {currentRecord.rifles_used && currentRecord.rifles_used.length > 0 ? (
                    currentRecord.rifles_used.map((rifleStat, idx) => {
                      const rifleData = getRifleDetails(rifleStat.rifle_id);
                      return (
                        <div key={idx} className="bg-secondary/30 p-4 rounded-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
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
                  ) : currentRecord.rifle_id ? (
                    <div className="bg-secondary/30 p-4 rounded-lg">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Firearm</label>
                        <p className="font-semibold text-base">{getRifleName(currentRecord.rifle_id)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* Clay Shooting Section */}
        {category === 'clay_shooting' && (
          <>
            {(currentRecord.club_id && clubs[currentRecord.club_id]) && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-base sm:text-lg mb-3 text-primary">Venue Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="font-semibold text-base">{getClubName(currentRecord.club_id)}</p>
                  {clubs[currentRecord.club_id]?.location && (
                    <p className="text-sm text-muted-foreground mt-1">{clubs[currentRecord.club_id].location}</p>
                  )}
                </div>
              </div>
            )}

            {currentRecord.shotgun_id && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-base sm:text-lg mb-3 text-primary">Shotgun Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  {getShotgunDetails(currentRecord.shotgun_id) && (
                    <>
                      <p className="font-semibold text-base">{getShotgunName(currentRecord.shotgun_id)}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Make</label>
                          <p className="text-sm">{getShotgunDetails(currentRecord.shotgun_id).make || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Model</label>
                          <p className="text-sm">{getShotgunDetails(currentRecord.shotgun_id).model || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Gauge</label>
                          <p className="text-sm">{getShotgunDetails(currentRecord.shotgun_id).gauge || '-'}</p>
                        </div>
                      </div>
                      {getShotgunDetails(currentRecord.shotgun_id).serial_number && (
                        <div className="mt-3">
                          <label className="text-xs font-bold text-muted-foreground">Serial Number</label>
                          <p className="font-mono text-sm">{getShotgunDetails(currentRecord.shotgun_id).serial_number}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6 pb-4 border-b border-border">
              <div className="mb-4">
                <label className="font-bold text-xs text-primary uppercase">Total Rounds Fired</label>
                <p className="text-base sm:text-lg">{currentRecord.rounds_fired || '0'} rounds</p>
              </div>
              {currentRecord.ammunition_used && (
                <div className="bg-blue-50/30 p-3 rounded border border-blue-200/50">
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Ammunition Used</label>
                  <p className="text-sm font-medium">{currentRecord.ammunition_used}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Deer Management Section */}
        {category === 'deer_management' && (
          <>
            <div className="mb-6 pb-4 border-b border-border">
              <h3 className="font-bold text-lg mb-3 text-primary">Location & Hunting Details</h3>
              <div className="bg-secondary/30 p-4 rounded-lg">
                <p className="font-semibold text-base">{locations[currentRecord.location_id]?.name || currentRecord.location_name || 'N/A'}</p>
                {locations[currentRecord.location_id]?.location_address && (
                 <p className="text-sm text-muted-foreground mt-2">{locations[currentRecord.location_id].location_address}</p>
                )}
              </div>
            </div>

            <div className="mb-6 pb-4 border-b border-border">
              {currentRecord.total_count && currentRecord.total_count !== '0' ? (
                <>
                  <h3 className="font-bold text-base sm:text-lg mb-3 text-primary">Species Harvested</h3>
                  {currentRecord.species_list && currentRecord.species_list.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {currentRecord.species_list.map((s, idx) => (
                        <div key={idx} className="bg-secondary/30 p-3 rounded-lg flex justify-between items-center">
                          <span className="font-medium text-sm">{s.species}</span>
                          <span className="font-semibold text-base">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="bg-primary/10 p-4 rounded-lg mb-4">
                    <label className="text-xs font-bold text-primary uppercase">Total Shots Fired</label>
                    <p className="text-lg sm:text-xl font-semibold mt-1">{currentRecord.total_count}</p>
                  </div>
                  {currentRecord.ammunition_used && (
                    <div className="bg-blue-50/30 p-3 rounded border border-blue-200/50">
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Ammunition Used</label>
                      <p className="text-sm font-medium">{currentRecord.ammunition_used}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-blue-50/30 p-4 rounded-lg border border-blue-200/50">
                  <p className="text-base font-semibold text-blue-600">No shots fired during this session</p>
                </div>
              )}
            </div>

            {currentRecord.total_count && currentRecord.total_count !== '0' && currentRecord.rifle_id && rifles[currentRecord.rifle_id] && (
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-bold text-lg mb-3 text-primary">Rifle & Ammunition Details</h3>
                <div className="bg-secondary/30 p-4 rounded-lg space-y-4">
                  <div>
                    <p className="font-semibold text-base mb-3">{getRifleName(currentRecord.rifle_id)}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Make</label>
                        <p className="text-sm">{rifles[currentRecord.rifle_id]?.make || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Model</label>
                        <p className="text-sm">{rifles[currentRecord.rifle_id]?.model || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Caliber</label>
                        <p className="text-sm">{rifles[currentRecord.rifle_id]?.caliber || '-'}</p>
                      </div>
                    </div>
                    {rifles[currentRecord.rifle_id]?.serial_number && (
                      <div className="mt-3">
                        <label className="text-xs font-bold text-muted-foreground">Serial Number</label>
                        <p className="font-mono text-sm">{rifles[currentRecord.rifle_id].serial_number}</p>
                      </div>
                    )}
                  </div>
                  {currentRecord.ammunition_used && (
                    <div className="border-t border-border pt-3">
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Ammunition</label>
                      <p className="text-sm font-medium">{currentRecord.ammunition_used}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Target Analysis Section — ONLY in Recent Sessions view, not Records page */}
        {showTargetAnalysis && category === 'target_shooting' && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-4 text-primary">Target Analysis</h3>
            {loadingGroups ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : targetGroups.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No target analysis added
              </div>
            ) : (
              <div className="space-y-4">
                {targetGroups.map((group, idx) => (
                  <div key={group.id} className="bg-secondary/30 p-4 rounded-lg border border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Group {idx + 1}</label>
                        <p className="font-semibold text-base">{group.group_name || `Group ${idx + 1}`}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase">Shots</label>
                        <p className="font-semibold text-base">{group.number_of_shots || '—'}</p>
                      </div>
                      {group.distance_override && (
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Distance</label>
                          <p className="font-semibold text-base">{group.distance_override}m</p>
                        </div>
                      )}
                      {group.group_size_moa && (
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Group Size (MOA)</label>
                          <p className="font-semibold text-base">{group.group_size_moa.toFixed(2)}</p>
                        </div>
                      )}
                      {group.group_size_mm && (
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Group Size (mm)</label>
                          <p className="font-semibold text-base">{group.group_size_mm}</p>
                        </div>
                      )}
                      {group.group_size_mrad && (
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Group Size (MRAD)</label>
                          <p className="font-semibold text-base">{group.group_size_mrad.toFixed(3)}</p>
                        </div>
                      )}
                    </div>

                    {(group.point_of_impact_x || group.point_of_impact_y) && (
                      <div className="mb-3 pb-3 border-b border-border">
                        <label className="text-xs font-bold text-muted-foreground uppercase">POI (Point of Impact)</label>
                        <p className="text-sm">
                          {group.point_of_impact_x ? `X: ${group.point_of_impact_x.toFixed(1)}mm ` : ''}
                          {group.point_of_impact_y ? `Y: ${group.point_of_impact_y.toFixed(1)}mm` : ''}
                        </p>
                      </div>
                    )}

                    {(group.clicks_up_down || group.clicks_left_right || group.click_value) && (
                      <div className="mb-3 pb-3 border-b border-border">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Turret Clicks</label>
                        <p className="text-sm">
                          {group.clicks_up_down ? `Elevation: ${group.clicks_up_down} ` : ''}
                          {group.clicks_left_right ? `Windage: ${group.clicks_left_right} ` : ''}
                          {group.click_value ? `(${group.click_value})` : ''}
                        </p>
                      </div>
                    )}

                    {(group.photo_url || group.marked_photo_url || group.ai_marked_photo_url) && (
                      <div className="mb-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Target Photos</label>
                        <div className="flex gap-2 flex-wrap">
                          {group.marked_photo_url && (
                            <button 
                              onClick={() => window.open(group.marked_photo_url, '_blank')}
                              className="relative group"
                              title="Click to open full size"
                            >
                              <img src={group.marked_photo_url} alt="marked target" className="h-24 w-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-lg transition-all">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
                              </div>
                            </button>
                          )}
                          {group.ai_marked_photo_url && (
                            <button 
                              onClick={() => window.open(group.ai_marked_photo_url, '_blank')}
                              className="relative group"
                              title="Click to open full size"
                            >
                              <img src={group.ai_marked_photo_url} alt="ai analysis" className="h-24 w-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-lg transition-all">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
                              </div>
                            </button>
                          )}
                          {group.photo_url && !group.marked_photo_url && !group.ai_marked_photo_url && (
                            <button 
                              onClick={() => window.open(group.photo_url, '_blank')}
                              className="relative group"
                              title="Click to open full size"
                            >
                              <img src={group.photo_url} alt="target" className="h-24 w-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-lg transition-all">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {group.notes && (
                      <div className="bg-secondary/20 p-2 rounded text-sm">
                        <label className="text-xs font-bold text-muted-foreground block mb-1">Notes</label>
                        <p>{group.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        {currentRecord.notes && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-base sm:text-lg mb-2 text-primary">Session Notes</h3>
            <div className="bg-secondary/20 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{currentRecord.notes}</p>
            </div>
          </div>
        )}

        {/* Photos Section — Bottom */}
        {currentRecord.photos && currentRecord.photos.length > 0 && (
          <div className="mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg mb-3">Photos</h3>
            <div className="grid grid-cols-4 gap-2">
              {currentRecord.photos.map((photo, idx) => {
                const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                if (!photoUrl) return null;
                return <img key={idx} src={photoUrl} alt="record" className="h-28 w-28 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(photoUrl, '_blank')} />;
              })}
            </div>
          </div>
        )}

          {/* Footer with record info */}
          <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg text-center mt-6">
            <p>Record ID: {currentRecord.id}</p>
            <p>Created: {format(new Date(currentRecord.created_date), 'PPpp')}</p>
          </div>
          </div>

          {/* Action Button - Sticky */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-t border-border bg-card sticky bottom-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 font-semibold transition-all active:scale-95 text-sm sm:text-base"
          >
            Close Report
          </button>
          </div>
      </div>
      </div>
      );
      }

      function PdfPreviewModal({ pdfUrl, onClose, record }) {
        useBodyScrollLock(true);

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[50001]" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-slate-200/70 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
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
                <iframe src={pdfUrl} className="w-full h-full border-0" />
              </div>
              <div className="p-4 border-t border-slate-200/70 dark:border-slate-700 flex justify-end gap-2">
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