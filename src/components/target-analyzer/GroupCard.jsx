import { Star, Trash2, Crosshair, CheckCircle, Eye } from 'lucide-react';
import { useState } from 'react';
import GroupDetailView from '@/components/analyzer/GroupDetailView';

function formatClicks(val, dir) {
  if (!val || val === 0) return null;
  const abs = Math.abs(val).toFixed(1);
  const label = val > 0 ? dir[0] : dir[1];
  return `${abs} ${label}`;
}

export default function GroupCard({ group, session, onDelete, onMarkBest, onSaveToScopeCard, allGroups }) {
  const [showDetail, setShowDetail] = useState(false);
  const elevClicks = formatClicks(group.clicks_up_down, ['Up', 'Down']);
  const windClicks = formatClicks(group.clicks_left_right, ['Right', 'Left']);

  return (
    <div className={`bg-card rounded-2xl border p-4 space-y-3 ${group.best_group ? 'border-primary' : 'border-border'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base">{group.group_name}</h3>
          {group.best_group && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
          {group.confirmed && <CheckCircle className="w-4 h-4 text-green-500" />}
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{group.entry_method}</span>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={() => setShowDetail(true)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="View details">
              <Eye className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="text-destructive/60 hover:text-destructive p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {group.group_size_mm && (
          <div className="bg-secondary rounded-xl p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Group</p>
            <p className="font-bold text-sm">{group.group_size_mm}mm</p>
          </div>
        )}
        {group.group_size_moa && (
          <div className="bg-secondary rounded-xl p-2.5 text-center">
            <p className="text-xs text-muted-foreground">MOA</p>
            <p className="font-bold text-sm">{group.group_size_moa.toFixed(2)}</p>
          </div>
        )}
        {group.group_size_mrad && (
          <div className="bg-secondary rounded-xl p-2.5 text-center">
            <p className="text-xs text-muted-foreground">MRAD</p>
            <p className="font-bold text-sm">{group.group_size_mrad.toFixed(3)}</p>
          </div>
        )}
        {group.number_of_shots && (
          <div className="bg-secondary rounded-xl p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Shots</p>
            <p className="font-bold text-sm">{group.number_of_shots}</p>
          </div>
        )}
      </div>

      {/* Corrections */}
      {(elevClicks || windClicks) && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-primary mb-1">Scope Corrections</p>
          <div className="flex gap-4 text-sm">
            {elevClicks && <span>↕ {elevClicks} clicks</span>}
            {windClicks && <span>↔ {windClicks} clicks</span>}
          </div>
        </div>
      )}

      {group.photo_url && (
        <img src={group.photo_url} className="w-full h-48 object-cover rounded-xl" />
      )}

      {group.notes && <p className="text-sm text-muted-foreground">{group.notes}</p>}

      {showDetail && (
        <GroupDetailView
          group={group}
          session={session}
          allGroups={allGroups || [group]}
          onExportAll={true}
          onClose={() => setShowDetail(false)}
        />
      )}

      <div className="flex gap-2">
        <button onClick={onMarkBest}
          className="flex-1 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-1">
          <Star className="w-3.5 h-3.5" />Best Group
        </button>
        <button onClick={onSaveToScopeCard}
          className="flex-1 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-1">
          <Crosshair className="w-3.5 h-3.5" />→ Click Card
        </button>
      </div>
    </div>
  );
}