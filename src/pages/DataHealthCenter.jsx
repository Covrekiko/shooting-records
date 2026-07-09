import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAllQueueEntries, SYNC_STATUS } from '@/lib/syncQueue';

const STATUS = {
  healthy: 'Healthy',
  warning: 'Warning',
  review: 'Needs review',
  blocked: 'Blocked',
};

function HealthRow({ item }) {
  const colors = item.status === 'healthy' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : item.status === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {item.status === 'healthy' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{item.title}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors}`}>{STATUS[item.status]}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function DataHealthCenter() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const [records, rifles, shotguns, ammo, components, tests, variants, results, queue] = await Promise.all([
      base44.entities.SessionRecord.filter({ created_by: user.email }),
      base44.entities.Rifle.filter({ created_by: user.email }),
      base44.entities.Shotgun.filter({ created_by: user.email }),
      base44.entities.Ammunition.filter({ created_by: user.email }),
      base44.entities.ReloadingComponent.filter({ created_by: user.email }),
      base44.entities.ReloadingTest.filter({ created_by: user.email }),
      base44.entities.ReloadingTestVariant.filter({ created_by: user.email }),
      base44.entities.ReloadingTestResult.filter({ created_by: user.email }),
      getAllQueueEntries(),
    ]);
    setData({ records, rifles, shotguns, ammo, components, tests, variants, results, queue });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const checks = useMemo(() => {
    if (!data) return [];
    const rifleIds = new Set(data.rifles.map((r) => r.id));
    const shotgunIds = new Set(data.shotguns.map((s) => s.id));
    const ammoIds = new Set(data.ammo.map((a) => a.id));
    const testIds = new Set(data.tests.map((t) => t.id));
    const variantIds = new Set(data.variants.map((v) => v.id));
    const missingFirearmRecords = data.records.filter((r) => r.category === 'target_shooting' && r.rifle_id && !rifleIds.has(r.rifle_id)).length + data.records.filter((r) => r.category === 'clay_shooting' && r.shotgun_id && !shotgunIds.has(r.shotgun_id)).length;
    const missingAmmoRecords = data.records.filter((r) => r.ammunition_id && !ammoIds.has(r.ammunition_id)).length;
    const orphanVariants = data.variants.filter((v) => v.test_id && !testIds.has(v.test_id)).length;
    const orphanResults = data.results.filter((r) => (r.test_id && !testIds.has(r.test_id)) || (r.variant_id && !variantIds.has(r.variant_id))).length;
    const syncReview = data.queue.filter((q) => [SYNC_STATUS.FAILED, SYNC_STATUS.CONFLICT, SYNC_STATUS.EXPIRED].includes(q.status)).length;
    const lowAmmo = data.ammo.filter((a) => Number(a.quantity_in_stock || 0) <= Number(a.low_stock_threshold || 0)).length;
    const lowComponents = data.components.filter((c) => Number(c.quantity_remaining || 0) <= 0).length;
    return [
      { title: 'Record firearm links', status: missingFirearmRecords ? 'review' : 'healthy', detail: missingFirearmRecords ? `${missingFirearmRecords} session record(s) reference a missing firearm.` : 'Session firearm links look consistent.' },
      { title: 'Record ammunition links', status: missingAmmoRecords ? 'warning' : 'healthy', detail: missingAmmoRecords ? `${missingAmmoRecords} record(s) reference ammunition that is no longer present.` : 'Session ammunition links look consistent.' },
      { title: 'Load Development links', status: orphanVariants || orphanResults ? 'review' : 'healthy', detail: orphanVariants || orphanResults ? `${orphanVariants} orphan variant(s), ${orphanResults} orphan result(s).` : 'Load tests, variants, and results are linked.' },
      { title: 'Offline sync queue', status: syncReview ? 'review' : 'healthy', detail: syncReview ? `${syncReview} sync item(s) need review in the Sync Conflict Center.` : 'No failed, conflicted, or expired sync items found.' },
      { title: 'Low stock indicators', status: lowAmmo || lowComponents ? 'warning' : 'healthy', detail: `${lowAmmo} ammunition item(s) at/below threshold; ${lowComponents} component item(s) empty.` },
    ];
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div><h1 className="text-2xl font-bold">Data Health Center</h1><p className="text-sm text-muted-foreground mt-1">Read-only diagnostics. No stock or records are changed here.</p></div>
          <button onClick={loadData} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4" />Refresh</button>
        </div>
        {loading ? <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div> : <div className="space-y-3">{checks.map((item) => <HealthRow key={item.title} item={item} />)}</div>}
      </main>
    </div>
  );
}