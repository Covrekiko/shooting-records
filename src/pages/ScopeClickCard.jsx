import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Search, Download, Crosshair } from 'lucide-react';
import { createPortal } from 'react-dom';
import ScopeProfileCard from '@/components/scope/ScopeProfileCard';
import ScopeProfileForm from '@/components/scope/ScopeProfileForm';
import ScopeDetailView from '@/components/scope/ScopeDetailView';
import { exportAllRifleScopeDataPDF } from '@/utils/scopePdfExport';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';

export default function ScopeClickCard() {
  const [profiles, setProfiles] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRifle, setFilterRifle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [profilesData, riflesData] = await Promise.all([
      base44.entities.ScopeProfile.filter({ created_by: user.email }),
      base44.entities.Rifle.filter({ created_by: user.email }),
    ]);
    setProfiles(profilesData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setRifles(riflesData);
    setLoading(false);
  };

  const handleSave = async (data) => {
    const user = await base44.auth.me();
    // If marking as main_hunting or target_shooting, unset others of that type for same rifle
    if (data.setup_type !== 'standard') {
      const toUpdate = profiles.filter(
        p => p.rifle_id === data.rifle_id && p.setup_type === data.setup_type && p.id !== editingProfile?.id
      );
      for (const p of toUpdate) {
        await base44.entities.ScopeProfile.update(p.id, { setup_type: 'standard' });
      }
    }
    if (editingProfile) {
      await base44.entities.ScopeProfile.update(editingProfile.id, data);
    } else {
      await base44.entities.ScopeProfile.create(data);
    }
    setShowForm(false);
    setEditingProfile(null);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scope profile? All distance data will also be deleted.')) return;
    // Delete all distance data for this profile
    const distData = await base44.entities.ScopeDistanceData.filter({ scope_profile_id: id });
    for (const d of distData) {
      await base44.entities.ScopeDistanceData.delete(d.id);
    }
    await base44.entities.ScopeProfile.delete(id);
    if (selectedProfile?.id === id) setSelectedProfile(null);
    loadData();
  };

  const handleDuplicate = async (profile) => {
    const { id, created_date, updated_date, created_by, ...rest } = profile;
    const newProfile = await base44.entities.ScopeProfile.create({
      ...rest,
      scope_brand: rest.scope_brand + ' (Copy)',
      setup_type: 'standard',
    });
    // Duplicate distance data
    const distData = await base44.entities.ScopeDistanceData.filter({ scope_profile_id: id });
    for (const d of distData) {
      const { id: did, created_date: dc, updated_date: du, created_by: dcb, ...dRest } = d;
      await base44.entities.ScopeDistanceData.create({ ...dRest, scope_profile_id: newProfile.id });
    }
    loadData();
  };

  useBodyScrollLock(!!(showForm || selectedProfile));
  const pullToRefresh = usePullToRefresh(loadData, { disabled: !!(showForm || selectedProfile) });

  const filteredProfiles = profiles.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [p.scope_brand, p.scope_model, p.caliber, p.rifle_name, p.bullet_brand, p.zero_ammo]
      .some(v => v?.toLowerCase().includes(q));
    const matchRifle = !filterRifle || p.rifle_id === filterRifle;
    return matchSearch && matchRifle;
  });

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Scope Click Cards</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ballistic DOPE per rifle & scope</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportAllRifleScopeDataPDF(rifles, profiles)}
              className="px-3 py-2.5 border border-border rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-secondary transition-colors"
              title="Backup All Data PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Backup PDF</span>
            </button>
            <button
              onClick={() => { setEditingProfile(null); setShowForm(true); }}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>New Profile</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search scope, rifle, ammo, calibre…"
              className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-sm"
            />
          </div>
          <select
            value={filterRifle}
            onChange={e => setFilterRifle(e.target.value)}
            className="px-3 py-2.5 border border-border rounded-xl bg-background text-sm min-w-0 max-w-[140px]"
          >
            <option value="">All Rifles</option>
            {rifles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{profiles.length}</p>
            <p className="text-xs text-muted-foreground">Profiles</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{profiles.filter(p => p.setup_type === 'main_hunting').length}</p>
            <p className="text-xs text-muted-foreground">Hunting</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{profiles.filter(p => p.setup_type === 'target_shooting').length}</p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
        </div>

        {/* Profile List */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Crosshair className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-lg mb-1">{searchQuery || filterRifle ? 'No results found' : 'No Scope Profiles Yet'}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterRifle ? 'Try adjusting your search' : 'Add your first scope profile to build your ballistic DOPE card'}
            </p>
            {!searchQuery && !filterRifle && (
              <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
                Add First Profile
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map(profile => (
              <ScopeProfileCard
                key={profile.id}
                profile={profile}
                rifle={rifles.find(r => r.id === profile.rifle_id)}
                onView={() => setSelectedProfile(profile)}
                onEdit={() => { setEditingProfile(profile); setShowForm(true); }}
                onDelete={() => handleDelete(profile.id)}
                onDuplicate={() => handleDuplicate(profile)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail View */}
      {selectedProfile && (
        <ScopeDetailView
          profile={selectedProfile}
          rifle={rifles.find(r => r.id === selectedProfile.rifle_id)}
          onClose={() => setSelectedProfile(null)}
          onEdit={() => { setEditingProfile(selectedProfile); setSelectedProfile(null); setShowForm(true); }}
        />
      )}

      {/* Profile Form Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[50000] bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg" style={{ maxHeight: '95dvh' }}>
            <ScopeProfileForm
              profile={editingProfile}
              rifles={rifles}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditingProfile(null); }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}