import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Edit2, Trash2, Download, Copy, Target, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import GroupCard from './GroupCard';
import ManualGroupForm from './ManualGroupForm';
import TargetPhotoAnalyzer from './TargetPhotoAnalyzer';
import { exportSessionPDF } from '@/utils/analyzerPdfExport';

export default function SessionDetail({ session, onBack, onEdit, onNewSession }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showPhotoAnalyzer, setShowPhotoAnalyzer] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [scopeProfile, setScopeProfile] = useState(null);

  useEffect(() => { loadData(); }, [session.id]);

  const loadData = async () => {
    setLoading(true);
    const [g, sp] = await Promise.all([
      base44.entities.TargetGroup.filter({ session_id: session.id }),
      session.scope_profile_id ? base44.entities.ScopeProfile.filter({ id: session.scope_profile_id }) : Promise.resolve([]),
    ]);
    setGroups(g.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    setScopeProfile(sp[0] || null);
    setLoading(false);
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this group?')) return;
    await base44.entities.TargetGroup.delete(id);
    loadData();
  };

  const handleSaveGroup = async (data) => {
    if (editGroup?.id) {
      await base44.entities.TargetGroup.update(editGroup.id, data);
    } else {
      await base44.entities.TargetGroup.create({ ...data, session_id: session.id });
    }
    setShowManualForm(false);
    setShowPhotoAnalyzer(false);
    setEditGroup(null);
    loadData();
  };

  const handleDuplicateSession = async () => {
    const { id, created_date, updated_date, created_by, ...rest } = session;
    await base44.entities.TargetSession.create({ ...rest, date: new Date().toISOString().split('T')[0] });
    alert('Session duplicated — check Previous Sessions');
  };

  const handleSaveToScopeCard = async (group) => {
    if (!session.scope_profile_id) { alert('No scope profile linked to this session'); return; }
    const distance = session.distance;
    await base44.entities.ScopeDistanceData.create({
      scope_profile_id: session.scope_profile_id,
      distance: distance,
      distance_unit: session.distance_unit || 'm',
      elevation_clicks: group.clicks_up_down || 0,
      windage_clicks: group.clicks_left_right || 0,
      data_type: group.confirmed_zero ? 'confirmed' : 'calculated',
      ammunition_used: session.ammo_name || '',
      date_confirmed: session.date,
      confirmed_at_range: group.confirmed_zero || false,
      notes: group.notes || '',
    });
    alert(`Saved to Scope Click Card at ${distance}${session.distance_unit || 'm'}`);
  };

  const handleMarkBest = async (group) => {
    for (const g of groups) {
      if (g.id !== group.id && g.best_group) {
        await base44.entities.TargetGroup.update(g.id, { best_group: false });
      }
    }
    await base44.entities.TargetGroup.update(group.id, { best_group: !group.best_group });
    loadData();
  };

  const handleDuplicateGroup = async (group) => {
    const { id, created_date, updated_date, created_by, ...rest } = group;
    await base44.entities.TargetGroup.create({ ...rest, session_id: session.id, group_name: `${rest.group_name} (copy)`, confirmed: false, best_group: false });
    loadData();
  };

  const bestGroup = groups.filter(g => g.group_size_moa).reduce((best, g) =>
    !best || g.group_size_moa < best.group_size_moa ? g : best, null);

  // isBest check uses both old and new field name
  const isBestGroup = (g) => bestGroup?.id === g.id;

  if (showPhotoAnalyzer) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
        <TargetPhotoAnalyzer
          session={session}
          editGroup={editGroup}
          onSave={handleSaveGroup}
          onBack={() => { setShowPhotoAnalyzer(false); setEditGroup(null); }}
        />
      </main>
    );
  }

  if (showManualForm) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
        <ManualGroupForm
          session={session}
          editGroup={editGroup}
          scopeProfile={scopeProfile}
          groupNumber={groups.length + 1}
          onSave={handleSaveGroup}
          onBack={() => { setShowManualForm(false); setEditGroup(null); }}
        />
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{session.rifle_name || 'Session'}</h2>
          <p className="text-xs text-muted-foreground">
            {session.date ? format(new Date(session.date), 'd MMM yyyy') : '—'} · {session.distance}{session.distance_unit || 'm'} · {session.range_name || ''}
          </p>
        </div>
        <button onClick={onEdit} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Session Info Card */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {session.scope_name && <div><span className="text-muted-foreground">Scope: </span><span className="font-medium">{session.scope_name}</span></div>}
          {session.ammo_name && <div><span className="text-muted-foreground">Ammo: </span><span className="font-medium">{session.ammo_name}</span></div>}
          {session.caliber && <div><span className="text-muted-foreground">Calibre: </span><span className="font-medium">{session.caliber}</span></div>}
          {session.bullet_weight && <div><span className="text-muted-foreground">Bullet: </span><span className="font-medium">{session.bullet_weight}</span></div>}
          {session.shooting_position && <div><span className="text-muted-foreground">Position: </span><span className="font-medium capitalize">{session.shooting_position.replace('_', ' ')}</span></div>}
          {session.temperature && <div><span className="text-muted-foreground">Temp: </span><span className="font-medium">{session.temperature}</span></div>}
          {session.wind_speed && <div><span className="text-muted-foreground">Wind: </span><span className="font-medium">{session.wind_speed} {session.wind_direction}</span></div>}
        </div>
        {session.notes && <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">{session.notes}</p>}
      </div>

      {/* Best group summary */}
      {bestGroup && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Best Group</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-2xl font-black">{bestGroup.group_size_moa?.toFixed(2)} MOA</span>
            {bestGroup.group_size_mm && <span className="text-muted-foreground">{bestGroup.group_size_mm}mm</span>}
            {bestGroup.group_size_mrad && <span className="text-muted-foreground">{bestGroup.group_size_mrad?.toFixed(3)} MRAD</span>}
            {bestGroup.number_of_shots && <span className="text-muted-foreground">{bestGroup.number_of_shots} shots</span>}
          </div>
          {(bestGroup.clicks_up_down || bestGroup.clicks_left_right) && (
            <p className="text-sm mt-1 font-medium">
              Correction: {bestGroup.clicks_up_down > 0 ? `↑ ${bestGroup.clicks_up_down}` : bestGroup.clicks_up_down < 0 ? `↓ ${Math.abs(bestGroup.clicks_up_down)}` : ''} {bestGroup.clicks_left_right > 0 ? `→ ${bestGroup.clicks_left_right}` : bestGroup.clicks_left_right < 0 ? `← ${Math.abs(bestGroup.clicks_left_right)}` : ''} clicks
            </p>
          )}
        </div>
      )}

      {/* Session Photos */}
      {session.photos?.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {session.photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} className="h-24 w-24 object-cover rounded-xl border border-border flex-shrink-0" alt="" />
            </a>
          ))}
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
              session={session}
              isBest={isBestGroup(group)}
              onEdit={() => {
                setEditGroup(group);
                if (group.entry_method === 'photo' || group.entry_type === 'photo') setShowPhotoAnalyzer(true);
                else setShowManualForm(true);
              }}
              onDelete={() => handleDeleteGroup(group.id)}
              onDuplicate={() => handleDuplicateGroup(group)}
              onSaveToScope={() => handleSaveToScopeCard(group)}
              onMarkBest={() => handleMarkBest(group)}
            />
          ))}
        </div>
      )}

      {/* Add Group Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button onClick={() => { setEditGroup(null); setShowPhotoAnalyzer(true); }}
          className="py-4 bg-card border border-border rounded-2xl font-semibold text-sm flex flex-col items-center gap-1.5 hover:border-primary/40 transition-all active:scale-95">
          <span className="text-2xl">📸</span>
          Analyze Target Photo (Group {groups.length + 1})
        </button>
        <button onClick={() => { setEditGroup(null); setShowManualForm(true); }}
          className="py-4 bg-card border border-border rounded-2xl font-semibold text-sm flex flex-col items-center gap-1.5 hover:border-primary/40 transition-all active:scale-95">
          <span className="text-2xl">✏️</span>
          Enter Group Manually (Group {groups.length + 1})
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => exportSessionPDF(session, groups, scopeProfile)}
          className="py-3 bg-card border border-border rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-all">
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button onClick={handleDuplicateSession}
          className="py-3 bg-card border border-border rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-all">
          <Copy className="w-4 h-4" /> Duplicate
        </button>
      </div>
    </main>
  );
}