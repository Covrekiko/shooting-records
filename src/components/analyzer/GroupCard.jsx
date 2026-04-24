import { Edit2, Trash2, ScanLine, Star, Copy, Image } from 'lucide-react';

export default function GroupCard({ group, session, isBest, onEdit, onDelete, onDuplicate, onSaveToScope, onMarkBest }) {
  const hasCorrection = group.clicks_up_down || group.clicks_left_right;
  const isConfirmed = group.confirmed || group.confirmed_zero;
  const displayDistance = group.distance_override ? `${group.distance_override}m` : (session.distance ? `${session.distance}m` : null);
  const displayAmmo = group.ammo_override || session.ammo_name || null;
  const displayPosition = group.shooting_position || session.shooting_position || null;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${isBest ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{group.group_name}</span>
            {isBest && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">⭐ Best</span>}
            {isConfirmed && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">✓ Zero</span>}
          </div>
          <div className="flex flex-wrap gap-x-2 mt-0.5">
            {group.number_of_shots > 0 && <p className="text-xs text-muted-foreground">{group.number_of_shots} shots</p>}
            {displayDistance && <p className="text-xs text-muted-foreground">{displayDistance}</p>}
            {displayAmmo && <p className="text-xs text-muted-foreground">{displayAmmo}</p>}
            {displayPosition && <p className="text-xs text-muted-foreground capitalize">{displayPosition.replace('_', ' ')}</p>}
            <p className="text-xs text-muted-foreground">{group.entry_method === 'photo' ? '📸 Photo' : '✏️ Manual'}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onMarkBest} title="Mark as best group" className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <Star className={`w-4 h-4 ${isBest ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={onSaveToScope} title="Save to Scope Click Card" className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <ScanLine className="w-4 h-4 text-muted-foreground" />
          </button>
          {onDuplicate && (
            <button onClick={onDuplicate} title="Duplicate group" className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {(group.marked_photo_url || group.photo_url) && (
            <a href={group.marked_photo_url || group.photo_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="View photo">
              <Image className="w-4 h-4 text-muted-foreground" />
            </a>
          )}
          <button onClick={onEdit} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex flex-wrap gap-3 mb-3">
        {group.group_size_moa > 0 && (
          <div className="bg-background rounded-xl px-3 py-2 text-center min-w-[70px]">
            <p className="text-lg font-black">{group.group_size_moa?.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">MOA</p>
          </div>
        )}
        {group.group_size_mrad > 0 && (
          <div className="bg-background rounded-xl px-3 py-2 text-center min-w-[70px]">
            <p className="text-lg font-black">{group.group_size_mrad?.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">MRAD</p>
          </div>
        )}
        {group.group_size_mm > 0 && (
          <div className="bg-background rounded-xl px-3 py-2 text-center min-w-[70px]">
            <p className="text-lg font-black">{group.group_size_mm}</p>
            <p className="text-xs text-muted-foreground">mm</p>
          </div>
        )}
        {group.group_size_inches > 0 && (
          <div className="bg-background rounded-xl px-3 py-2 text-center min-w-[70px]">
            <p className="text-lg font-black">{group.group_size_inches}"</p>
            <p className="text-xs text-muted-foreground">inches</p>
          </div>
        )}
      </div>

      {/* Correction */}
      {hasCorrection && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
          Correction:
          {group.clicks_up_down > 0 && ` ↑ ${group.clicks_up_down} up`}
          {group.clicks_up_down < 0 && ` ↓ ${Math.abs(group.clicks_up_down)} down`}
          {group.clicks_left_right > 0 && ` → ${group.clicks_left_right} right`}
          {group.clicks_left_right < 0 && ` ← ${Math.abs(group.clicks_left_right)} left`}
          {' '}clicks
        </div>
      )}



      {group.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">{group.notes}</p>}
    </div>
  );
}