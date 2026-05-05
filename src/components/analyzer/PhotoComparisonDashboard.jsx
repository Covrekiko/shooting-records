import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Image, Target, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const selectClass = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';

function getSessionLabel(session) {
  const date = session?.date ? format(new Date(session.date), 'd MMM yyyy') : 'Unknown date';
  const range = session?.range_name || session?.location_name || 'No range';
  return `${date} · ${range}`;
}

export default function PhotoComparisonDashboard({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caliber, setCaliber] = useState('');
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [targetSessions, records, targetGroups] = await Promise.all([
      base44.entities.TargetSession.filter({ created_by: user.email }),
      base44.entities.SessionRecord.filter({ created_by: user.email, category: 'target_shooting' }),
      base44.entities.TargetGroup.list(),
    ]);
    setSessions(targetSessions || []);
    setSessionRecords(records || []);
    setGroups(targetGroups || []);
    setLoading(false);
  };

  const comparableGroups = useMemo(() => {
    const targetSessionMap = new Map(sessions.map((session) => [session.id, session]));
    const recordMap = new Map(sessionRecords.map((record) => [record.id, record]));

    return groups
      .filter((group) => group.photo_url || group.marked_photo_url || group.ai_marked_photo_url)
      .map((group) => {
        const targetSession = targetSessionMap.get(group.session_id);
        const record = recordMap.get(group.session_id);
        const rifleEntry = record?.rifles_used?.find((entry) => !group.rifle_id || entry.rifle_id === group.rifle_id) || record?.rifles_used?.[0];
        const sessionCaliber = targetSession?.caliber || rifleEntry?.caliber || '';
        return {
          ...group,
          session: targetSession || record || {},
          sessionCaliber,
          sessionDate: targetSession?.date || record?.date || group.created_date,
          displayPhoto: group.marked_photo_url || group.ai_marked_photo_url || group.photo_url,
        };
      })
      .filter((group) => !caliber || group.sessionCaliber === caliber)
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
  }, [groups, sessions, sessionRecords, caliber]);

  const calibers = useMemo(() => {
    return [...new Set(comparableGroups.map((group) => group.sessionCaliber).filter(Boolean))].sort();
  }, [comparableGroups]);

  useEffect(() => {
    if (!leftId && comparableGroups[0]) setLeftId(comparableGroups[0].id);
    if (!rightId && comparableGroups[1]) setRightId(comparableGroups[1].id);
  }, [comparableGroups, leftId, rightId]);

  const left = comparableGroups.find((group) => group.id === leftId);
  const right = comparableGroups.find((group) => group.id === rightId);
  const improvement = left?.group_size_moa && right?.group_size_moa ? left.group_size_moa - right.group_size_moa : null;

  if (loading) {
    return <main className="max-w-5xl mx-auto px-4 py-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></main>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h2 className="text-xl font-bold">Target Photo Comparison</h2>
          <p className="text-xs text-muted-foreground">Compare target photos across sessions and calibers</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Caliber</label>
          <select value={caliber} onChange={(e) => { setCaliber(e.target.value); setLeftId(''); setRightId(''); }} className={selectClass}>
            <option value="">All calibers</option>
            {calibers.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Left photo</label>
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)} className={selectClass}>
            {comparableGroups.map((group) => <option key={group.id} value={group.id}>{getSessionLabel(group.session)} · {group.group_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Right photo</label>
          <select value={rightId} onChange={(e) => setRightId(e.target.value)} className={selectClass}>
            {comparableGroups.map((group) => <option key={group.id} value={group.id}>{getSessionLabel(group.session)} · {group.group_name}</option>)}
          </select>
        </div>
      </div>

      {comparableGroups.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No analyzed target photos yet</p>
          <p className="text-sm text-muted-foreground mt-1">Open a target session and use Analyze Photo to upload targets for comparison.</p>
        </div>
      ) : (
        <>
          {improvement !== null && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-primary" />
              <div>
                <p className="font-bold">{improvement > 0 ? `${improvement.toFixed(2)} MOA improvement` : `${Math.abs(improvement).toFixed(2)} MOA wider`}</p>
                <p className="text-xs text-muted-foreground">Lower MOA means tighter grouping.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[left, right].map((group, index) => (
              <div key={index} className="bg-card border border-border rounded-2xl overflow-hidden">
                {group ? (
                  <>
                    <div className="p-4 border-b border-border">
                      <p className="font-bold">{group.group_name || `Group ${index + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{getSessionLabel(group.session)} {group.sessionCaliber ? `· ${group.sessionCaliber}` : ''}</p>
                    </div>
                    <div className="bg-black flex items-center justify-center min-h-80">
                      <img src={group.displayPhoto} alt={group.group_name || 'Target photo'} className="w-full h-full max-h-[520px] object-contain" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-4 text-center">
                      <div className="bg-secondary/50 rounded-xl p-3"><p className="font-black">{group.group_size_moa?.toFixed?.(2) || '—'}</p><p className="text-xs text-muted-foreground">MOA</p></div>
                      <div className="bg-secondary/50 rounded-xl p-3"><p className="font-black">{group.group_size_mm || '—'}</p><p className="text-xs text-muted-foreground">mm</p></div>
                      <div className="bg-secondary/50 rounded-xl p-3"><p className="font-black">{group.number_of_shots || '—'}</p><p className="text-xs text-muted-foreground">shots</p></div>
                    </div>
                  </>
                ) : (
                  <div className="p-10 text-center text-muted-foreground"><Target className="w-8 h-8 mx-auto mb-2" />Select a target photo</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}