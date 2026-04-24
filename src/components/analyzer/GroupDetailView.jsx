import { X, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { exportSessionPDF } from '@/utils/analyzerPdfExport';

export default function GroupDetailView({ group, session, onClose, onExportAll, allGroups }) {
  const hasCorrection = group.clicks_up_down || group.clicks_left_right;

  const Row = ({ label, value }) => value != null && value !== '' ? (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
    </div>
  ) : null;

  return createPortal(
    <div className="fixed inset-0 z-[70000] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold">{group.group_name}</h2>
            <p className="text-xs text-muted-foreground">
              {group.entry_method === 'photo' ? '📸 Photo analysis' : '✏️ Manual entry'}
              {group.confirmed ? ' · ✓ Confirmed Zero' : ''}
              {group.best_group ? ' · ⭐ Best Group' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onExportAll && (
              <button
                onClick={() => exportSessionPDF(session, allGroups, null)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors"
                title="Download session PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 pb-8">
          {/* Group Size Metrics */}
          {(group.group_size_moa > 0 || group.group_size_mm > 0 || group.group_size_inches > 0) && (
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Group Size</p>
              <div className="grid grid-cols-2 gap-2">
                {group.group_size_mm > 0 && (
                  <div className="bg-primary/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-primary">{group.group_size_mm}mm</p>
                    <p className="text-xs text-muted-foreground">mm</p>
                  </div>
                )}
                {group.group_size_inches > 0 && (
                  <div className="bg-primary/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-primary">{group.group_size_inches}"</p>
                    <p className="text-xs text-muted-foreground">inches</p>
                  </div>
                )}
                {group.group_size_moa > 0 && (
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{group.group_size_moa?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">MOA</p>
                  </div>
                )}
                {group.group_size_mrad > 0 && (
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{group.group_size_mrad?.toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground">MRAD</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scope Correction */}
          {hasCorrection && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Scope Correction</p>
              <p className="text-base font-bold text-amber-800 dark:text-amber-300">
                {group.clicks_up_down > 0 && `↑ ${group.clicks_up_down} up`}
                {group.clicks_up_down < 0 && `↓ ${Math.abs(group.clicks_up_down)} down`}
                {group.clicks_up_down && group.clicks_left_right ? '  ' : ''}
                {group.clicks_left_right > 0 && `→ ${group.clicks_left_right} right`}
                {group.clicks_left_right < 0 && `← ${Math.abs(group.clicks_left_right)} left`}
                {' '}clicks
              </p>
              {group.click_value && <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Click value: {group.click_value}</p>}
            </div>
          )}

          {/* Details */}
          <div className="bg-card border border-border rounded-xl px-4 py-1">
            <Row label="Shots" value={group.number_of_shots || null} />
            <Row label="Rifle" value={group.rifle_name} />
            <Row label="Ammunition" value={group.ammo_override} />
            <Row label="Distance" value={group.distance_override ? `${group.distance_override}m` : (session?.distance ? `${session.distance}m` : null)} />
            <Row label="Position" value={group.shooting_position ? group.shooting_position.replace('_', ' ') : null} />
            <Row label="POI Horizontal" value={group.point_of_impact_x ? `${group.point_of_impact_x > 0 ? '+' : ''}${group.point_of_impact_x}mm (${group.point_of_impact_x > 0 ? 'right' : 'left'})` : null} />
            <Row label="POI Vertical" value={group.point_of_impact_y ? `${group.point_of_impact_y > 0 ? '+' : ''}${group.point_of_impact_y}mm (${group.point_of_impact_y > 0 ? 'high' : 'low'})` : null} />
          </div>

          {/* Notes */}
          {group.notes && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm">{group.notes}</p>
            </div>
          )}

          {/* Photo */}
          {(group.marked_photo_url || group.photo_url) && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Target Photo</p>
              <a href={group.marked_photo_url || group.photo_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={group.marked_photo_url || group.photo_url}
                  alt="Target"
                  className="w-full rounded-2xl border border-border object-contain max-h-72"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Tap to open full size</p>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}