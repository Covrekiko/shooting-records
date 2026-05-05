import { useState } from 'react';
import { format } from 'date-fns';
import { Droplet, Plus } from 'lucide-react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
const maintenanceOptions = ['Barrel bore cleaning', 'Chamber cleaning', 'Action cleaning', 'Scope maintenance', 'Stock wipe-down', 'Lubrication'];

export default function CleaningLogPanel({ firearm, firearmType, history = [], onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cleaning_date: new Date().toISOString().slice(0, 10),
    maintenance_items: ['Barrel bore cleaning'],
    notes: '',
  });

  const toggleItem = (item) => {
    setForm((current) => ({
      ...current,
      maintenance_items: current.maintenance_items.includes(item)
        ? current.maintenance_items.filter((value) => value !== item)
        : [...current.maintenance_items, item],
    }));
  };

  const submit = async () => {
    await onSave(firearm, form);
    setOpen(false);
    setForm({ cleaning_date: new Date().toISOString().slice(0, 10), maintenance_items: ['Barrel bore cleaning'], notes: '' });
  };

  return (
    <div className="pt-4 border-t border-border space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Droplet className="w-4 h-4 text-primary" /> Cleaning log
        </h4>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Record clean
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground">No cleaning records yet.</p>
      ) : (
        <div className="space-y-2">
          {history.slice(0, 3).map((entry) => (
            <div key={entry.id} className="rounded-lg bg-secondary/30 p-3">
              <p className="text-xs font-semibold text-foreground">{format(new Date(entry.cleaning_date), 'MMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground mt-1">{entry.maintenance_summary || entry.notes || 'General cleaning'}</p>
            </div>
          ))}
        </div>
      )}

      <GlobalModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Record ${firearmType} maintenance`}
        onSubmit={submit}
        primaryAction="Save cleaning log"
        secondaryAction="Cancel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" value={form.cleaning_date} onChange={(e) => setForm({ ...form, cleaning_date: e.target.value })} className={inp} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Maintenance performed</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {maintenanceOptions.map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <input type="checkbox" checked={form.maintenance_items.includes(item)} onChange={() => toggleItem(item)} />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inp} rows="3" placeholder="Optional details, products used, issues found…" />
          </div>
        </div>
      </GlobalModal>
    </div>
  );
}