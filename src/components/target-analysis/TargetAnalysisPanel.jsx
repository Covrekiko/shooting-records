import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Download, ScanLine } from 'lucide-react';
import GroupCard from '@/components/analyzer/GroupCard';
import ManualGroupForm from '@/components/analyzer/ManualGroupForm';
import TargetPhotoAnalyzer from '@/components/analyzer/TargetPhotoAnalyzer';
import { exportSessionPDF } from '@/utils/analyzerPdfExport';
import { createPortal } from 'react-dom';

// Build a session-like object from a SessionRecord + rifle entry for the analyzer components
function buildAnalyzerSession(sessionRecord, rifleEntry, rifles) {
  const rifle = rifles?.find(r => r.id === rifleEntry?.rifle_id);
  return {
    id: sessionRecord.id,
    date: sessionRecord.date,
    range_name: sessionRecord.location_name || '',
    rifle_id: rifleEntry?.rifle_id || '',
    rifle_name: rifle?.name || rifleEntry?.rifle_name || rifleEntry?.rifle_id || '',
    scope_name: '',
    scope_profile_id: null,
    ammo_name: rifleEntry?.ammunition_brand || '',
    ammo_id: rifleEntry?.ammunition_id || '',
    caliber: rifleEntry?.caliber || '',
    bullet_weight: rifleEntry?.grain || '',
    distance: rifleEntry?.meters_range || '',
    distance_unit: 'm',
    shooting_position: '',
    temperature: '',
    wind_speed: '',
    wind_direction: '',
    weather_notes: '',
    notes: sessionRecord.notes || '',
  };
}

