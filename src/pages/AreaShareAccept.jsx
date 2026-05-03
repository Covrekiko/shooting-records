import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { DESIGN } from '@/lib/designConstants';

export default function AreaShareAccept() {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    const loadShare = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const records = await base44.entities.AreaShare.filter({ share_token: token });
      setShare(records?.[0] || null);
      setLoading(false);
    };
    loadShare();
  }, [token]);

  const handleAccept = async () => {
    if (!share || share.status === 'revoked') return;
    const user = await base44.auth.me();
    const existing = await base44.entities.Area.filter({ area_share_id: share.id, created_by: user.email });
    if (existing.length > 0) {
      navigate('/deer-stalking');
      return;
    }
    const sharedArea = await base44.entities.Area.create({
      name: share.area_name,
      polygon_coordinates: share.polygon_coordinates,
      center_point: share.center_point,
      notes: share.note || '',
      active: true,
      shared_area: true,
      area_share_id: share.id,
      original_area_id: share.area_id,
      shared_owner_email: share.owner_email,
      shared_owner_name: share.owner_display_name,
      allow_outing_share: share.allow_outing_share,
      allowed_live_tracking: share.allowed_live_tracking,
    });
    const copiedMarkers = (share.shared_markers || []).map(marker => ({
      marker_type: marker.marker_type,
      latitude: marker.latitude,
      longitude: marker.longitude,
      title: marker.title,
      species: marker.species,
      sex: marker.sex,
      age_class: marker.age_class,
      quantity: marker.quantity,
      sign_type: marker.sign_type,
      animal_category: marker.animal_category,
      pest_species: marker.pest_species,
      custom_animal_name: marker.custom_animal_name,
      feed_type: marker.feed_type,
      notes: marker.notes,
      photos: marker.photos || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      shared_area_id: sharedArea.id,
      area_share_id: share.id,
    }));
    for (const marker of copiedMarkers) {
      await base44.entities.MapMarker.create(marker);
    }
    await base44.entities.AreaShare.update(share.id, { status: 'accepted', accepted_by_email: user.email, accepted_at: new Date().toISOString() });
    setMessage('Area added to your app.');
    setTimeout(() => navigate('/deer-stalking'), 800);
  };

  if (loading) return <div className={`${DESIGN.PAGE_BG} min-h-screen`}><Navigation /><div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;

  return (
    <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
      <Navigation />
      <main className="max-w-xl mx-auto px-4 pt-8 mobile-page-padding">
        <div className={`${DESIGN.CARD} p-6 space-y-4`}>
          {!share ? (
            <p className="text-sm text-muted-foreground">This share link was not found.</p>
          ) : share.status === 'revoked' ? (
            <p className="text-sm text-muted-foreground">This share link has been revoked.</p>
          ) : (
            <>
              <div><h1 className="text-xl font-bold text-foreground">Shared Stalking Area</h1><p className="text-sm text-muted-foreground mt-1">{share.owner_display_name} has shared a stalking area with you.</p></div>
              <div className="rounded-2xl bg-secondary/60 border border-border p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Area</p><p className="text-lg font-bold text-foreground">{share.area_name}</p>{share.note && <p className="text-sm text-muted-foreground mt-2">{share.note}</p>}</div>
              <div className="flex gap-3"><button onClick={() => navigate('/')} className="flex-1 h-11 rounded-xl font-semibold bg-secondary text-secondary-foreground">Cancel</button><button onClick={handleAccept} className="flex-1 h-11 rounded-xl font-semibold bg-primary text-primary-foreground">Add Area</button></div>
              {message && <p className="text-sm text-green-700 font-semibold">{message}</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}