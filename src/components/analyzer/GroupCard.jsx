import { Edit2, Trash2, ScanLine, Star } from 'lucide-react';

export default function GroupCard({ group, session, isBest, onEdit, onDelete, onSaveToScope, onMarkBest }) {
  const hasCorrection = group.clicks_up_down || group.clicks_left_right;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${isBest ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{group.group_name}</span>
            {isBest && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">⭐ Best</span>}
            {group.confirmed_zero && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">✓ Zero</span>}
          </div>
          {group.number_of_shots > 0 && <p className="text-xs text-muted-foreground mt-0.5">{group.number_of_shots} shots · {group.entry_type === 'photo' ? '📸 Photo' : '✏️ Manual'}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={onMarkBest} title="Mark as best group" className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <Star className={`w-4 h-4 ${isBest ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={onSaveToScope} title="Save to Scope Click Card" className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <ScanLine className="w-4 h-4 text-muted-foreground" />
          </button>
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

      {/* Photo */}
      {(group.marked_photo_url || group.photo_url) && (
        <a href={group.marked_photo_url || group.photo_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={group.marked_photo_url || group.photo_url} className="w-full max-h-48 object-cover rounded-xl border border-border" alt="Target" />
        </a>
      )}

      {group.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">{group.notes}</p>}
    </div>
  );
}