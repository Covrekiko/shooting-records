import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Bell, AlertTriangle } from 'lucide-react';
import { getAllQueueEntries, SYNC_STATUS } from '@/lib/syncQueue';

export default function NotificationCenter() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const [alerts, ammo, components, queue] = await Promise.all([
        base44.entities.MaintenanceAlert.filter({ created_by: user.email, status: 'active' }),
        base44.entities.Ammunition.filter({ created_by: user.email }),
        base44.entities.ReloadingComponent.filter({ created_by: user.email }),
        getAllQueueEntries(),
      ]);
      setData({ alerts, ammo, components, queue });
    })();
  }, []);

  const notifications = useMemo(() => {
    if (!data) return [];
    return [
      ...data.alerts.map((a) => ({ severity: 'warning', title: a.firearm_name || 'Maintenance due', detail: a.message, to: '/ammo-summary' })),
      ...data.ammo.filter((a) => Number(a.quantity_in_stock || 0) <= Number(a.low_stock_threshold || 0)).map((a) => ({ severity: 'warning', title: 'Low ammunition', detail: `${a.brand || 'Ammo'} ${a.caliber || ''}: ${a.quantity_in_stock || 0} remaining`, to: '/settings/ammunition' })),
      ...data.components.filter((c) => Number(c.quantity_remaining || 0) <= 0).map((c) => ({ severity: 'warning', title: 'Component empty', detail: `${c.name || c.component_type} is out of stock`, to: '/reloading' })),
      ...data.queue.filter((q) => [SYNC_STATUS.FAILED, SYNC_STATUS.CONFLICT, SYNC_STATUS.EXPIRED].includes(q.status)).map((q) => ({ severity: 'review', title: 'Sync item needs review', detail: `${q.entityName || 'Record'} ${q.action || ''}: ${q.lastError || q.status}`, to: '/sync-conflicts' })),
    ];
  }, [data]);

  return (
    <div className="min-h-screen bg-background"><Navigation /><main className="max-w-3xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding"><h1 className="text-2xl font-bold">Notification Center</h1><p className="text-sm text-muted-foreground mt-1 mb-5">Important app events only — no noisy alerts.</p>{!data ? <p className="text-sm text-muted-foreground">Loading notifications…</p> : notifications.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="font-semibold">No notifications need attention</p></div> : <div className="space-y-3">{notifications.map((item, index) => <Link key={index} to={item.to} className="block rounded-xl border border-border bg-card p-4"><div className="flex gap-3"><AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" /><div><p className="font-semibold text-sm">{item.title}</p><p className="text-sm text-muted-foreground mt-1">{item.detail}</p></div></div></Link>)}</div>}</main></div>
  );
}