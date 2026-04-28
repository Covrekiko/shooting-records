import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import GlobalModal, { ModalSaveButton, ModalCancelButton } from '@/components/ui/GlobalModal.jsx';

const TEST_TYPES = [
  'Powder Charge Test',
  'Powder Comparison',
  'Seating Depth Test',
  'Primer Test',
  'Brass Test',
  'General Load Development',
];

export default function CreateTestModal({ open, onClose, onCreated }) {
  const [rifles, setRifles] = useState([]);
  const [mode, setMode] = useState('select'); // 'select' | 'new'
  const [form, setForm] = useState({
    name: '',
    test_type: 'General Load Development',
    status: 'Draft',
    rifle_id: '',
    rifle_name: '',
    caliber: '',
    test_date: '',
    range_date: '',
    notes: '',
  });
  const [newRifle, setNewRifle] = useState({ name: '', make: '', model: '', caliber: '', barrel_length: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      base44.entities.Rifle.filter({ created_by: u.email }).then(setRifles).catch(() => {});
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRifleSelect = (id) => {
    const rifle = rifles.find(r => r.id === id);
    if (rifle) {
      set('rifle_id', rifle.id);
      set('rifle_name', rifle.name);
      if (rifle.caliber && !form.caliber) set('caliber', rifle.caliber);
    } else {
      set('rifle_id', '');
      set('rifle_name', '');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.caliber.trim()) return alert('Test name and caliber are required.');
    setSaving(true);
    try {
      let rifle_id = form.rifle_id;
      let rifle_name = form.rifle_name;

      if (mode === 'new') {
        if (!newRifle.name.trim()) return alert('Rifle name is required.');
        const created = await base44.entities.Rifle.create({
          name: newRifle.name,
          make: newRifle.make,
          model: newRifle.model,
          caliber: newRifle.caliber || form.caliber,
          serial_number: '',
          notes: newRifle.notes,
        });
        rifle_id = created.id;
        rifle_name = created.name;
      }

      const test = await base44.entities.ReloadingTest.create({
        ...form,
        rifle_id,
        rifle_name,
        variant_count: 0,
      });
      onCreated(test);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalModal
      open={open}
      onClose={onClose}
      title="New Load Development Test"
      maxWidth="max-w-xl"
      footer={
        <>
          <ModalCancelButton onClick={onClose}>Cancel</ModalCancelButton>
          <ModalSaveButton onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create Test'}
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Test Name */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Test Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. .308 N160 OCW Test"
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Test Type */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Test Type</label>
          <select
            value={form.test_type}
            onChange={e => set('test_type', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none"
          >
            {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Rifle */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Rifle *</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setMode('select')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${mode === 'select' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary'}`}
            >
              Select Existing
            </button>
            <button
              onClick={() => setMode('new')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${mode === 'new' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary'}`}
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />Add New
            </button>
          </div>

          {mode === 'select' ? (
            <select
              value={form.rifle_id}
              onChange={e => handleRifleSelect(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none"
            >
              <option value="">— Select Rifle —</option>
              {rifles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>)}
            </select>
          ) : (
            <div className="space-y-2 p-3 bg-secondary/40 rounded-xl border border-border">
              {[
                ['name', 'Rifle Name *', 'text'],
                ['make', 'Make / Brand', 'text'],
                ['model', 'Model', 'text'],
                ['caliber', 'Caliber', 'text'],
                ['barrel_length', 'Barrel Length', 'text'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</label>
                  <input
                    value={newRifle[k]}
                    onChange={e => setNewRifle(r => ({ ...r, [k]: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Caliber */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Caliber *</label>
          <input
            value={form.caliber}
            onChange={e => set('caliber', e.target.value)}
            placeholder="e.g. .308 Win"
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Test Date</label>
            <input type="date" value={form.test_date} onChange={e => set('test_date', e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Range Date</label>
            <input type="date" value={form.range_date} onChange={e => set('range_date', e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none resize-none" />
        </div>

      </div>
    </GlobalModal>
  );
}