import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPortal } from 'react-dom';
import { getRecordsPdfBlob } from '@/utils/recordsPdfExport';
import MobilePdfViewer from '@/components/MobilePdfViewer';
import RecordCard from '@/components/RecordCard';
import RecordDetailModal from '@/components/RecordDetailModal';

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
   const [clayScorecards, setClayScorecards] = useState({});
   const [clayStands, setClayStands] = useState({});
   const [clayShots, setClayShots] = useState({});

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

         if (category === 'clay_shooting' && recordsList.length > 0) {
           const scorecardLists = await Promise.all(recordsList.map(record => base44.entities.ClayScorecard.filter({ clay_session_id: record.id })));
           const scorecardMap = {};
           const standMap = {};
           const shotMap = {};
           await Promise.all(scorecardLists.flat().map(async (scorecard) => {
             scorecardMap[scorecard.clay_session_id] = scorecard;
             const stands = await base44.entities.ClayStand.filter({ clay_scorecard_id: scorecard.id });
             const sortedStands = stands.sort((a, b) => (a.stand_number || 0) - (b.stand_number || 0));
             standMap[scorecard.clay_session_id] = sortedStands;
             const shotLists = await Promise.all(sortedStands.map((stand) => base44.entities.ClayShot.filter({ clay_stand_id: stand.id })));
             shotMap[scorecard.clay_session_id] = sortedStands.reduce((acc, stand, index) => ({
               ...acc,
               [stand.id]: (shotLists[index] || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0)),
             }), {});
           }));
           setClayScorecards(scorecardMap);
           setClayStands(standMap);
           setClayShots(shotMap);
         }

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
      const blob = await getRecordsPdfBlob([record], null, rifles, clubs, shotguns, locations, targetGroups, {
        scorecards: clayScorecards,
        stands: clayStands,
        shots: clayShots,
      });
      const url = URL.createObjectURL(blob);
      setPreviewingPdf({ record, url });
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      alert('PDF export failed. Please try again.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDelete = async (recordId) => {
     if (!confirm('Delete this record? Ammunition and firearm counts will be restored.')) return;
    try {
      if (!navigator.onLine) {
        alert('This action requires internet connection to protect stock accuracy.');
        return;
      }
      if (!recordId) {
        alert('Error: Record ID is missing. Cannot delete.');
        return;
      }

      await base44.functions.invoke('deleteSessionRecordWithRefund', { sessionId: recordId });
      setRecords(records.filter((r) => r.id !== recordId));
      if (onRecordDeleted) onRecordDeleted();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record: ' + (error?.response?.data?.error || error.message));
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
        <RecordCard
          key={record.id}
          record={record}
          onView={setViewingRecord}
          onDelete={() => handleDelete(record.id)}
          onPdf={handlePdfPreview}
          generatingPdf={generatingPdf === record.id}
          rifles={rifles}
          shotguns={shotguns}
          clubs={clubs}
          locations={locations}
          clayScorecards={clayScorecards}
          clayStands={clayStands}
        />
      ))}

      {/* Full Session Report Modal */}
       {viewingRecord && createPortal(
         <RecordDetailModal
           record={{ ...viewingRecord, recordType: viewingRecord.recordType || (viewingRecord.category === 'target_shooting' ? 'target' : viewingRecord.category === 'clay_shooting' ? 'clay' : 'deer') }}
           onClose={() => setViewingRecord(null)}
           rifles={rifles}
           shotguns={shotguns}
           clubs={clubs}
           locations={locations}
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

function PdfPreviewModal({ pdfUrl, onClose }) {
        return <MobilePdfViewer pdfUrl={pdfUrl} onClose={onClose} />;
      }