export default function TargetAnalysisPanel({ sessionRecord, onClose }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showPhotoAnalyzer, setShowPhotoAnalyzer] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [scopeProfiles, setScopeProfiles] = useState([]);
  const [rifles, setRifles] = useState([]);
  // Which rifle context to use for new groups (defaults to first)
  const [selectedRifleIdx, setSelectedRifleIdx] = useState(0);

  const riflesUsed = sessionRecord?.rifles_used || [];
  const primaryRifle = riflesUsed[selectedRifleIdx] || riflesUsed[0] || {};
  const analyzerSession = buildAnalyzerSession(sessionRecord, primaryRifle, rifles);
  // Pick scope profile for the selected rifle
  const scopeProfile = scopeProfiles.find(sp => sp.rifle_id === primaryRifle?.rifle_id) || scopeProfiles[0] || null;

  useEffect(() => { loadAll(); }, [sessionRecord.id]);

  const loadAll = async () => {
    setLoading(true);
    const [g, user] = await Promise.all([
      base44.entities.TargetGroup.filter({ session_id: sessionRecord.id }),
      base44.auth.me(),
    ]);
    setGroups(g.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));

    // Load rifles and scope profiles for the rifles used
    const rifleIds = (sessionRecord.rifles_used || []).map(r => r.rifle_id).filter(Boolean);
    if (rifleIds.length) {
      const [rList, spList] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: user.email }),
        base44.entities.ScopeProfile.filter({ created_by: user.email }),
      ]);
      setRifles(rList);
      setScopeProfiles(spList.filter(sp => rifleIds.includes(sp.rifle_id)));
    }
    setLoading(false);
  };

  const handleSaveGroup = async (data) => {
    if (editGroup?.id) {
      await base44.entities.TargetGroup.update(editGroup.id, data);
    } else {
      await base44.entities.TargetGroup.create({ ...data, session_id: sessionRecord.id });
    }
    setShowManualForm(false);
    setShowPhotoAnalyzer(false);
    setEditGroup(null);
    loadAll();
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this group?')) return;
    await base44.entities.TargetGroup.delete(id);
    loadAll();
  };

  const handleDuplicateGroup = async (group) => {
    const { id, created_date, updated_date, created_by, ...rest } = group;
    const nextNum = groups.length + 1;
    await base44.entities.TargetGroup.create({
      ...rest,
      session_id: sessionRecord.id,
      group_name: `${rest.group_name} (copy)`,
      confirmed: false,
      best_group: false,
    });
    loadAll();
  };

  const handleMarkBest = async (group) => {
    for (const g of groups) {
      if (g.id !== group.id && g.best_group) {
        await base44.entities.TargetGroup.update(g.id, { best_group: false });
      }
    }
    await base44.entities.TargetGroup.update(group.id, { best_group: !group.best_group });
    loadAll();
  };

  const handleSaveToScope = async (group) => {
    if (!scopeProfile) {
      alert('No scope profile found for this rifle. Add one in Scope Click Cards first.');
      return;
    }
    const distance = group.distance_override || primaryRifle?.meters_range;
    if (!distance) {
      alert('No distance set for this group. Please set the distance in the group.');
      return;
    }
    await base44.entities.ScopeDistanceData.create({
      scope_profile_id: scopeProfile.id,
      distance: parseInt(distance),
      distance_unit: 'm',
      elevation_clicks: group.clicks_up_down || 0,
      windage_clicks: group.clicks_left_right || 0,
      data_type: group.confirmed ? 'confirmed' : 'calculated',
      ammunition_used: group.ammo_override || primaryRifle?.ammunition_brand || '',
      date_confirmed: sessionRecord.date,
      confirmed_at_range: group.confirmed || false,
      notes: group.notes || '',
    });
    alert(`✓ Saved to scope click card: ${scopeProfile.scope_brand} at ${distance}m`);
  };

  const bestGroup = groups.filter(g => g.group_size_moa).reduce((best, g) =>
    !best || g.group_size_moa < best.group_size_moa ? g : best, null);

  // Sub-screens — full-screen overlays
  if (showPhotoAnalyzer) {
    return createPortal(
      <div className="fixed inset-0 z-[60000] bg-background overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <TargetPhotoAnalyzer
            session={analyzerSession}
            editGroup={editGroup}
            onSave={handleSaveGroup}
            onBack={() => { setShowPhotoAnalyzer(false); setEditGroup(null); }}
          />
        </div>
      </div>,
      document.body
    );
  }

  if (showManualForm) {
    return createPortal(
      <div className="fixed inset-0 z-[60000] bg-background overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <ManualGroupForm
            session={analyzerSession}
            editGroup={editGroup}
            scopeProfile={scopeProfile}
            groupNumber={groups.length + 1}
            onSave={handleSaveGroup}
            onBack={() => { setShowManualForm(false); setEditGroup(null); }}
          />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[55000] bg-black/60" onClick={onClose}>
      <div
        className="fixed inset-x-0 bottom-0 top-0 md:top-auto md:bottom-0 md:max-h-[90vh] bg-background overflow-y-auto rounded-t-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Target Analysis</h2>
            <p className="text-xs text-muted-foreground">
              {sessionRecord.location_name} · {primaryRifle?.meters_range ? `${primaryRifle.meters_range}m` : ''}
              {scopeProfile ? ` · ${scopeProfile.scope_brand}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSessionPDF(analyzerSession, groups, scopeProfile)}
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
              title="Download PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 pb-8">

          {/* Rifle selector (when multiple rifles in session) */}
          {riflesUsed.length > 1 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Context for new groups</p>
              <div className="flex gap-2 flex-wrap">
                {riflesUsed.map((r, i) => {
                  const rName = rifles.find(x => x.id === r.rifle_id)?.name || r.rifle_id || `Rifle ${i + 1}`;
                  return (
                    <button key={i} onClick={() => setSelectedRifleIdx(i)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${selectedRifleIdx === i ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                      {rName} {r.meters_range ? `· ${r.meters_range}m` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best Group Summary */}
          {bestGroup && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Best Group</p>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-2xl font-black">{bestGroup.group_size_moa?.toFixed(2)} MOA</span>
                {bestGroup.group_size_mm && <span className="text-muted-foreground">{bestGroup.group_size_mm}mm</span>}
                {bestGroup.group_size_mrad && <span className="text-muted-foreground">{bestGroup.group_size_mrad?.toFixed(3)} MRAD</span>}
              </div>
              {(bestGroup.clicks_up_down || bestGroup.clicks_left_right) && (
                <p className="text-sm mt-1 font-medium">
                  Correction:
                  {bestGroup.clicks_up_down > 0 && ` ↑ ${bestGroup.clicks_up_down}`}
                  {bestGroup.clicks_up_down < 0 && ` ↓ ${Math.abs(bestGroup.clicks_up_down)}`}
                  {bestGroup.clicks_left_right > 0 && ` → ${bestGroup.clicks_left_right}`}
                  {bestGroup.clicks_left_right < 0 && ` ← ${Math.abs(bestGroup.clicks_left_right)}`}
                  {' '}clicks
                </p>
              )}
            </div>
          )}

          {/* Groups */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base">Target Groups ({groups.length})</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  session={analyzerSession}
                  isBest={bestGroup?.id === group.id}
                  onEdit={() => {
                    setEditGroup(group);
                    if (group.entry_method === 'photo') setShowPhotoAnalyzer(true);
                    else setShowManualForm(true);
                  }}
                  onDelete={() => handleDeleteGroup(group.id)}
                  onDuplicate={() => handleDuplicateGroup(group)}
                  onSaveToScope={() => handleSaveToScope(group)}
                  onMarkBest={() => handleMarkBest(group)}
                />
              ))}
              {groups.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No groups yet. Add your first group below.
                </div>
              )}
            </div>
          )}

          {/* Add Group Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setEditGroup(null); setShowPhotoAnalyzer(true); }}
              className="py-4 bg-card border border-border rounded-2xl font-semibold text-sm flex flex-col items-center gap-1.5 hover:border-primary/40 transition-all active:scale-95"
            >
              <span className="text-2xl">📸</span>
              Analyze Photo
            </button>
            <button
              onClick={() => { setEditGroup(null); setShowManualForm(true); }}
              className="py-4 bg-card border border-border rounded-2xl font-semibold text-sm flex flex-col items-center gap-1.5 hover:border-primary/40 transition-all active:scale-95"
            >
              <span className="text-2xl">✏️</span>
              Enter Manually
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}