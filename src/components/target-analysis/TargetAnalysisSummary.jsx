import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Target, Eye, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { exportSessionPDF } from '@/utils/analyzerPdfExport';
import GroupDetailView from '@/components/analyzer/GroupDetailView';

export default function TargetAnalysisSummary({ sessionRecordId, sessionRecord }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);

  useEffect(() => {
    if (!sessionRecordId) return;
    base44.entities.TargetGroup.filter({ session_id: sessionRecordId })
      .then(g => {
        setGroups(g || []);
        setLoading(false);
      });
  }, [sessionRecordId]);

  if (loading) return null;
  if (groups.length === 0) return null;

  const groupsWithMoa = groups.filter(g => g.group_size_moa > 0);
  const bestMoa = groupsWithMoa.length ? Math.min(...groupsWithMoa.map(g => g.group_size_moa)) : null;
  const avgMoa = groupsWithMoa.length
    ? groupsWithMoa.reduce((sum, g) => sum + g.group_size_moa, 0) / groupsWithMoa.length
    : null;
  const bestGroup = groups.find(g => g.group_size_moa === bestMoa);

  const session = sessionRecord || { id: sessionRecordId };

  return (
    <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Target Analysis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => exportSessionPDF(session, groups, null)}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            title="Download PDF"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            title={expanded ? 'Collapse' : 'View all groups'}
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Groups Recorded</span>
            <p className="font-semibold">{groups.length}</p>
          </div>
          {bestMoa && (
            <div>
              <span className="text-xs text-muted-foreground">Best Group</span>
              <p className="font-bold text-primary">{bestMoa.toFixed(2)} MOA</p>
            </div>
          )}
          {avgMoa && (
            <div>
              <span className="text-xs text-muted-foreground">Average MOA</span>
              <p className="font-semibold">{avgMoa.toFixed(2)} MOA</p>
            </div>
          )}
          {bestGroup?.group_size_mm && (
            <div>
              <span className="text-xs text-muted-foreground">Best Size</span>
              <p className="font-semibold">{bestGroup.group_size_mm}mm</p>
            </div>
          )}
          {(bestGroup?.clicks_up_down || bestGroup?.clicks_left_right) && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Best Group Correction</span>
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                {bestGroup.clicks_up_down > 0 && `↑ ${bestGroup.clicks_up_down} up `}
                {bestGroup.clicks_up_down < 0 && `↓ ${Math.abs(bestGroup.clicks_up_down)} down `}
                {bestGroup.clicks_left_right > 0 && `→ ${bestGroup.clicks_left_right} right`}
                {bestGroup.clicks_left_right < 0 && `← ${Math.abs(bestGroup.clicks_left_right)} left`}
                {' '}clicks
              </p>
            </div>
          )}
        </div>

        {/* All groups list — expanded */}
        {expanded && (
          <div className="border-t border-primary/10 pt-2 mt-2 space-y-1">
            {groups.map((g, i) => (
              <div key={g.id} className="flex items-center justify-between text-xs py-1 px-1 rounded-lg hover:bg-primary/5">
                <div>
                  <span className="font-semibold">{g.group_name || `Group ${i + 1}`}</span>
                  {g.rifle_name && <span className="text-muted-foreground ml-1.5">{g.rifle_name}</span>}
                  {g.ammo_override && <span className="text-muted-foreground ml-1.5">· {g.ammo_override}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {g.group_size_moa ? `${g.group_size_moa.toFixed(2)} MOA` : '—'}
                    {g.confirmed && ' ✓'}
                  </span>
                  <button
                    onClick={() => setViewingGroup(g)}
                    className="p-1 hover:bg-secondary rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingGroup && (
        <GroupDetailView
          group={viewingGroup}
          session={session}
          allGroups={groups}
          onExportAll={true}
          onClose={() => setViewingGroup(null)}
        />
      )}
    </div>
  );
}