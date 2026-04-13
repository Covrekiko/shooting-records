import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AddRifleForm({ rifles, ammunition, formData, setFormData }) {
  const [showForm, setShowForm] = useState(false);
  const [rifle, setRifle] = useState('');
  const [roundsFired, setRoundsFired] = useState('');
  const [distance, setDistance] = useState('');
  const [ammoId, setAmmoId] = useState('');
  const [ammoManual, setAmmoManual] = useState('');

  const handleAddRifle = () => {
    if (!rifle || !roundsFired || !distance) return;

    const selectedRifle = rifles[rifle];
    const selectedAmmo = ammoId ? ammunition.find(a => a.id === ammoId) : null;
    const ammoBrand = selectedAmmo?.brand || ammoManual;

    const newRifle = {
      rifle_id: rifle,
      rounds_fired: parseInt(roundsFired),
      meters_range: parseInt(distance),
      ammunition_brand: ammoBrand,
      caliber: selectedRifle?.caliber || '',
      bullet_type: selectedAmmo?.bullet_type || '',
      grain: selectedAmmo?.grain || '',
    };

    setFormData({
      ...formData,
      rifles_used: [...(formData.rifles_used || []), newRifle],
    });

    setRifle('');
    setRoundsFired('');
    setDistance('');
    setAmmoId('');
    setAmmoManual('');
    setShowForm(false);
  };

  return (
    <div>
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Rifle
        </button>
      ) : (
        <div className="space-y-3 p-3 bg-secondary/20 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">Select Rifle</label>
            <select
              value={rifle}
              onChange={(e) => setRifle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="">Choose a rifle</option>
              {Object.entries(rifles).map(([id, r]) => (
                <option key={id} value={id}>{r.name} ({r.caliber})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-2">Rounds Fired</label>
              <input
                type="number"
                min="0"
                value={roundsFired}
                onChange={(e) => setRoundsFired(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Distance (m)</label>
              <input
                type="number"
                min="0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ammunition</label>
            <select
              value={ammoId}
              onChange={(e) => setAmmoId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm mb-2"
            >
              <option value="">Select saved ammunition</option>
              {ammunition.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.brand} ({a.caliber})
                </option>
              ))}
            </select>
            {!ammoId && (
              <>
                <label className="text-xs text-muted-foreground block mb-1">Or enter manually:</label>
                <input
                  type="text"
                  placeholder="e.g. Federal .308"
                  value={ammoManual}
                  onChange={(e) => setAmmoManual(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddRifle}
              disabled={!rifle || !roundsFired || !distance}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-3 py-2 border border-border rounded-lg hover:bg-secondary text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}