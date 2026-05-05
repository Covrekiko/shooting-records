import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
const maintenanceOptions = ['Barrel bore cleaning', 'Chamber cleaning', 'Action cleaning', 'Scope maintenance', 'Stock wipe-down', 'Lubrication'];

export default function CleaningActionButton({ children, className, modalTitle = 'Record maintenance', onSave, onBeforeOpen }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const openForm = () => {
    if (onBeforeOpen) {
      onBeforeOpen(() => setOpen(true));
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setOpen(false);
    setForm({ cleaning_date: new Date().toISOString().slice(0, 10), maintenance_items: ['Barrel bore cleaning'], notes: '' });
  };

  return (
    <>
      <button type="button" onClick={openForm} className={className}>
        {children}
      </button>

      <GlobalModal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={modalTitle}
        onSubmit={submit}
        primaryAction="Save cleaning log"
        secondaryAction="Cancel"
        isLoading={saving}
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
    </>
  );
}