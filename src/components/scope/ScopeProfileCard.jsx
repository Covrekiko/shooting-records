import { Eye, Pencil, Trash2, Copy, Target, Crosshair, CircleDot, Package, SlidersHorizontal, Focus, BadgeCheck } from 'lucide-react';

const SETUP_BADGE = {
  main_hunting: { label: 'Main Hunting', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  target_shooting: { label: 'Target Setup', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  standard: null,
};

export default function ScopeProfileCard({ profile, rifle, onView, onEdit, onDelete, onDuplicate }) {
  const badge = SETUP_BADGE[profile.setup_type];

  const rifleName = rifle?.name || profile.rifle_name || '—';
  const ammunition = profile.bullet_brand ? `${profile.bullet_brand} ${profile.bullet_weight || ''}`.trim() : '—';

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xs font-semibold text-slate-800 truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <h3 className="font-bold text-base text-slate-900 leading-tight min-w-0">
              {profile.scope_brand} {profile.scope_model}
            </h3>
            {badge && (
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>
                <BadgeCheck className="w-3 h-3" />
                {badge.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-2.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rifle Setup</p>
              <InfoRow icon={Crosshair} label="Rifle" value={rifleName} />
              <InfoRow icon={CircleDot} label="Calibre" value={profile.caliber || '—'} />
              <InfoRow icon={Package} label="Ammunition" value={ammunition} />
            </section>

            <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-2.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zero & Optics</p>
              <InfoRow icon={Target} label="Zero Distance" value={profile.zero_distance || '—'} />
              <InfoRow icon={SlidersHorizontal} label="Click Value" value={`${profile.turret_type || '—'} · ${profile.click_value || '—'}`} />
              <InfoRow icon={Focus} label="Reticle" value={profile.reticle_type || '—'} />
            </section>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 lg:grid-cols-1 gap-1.5 lg:w-24 flex-shrink-0">
          <button onClick={onView} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline lg:inline">View</span>
          </button>
          <button onClick={onEdit} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline lg:inline">Edit</span>
          </button>
          <button onClick={onDuplicate} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline lg:inline">Copy</span>
          </button>
          <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-bold transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline lg:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}