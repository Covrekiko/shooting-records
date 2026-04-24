import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Download, Edit2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import DistanceDataForm from '@/components/scope/DistanceDataForm';
import DistanceTable from '@/components/scope/DistanceTable';
import { exportScopeClickCardPDF } from '@/utils/scopePdfExport';

export default function ScopeDetailView({ profile, rifle, onClose, onEdit }) {
  const [distanceData, setDistanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  useEffect(() => {
    loadDistanceData();
  }, [profile.id]);

  const loadDistanceData = async () => {
    setLoading(true);
    const data = await base44.entities.ScopeDistanceData.filter({ scope_profile_id: profile.id });
    setDistanceData(data.sort((a, b) => a.distance - b.distance));
    setLoading(false);
  };

  const handleSaveDistance = async (data) => {
    if (editingRow) {
      await base44.entities.ScopeDistanceData.update(editingRow.id, data);
    } else {
      await base44.entities.ScopeDistanceData.create({ ...data, scope_profile_id: profile.id });
    }
    setShowAddForm(false);
    setEditingRow(null);
    loadDistanceData();
  };

  const handleDeleteDistance = async (id) => {
    if (!confirm('Delete this distance entry?')) return;
    await base44.entities.ScopeDistanceData.delete(id);
    loadDistanceData();
  };

  const SETUP_LABEL = {
    main_hunting: '🟢 Main Hunting Setup',
    target_shooting: '🎯 Target Shooting Setup',
    standard: '',
  };

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/70 flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col bg-background mt-4 rounded-t-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{profile.scope_brand} {profile.scope_model}</h2>
              {profile.setup_type !== 'standard' && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {SETUP_LABEL[profile.setup_type]}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{rifle?.name || profile.rifle_name} · {profile.caliber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 hover:bg-secondary rounded-lg" title="Edit profile">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => exportScopeClickCardPDF(profile, rifle, distanceData)}
              className="p-2 hover:bg-secondary rounded-lg" title="Download PDF">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-5 py-3 bg-secondary/30 border-b border-border flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><p className="text-muted-foreground font-medium">Turret / Click</p><p className="font-bold">{profile.turret_type} · {profile.click_value}</p></div>
            <div><p className="text-muted-foreground font-medium">Zero</p><p className="font-bold">{profile.zero_distance || '—'}</p></div>
            <div><p className="text-muted-foreground font-medium">Zero Ammo</p><p className="font-bold">{profile.zero_ammo || '—'}</p></div>
            <div><p className="text-muted-foreground font-medium">Bullet</p><p className="font-bold">{profile.bullet_brand || '—'} {profile.bullet_weight}</p></div>
            {profile.reticle_type && <div><p className="text-muted-foreground font-medium">Reticle</p><p className="font-bold">{profile.reticle_type}</p></div>}
          </div>
          {profile.notes && <p className="mt-2 text-xs text-muted-foreground italic">"{profile.notes}"</p>}
          {profile.photos?.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {profile.photos.map((url, i) => (
                <img key={i} src={url} className="h-14 w-14 object-cover rounded-lg border border-border flex-shrink-0" alt="" />
              ))}
            </div>
          )}
        </div>

        {/* Distance Table */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Distance Click Table</h3>
            <button onClick={() => { setEditingRow(null); setShowAddForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90">
              <Plus className="w-3.5 h-3.5" />
              Add Distance
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : distanceData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <p className="text-3xl mb-2">📐</p>
              <p>No distance data yet. Add your first entry.</p>
            </div>
          ) : (
            <DistanceTable
              data={distanceData}
              turretType={profile.turret_type}
              onEdit={(row) => { setEditingRow(row); setShowAddForm(true); }}
              onDelete={handleDeleteDistance}
            />
          )}
        </div>
      </div>

      {/* Distance Form Modal */}
      {showAddForm && createPortal(
        <div className="fixed inset-0 z-[70000] bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md" style={{ maxHeight: '90dvh' }}>
            <DistanceDataForm
              row={editingRow}
              turretType={profile.turret_type}
              onSave={handleSaveDistance}
              onClose={() => { setShowAddForm(false); setEditingRow(null); }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}