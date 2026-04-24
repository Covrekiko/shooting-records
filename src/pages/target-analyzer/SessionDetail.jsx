import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Edit2, Trash2, Copy, Download, Target, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GroupCard from '@/components/target-analyzer/GroupCard';
import { generateSessionPDF } from '@/utils/targetAnalyzerPDF';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    const [s, g] = await Promise.all([
      base44.entities.TargetSession.filter({ id }),
      base44.entities.TargetGroup.filter({ session_id: id }),
    ]);
    setSession(s[0] || null);
    setGroups(g || []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this session and all groups?')) return;
    await base44.entities.TargetSession.delete(id);
    navigate('/target-analyzer/sessions');
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Delete this group?')) return;
    await base44.entities.TargetGroup.delete(groupId);
    setGroups(g => g.filter(x => x.id !== groupId));
  };

  const handleMarkBest = async (groupId) => {
    await Promise.all(groups.map(g =>
      base44.entities.TargetGroup.update(g.id, { best_group: g.id === groupId })
    ));
    load();
  };

  const handleExportPDF = () => {
    if (session) generateSessionPDF(session, groups);
  };

  const handleSaveToScopeCard = async (group) => {
    if (!session.scope_id) { alert('No scope linked to this session.'); return; }
    await base44.entities.ScopeDistanceData.create({
      scope_profile_id: session.scope_id,
      distance: parseInt(session.distance),
      distance_unit: session.distance_unit || 'm',
      elevation_clicks: group.clicks_up_down || 0,
      windage_clicks: group.clicks_left_right || 0,
      data_type: group.confirmed ? 'confirmed' : 'calculated',
      ammunition_used: session.ammo_name,
      confirmed_at_range: group.confirmed,
      notes: `From target session ${session.date} — ${group.group_name}`,
    });
    alert('Saved to Scope Click Card!');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return <div className="p-8 text-center text-muted-foreground">Session not found.</div>;

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/target-analyzer/sessions')} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Session Detail</h1>
          <button onClick={handleDelete} className="p-2 rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Session Info Card */}
        <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Date</span><p className="font-semibold">{session.date}</p></div>
            <div><span className="text-muted-foreground">Range</span><p className="font-semibold">{session.range_name || '—'}</p></div>
            <div><span className="text-muted-foreground">Rifle</span><p className="font-semibold">{session.rifle_name || '—'}</p></div>
            <div><span className="text-muted-foreground">Scope</span><p className="font-semibold">{session.scope_name || '—'}</p></div>
            <div><span className="text-muted-foreground">Ammo</span><p className="font-semibold">{session.ammo_name || '—'}</p></div>
            <div><span className="text-muted-foreground">Distance</span><p className="font-semibold">{session.distance}{session.distance_unit}</p></div>
            <div><span className="text-muted-foreground">Calibre</span><p className="font-semibold">{session.caliber || '—'}</p></div>
            <div><span className="text-muted-foreground">Position</span><p className="font-semibold capitalize">{session.shooting_position?.replace('_', ' ') || '—'}</p></div>
            {session.temperature && <div><span className="text-muted-foreground">Temp</span><p className="font-semibold">{session.temperature}</p></div>}
            {session.wind_speed && <div><span className="text-muted-foreground">Wind</span><p className="font-semibold">{session.wind_speed} {session.wind_direction}</p></div>}
          </div>
          {session.notes && <p className="text-sm text-muted-foreground border-t border-border pt-3">{session.notes}</p>}
          {session.photos?.length > 0 && (
            <div className="flex gap-2 border-t border-border pt-3 overflow-x-auto">
              {session.photos.map((url, i) => (
                <img key={i} src={url} className="h-20 w-20 object-cover rounded-xl flex-shrink-0" />
              ))}
            </div>
          )}
        </div>

        {/* Groups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Groups ({groups.length})</h2>
            <Link to={`/target-analyzer/session/${id}/add-group`}>
              <Button size="sm" className="rounded-xl gap-1"><Plus className="w-4 h-4" />Add Group</Button>
            </Link>
          </div>

          {groups.length === 0 && (
            <div className="bg-card rounded-2xl p-8 text-center border border-dashed border-border">
              <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No groups yet. Add a group to analyze your shooting.</p>
              <Link to={`/target-analyzer/session/${id}/add-group`} className="mt-3 inline-block">
                <Button className="mt-3 rounded-xl">Add First Group</Button>
              </Link>
            </div>
          )}

          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              session={session}
              onDelete={() => handleDeleteGroup(group.id)}
              onMarkBest={() => handleMarkBest(group.id)}
              onSaveToScopeCard={() => handleSaveToScopeCard(group)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleExportPDF} className="py-4 rounded-2xl gap-2">
            <Download className="w-4 h-4" />PDF Export
          </Button>
          <Link to={`/target-analyzer/session/${id}/add-group`} className="col-span-1">
            <Button className="w-full py-4 rounded-2xl gap-2">
              <Plus className="w-4 h-4" />Add Group
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}