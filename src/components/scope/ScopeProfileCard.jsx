import { Eye, Edit2, Trash2, Copy, Target, Crosshair } from 'lucide-react';

const SETUP_BADGE = {
  main_hunting: { label: 'Main Hunting', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  target_shooting: { label: 'Target Setup', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  standard: null,
};

export default function ScopeProfileCard({ profile, rifle, onView, onEdit, onDelete, onDuplicate }) {
  const badge = SETUP_BADGE[profile.setup_type];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-base truncate">{profile.scope_brand} {profile.scope_model}</span>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
            )}
          </div>

          {/* Quick info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-2">
            <span>🔫 {rifle?.name || profile.rifle_name || '—'}</span>
            <span>🎯 Zero: {profile.zero_distance || '—'}</span>
            <span>📏 {profile.caliber || '—'}</span>
            <span>🔩 {profile.turret_type} · {profile.click_value || '—'}</span>
            {profile.bullet_brand && <span>💊 {profile.bullet_brand} {profile.bullet_weight}</span>}
            {profile.reticle_type && <span>⊕ {profile.reticle_type}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onView} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-lg text-xs font-semibold hover:bg-secondary/80">
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button onClick={onDuplicate} className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-lg text-xs font-semibold hover:bg-secondary/80">
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-semibold">
            <Trash2 className="w-3.5 h-3.5" />
            Del
          </button>
        </div>
      </div>
    </div>
  );
}