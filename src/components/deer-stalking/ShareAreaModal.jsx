import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { DESIGN } from '@/lib/designConstants';

const markerLabel = (marker) => marker.title || marker.species || marker.sign_type || marker.pest_species || marker.custom_animal_name || marker.marker_type?.replace(/_/g, ' ') || 'Point of Interest';

export default function ShareAreaModal({ areas, markers, onClose }) {
  const [user, setUser] = useState(null);
  const [shares, setShares] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [formData, setFormData] = useState({
    area_id: '',
    invitee_name: '',
    owner_display_name: '',
    note: '',
    allow_outing_share: false,
    allowed_live_tracking: false,
    selected_marker_ids: [],
  });

  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      setFormData(prev => ({ ...prev, owner_display_name: me.full_name || me.email || '' }));
      base44.entities.AreaShare.filter({ owner_email: me.email }).then(setShares);
    });
  }, []);

  const selectedArea = areas.find(a => a.id === formData.area_id);
  const areaMarkers = markers.filter(marker => selectedArea && marker.latitude && marker.longitude);

  const toggleMarker = (id) => {
    setFormData(prev => ({
      ...prev,
      selected_marker_ids: prev.selected_marker_ids.includes(id)
        ? prev.selected_marker_ids.filter(markerId => markerId !== id)
        : [...prev.selected_marker_ids, id],
    }));
  };

  const selectMarkersByType = (type) => {
    const ids = areaMarkers.filter(marker => marker.marker_type === type).map(marker => marker.id);
    setFormData(prev => ({ ...prev, selected_marker_ids: Array.from(new Set([...prev.selected_marker_ids, ...ids])) }));
  };

  const clearMarkers = () => setFormData(prev => ({ ...prev, selected_marker_ids: [] }));

  const handleGenerate = async () => {
    if (!selectedArea || !formData.invitee_name || !formData.owner_display_name) return;
    const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    const selectedMarkers = markers.filter(marker => formData.selected_marker_ids.includes(marker.id));
    await base44.entities.AreaShare.create({
      owner_email: user.email,
      area_id: selectedArea.id,
      area_name: selectedArea.name,
      invitee_name: formData.invitee_name,
      owner_display_name: formData.owner_display_name,
      note: formData.note,
      share_token: token,
      allow_outing_share: formData.allow_outing_share,
      allowed_live_tracking: formData.allowed_live_tracking,
      selected_marker_ids: formData.selected_marker_ids,
      shared_markers: selectedMarkers,
      polygon_coordinates: selectedArea.polygon_coordinates,
      center_point: selectedArea.center_point,
      status: 'active',
      created_at: new Date().toISOString(),
    });
    const link = `${window.location.origin}/area-share?token=${token}`;
    setGeneratedLink(link);
    const refreshed = await base44.entities.AreaShare.filter({ owner_email: user.email });
    setShares(refreshed || []);
  };

  const copyLink = async (share) => {
    const link = `${window.location.origin}/area-share?token=${share.share_token}`;
    await navigator.clipboard.writeText(link);
  };

  const revokeShare = async (share) => {
    await base44.entities.AreaShare.update(share.id, { status: 'revoked', revoked_at: new Date().toISOString() });
    setShares(shares.map(s => s.id === share.id ? { ...s, status: 'revoked' } : s));
  };

  return (
    <GlobalModal open={true} onClose={onClose} title="Share Area" subtitle="Choose exactly what the client can see" onSubmit={handleGenerate} primaryAction="Generate Share Link" secondaryAction="Cancel" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <section className={`${DESIGN.CARD} p-4 space-y-4`}>
          <div>
            <label className={DESIGN.LABEL}>Select area to share</label>
            <select value={formData.area_id} onChange={(e) => setFormData({ ...formData, area_id: e.target.value, selected_marker_ids: [] })} className={DESIGN.INPUT} required>
              <option value="">Select area</option>
              {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={DESIGN.LABEL}>Invitee / client name</label><input value={formData.invitee_name} onChange={(e) => setFormData({ ...formData, invitee_name: e.target.value })} className={DESIGN.INPUT} required /></div>
            <div><label className={DESIGN.LABEL}>Owner / company display name</label><input value={formData.owner_display_name} onChange={(e) => setFormData({ ...formData, owner_display_name: e.target.value })} className={DESIGN.INPUT} required /></div>
          </div>
          <div><label className={DESIGN.LABEL}>Optional note/message</label><textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className={DESIGN.INPUT} rows="2" /></div>
        </section>

        <section className={`${DESIGN.CARD} p-4 space-y-3`}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Choose what to share</p>
          <p className="text-sm text-foreground font-semibold">Boundary is always included.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => selectMarkersByType('high_seat')} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold">Share all high seats</button>
            <button type="button" onClick={clearMarkers} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold">Share no existing POIs</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {areaMarkers.length === 0 ? <p className="text-sm text-muted-foreground">No POIs available to select.</p> : areaMarkers.map(marker => (
              <label key={marker.id} className="flex items-start gap-2 p-3 rounded-xl border border-border bg-background/60 cursor-pointer">
                <input type="checkbox" checked={formData.selected_marker_ids.includes(marker.id)} onChange={() => toggleMarker(marker.id)} className="mt-1" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground capitalize">{marker.marker_type?.replace(/_/g, ' ')}</span>
                  <span className="block text-xs text-muted-foreground truncate">{markerLabel(marker)}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className={`${DESIGN.CARD} p-4 space-y-3`}>
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={formData.allow_outing_share} onChange={(e) => setFormData({ ...formData, allow_outing_share: e.target.checked })} className="mt-1" /><span><span className="block text-sm font-semibold">Allow client to share outing information back to me</span></span></label>
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={formData.allowed_live_tracking} onChange={(e) => setFormData({ ...formData, allowed_live_tracking: e.target.checked })} className="mt-1" /><span><span className="block text-sm font-semibold">Allow live location tracking while client is checked in</span></span></label>
        </section>

        {generatedLink && (
          <section className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-bold text-green-800 mb-2">Share link created</p>
            <input readOnly value={generatedLink} className={DESIGN.INPUT} onFocus={(e) => e.target.select()} />
          </section>
        )}

        {shares.length > 0 && (
          <section className={`${DESIGN.CARD} p-4 space-y-2`}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Created links</p>
            {shares.map(share => (
              <div key={share.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/70 p-3">
                <div className="min-w-0"><p className="text-sm font-semibold truncate">{share.invitee_name} · {share.area_name}</p><p className="text-xs text-muted-foreground">{share.status}{share.accepted_by_email ? ` · accepted by ${share.accepted_by_email}` : ''}</p></div>
                <div className="flex gap-2 flex-shrink-0"><button type="button" onClick={() => copyLink(share)} className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold">Copy</button>{share.status !== 'revoked' && <button type="button" onClick={() => revokeShare(share)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">Revoke</button>}</div>
              </div>
            ))}
          </section>
        )}
      </div>
    </GlobalModal>
  );
}