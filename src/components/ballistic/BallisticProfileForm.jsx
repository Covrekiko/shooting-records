import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X } from 'lucide-react';

const DESIGN = {
  INPUT: 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
  LABEL: 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1',
  BUTTON_PRIMARY: 'px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
  BUTTON_SECONDARY: 'px-4 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors',
};

// Unit conversion helpers
const gramsToGrains = (g) => g * 15.4324;
const msToFps = (ms) => ms * 3.28084;

export default function BallisticProfileForm({ onSave, onCancel, initialProfile = null }) {
  const [rifles, setRifles] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [formData, setFormData] = useState({
    profile_name: initialProfile?.profile_name || '',
    rifle_id: initialProfile?.rifle_id || '',
    scope_id: initialProfile?.scope_id || '',
    ammunition_type: initialProfile?.ammunition_type || 'factory',
    ammunition_id: initialProfile?.ammunition_id || '',
    caliber: initialProfile?.caliber || '',
    bullet_name: initialProfile?.bullet_name || '',
    bullet_weight_grains: initialProfile?.bullet_weight_grains || '',
    muzzle_velocity_fps: initialProfile?.muzzle_velocity_fps || '',
    ballistic_coefficient_g1: initialProfile?.ballistic_coefficient_g1 || '',
    zero_distance_meters: initialProfile?.zero_distance_meters || 100,
    sight_height_cm: initialProfile?.sight_height_cm || 5,
    scope_click_value: initialProfile?.scope_click_value || '0.25_MOA',
    notes: initialProfile?.notes || '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [riflesList, scopesList, ammoList] = await Promise.all([
          base44.entities.Rifle.list(),
          base44.entities.ScopeProfile.list(),
          base44.entities.Ammunition.list(),
        ]);
        setRifles(riflesList);
        setScopes(scopesList);
        setAmmunition(ammoList);
      } catch (e) {
        console.warn('Could not load data:', e);
      }
    }
    loadData();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.profile_name || !formData.rifle_id || !formData.scope_id || !formData.ballistic_coefficient_g1 || !formData.muzzle_velocity_fps || !formData.bullet_weight_grains) {
      alert('Please fill in all required fields');
      return;
    }

    const data = {
      ...formData,
      bullet_weight_grains: parseFloat(formData.bullet_weight_grains),
      bullet_weight_grams: parseFloat(formData.bullet_weight_grains) / 15.4324,
      muzzle_velocity_fps: parseFloat(formData.muzzle_velocity_fps),
      muzzle_velocity_ms: parseFloat(formData.muzzle_velocity_fps) / 3.28084,
      zero_distance_meters: parseInt(formData.zero_distance_meters),
      sight_height_cm: parseFloat(formData.sight_height_cm),
      ballistic_coefficient_g1: parseFloat(formData.ballistic_coefficient_g1),
      rifle_name: rifles.find(r => r.id === formData.rifle_id)?.name || '',
      scope_name: scopes.find(s => s.id === formData.scope_id)?.scope_model || '',
    };

    if (initialProfile) {
      await base44.entities.BallisticProfile.update(initialProfile.id, data);
    } else {
      await base44.entities.BallisticProfile.create(data);
    }

    onSave();
  };

  const selectedRifle = rifles.find(r => r.id === formData.rifle_id);

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      <div>
        <label className={DESIGN.LABEL}>Profile Name *</label>
        <input
          type="text"
          value={formData.profile_name}
          onChange={(e) => handleChange('profile_name', e.target.value)}
          placeholder="e.g., 6.5CM Factory 140gr"
          className={DESIGN.INPUT}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={DESIGN.LABEL}>Rifle *</label>
          <select value={formData.rifle_id} onChange={(e) => handleChange('rifle_id', e.target.value)} className={DESIGN.INPUT}>
            <option value="">Select rifle</option>
            {rifles.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={DESIGN.LABEL}>Scope *</label>
          <select value={formData.scope_id} onChange={(e) => handleChange('scope_id', e.target.value)} className={DESIGN.INPUT}>
            <option value="">Select scope</option>
            {scopes.map(s => (
              <option key={s.id} value={s.id}>{s.scope_brand} {s.scope_model}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={DESIGN.LABEL}>Ammunition Type *</label>
        <div className="flex gap-2">
          {['factory', 'hand_load'].map(type => (
            <button
              key={type}
              onClick={() => handleChange('ammunition_type', type)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                formData.ammunition_type === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {type === 'factory' ? 'Factory Load' : 'Hand Load'}
            </button>
          ))}
        </div>
      </div>

      {formData.ammunition_type === 'factory' && (
        <div>
          <label className={DESIGN.LABEL}>Select Ammunition</label>
          <select value={formData.ammunition_id} onChange={(e) => {
            const ammo = ammunition.find(a => a.id === e.target.value);
            if (ammo) {
              handleChange('ammunition_id', e.target.value);
              handleChange('caliber', ammo.caliber || '');
              handleChange('bullet_name', ammo.bullet_type || '');
            }
          }} className={DESIGN.INPUT}>
            <option value="">Select ammunition</option>
            {ammunition.filter(a => !selectedRifle || !selectedRifle.caliber || a.caliber === selectedRifle.caliber).map(a => (
              <option key={a.id} value={a.id}>{a.brand} {a.caliber} - {a.bullet_type}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={DESIGN.LABEL}>Caliber *</label>
          <input type="text" value={formData.caliber} onChange={(e) => handleChange('caliber', e.target.value)} placeholder="6.5 Creedmoor" className={DESIGN.INPUT} />
        </div>
        <div>
          <label className={DESIGN.LABEL}>Bullet Name</label>
          <input type="text" value={formData.bullet_name} onChange={(e) => handleChange('bullet_name', e.target.value)} placeholder="ABLR, ELDM, etc" className={DESIGN.INPUT} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={DESIGN.LABEL}>Bullet Weight (gr) *</label>
          <input type="number" value={formData.bullet_weight_grains} onChange={(e) => handleChange('bullet_weight_grains', e.target.value)} placeholder="140" className={DESIGN.INPUT} />
        </div>
        <div>
          <label className={DESIGN.LABEL}>Muzzle Velocity (fps) *</label>
          <input type="number" value={formData.muzzle_velocity_fps} onChange={(e) => handleChange('muzzle_velocity_fps', e.target.value)} placeholder="2700" className={DESIGN.INPUT} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={DESIGN.LABEL}>BC (G1) *</label>
          <input type="number" step="0.001" value={formData.ballistic_coefficient_g1} onChange={(e) => handleChange('ballistic_coefficient_g1', e.target.value)} placeholder="0.475" className={DESIGN.INPUT} />
        </div>
        <div>
          <label className={DESIGN.LABEL}>Zero Distance (m) *</label>
          <input type="number" value={formData.zero_distance_meters} onChange={(e) => handleChange('zero_distance_meters', e.target.value)} placeholder="100" className={DESIGN.INPUT} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={DESIGN.LABEL}>Sight Height (cm)</label>
          <input type="number" step="0.5" value={formData.sight_height_cm} onChange={(e) => handleChange('sight_height_cm', e.target.value)} placeholder="5" className={DESIGN.INPUT} />
        </div>
        <div>
          <label className={DESIGN.LABEL}>Scope Click Value *</label>
          <select value={formData.scope_click_value} onChange={(e) => handleChange('scope_click_value', e.target.value)} className={DESIGN.INPUT}>
            <option value="0.25_MOA">1/4 MOA</option>
            <option value="0.125_MOA">1/8 MOA</option>
            <option value="0.1_MRAD">0.1 MRAD</option>
          </select>
        </div>
      </div>

      <div>
        <label className={DESIGN.LABEL}>Notes</label>
        <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Add any notes..." rows="3" className={DESIGN.INPUT} />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-background">
        <button onClick={onCancel} className={DESIGN.BUTTON_SECONDARY}>
          Cancel
        </button>
        <button onClick={handleSave} className={DESIGN.BUTTON_PRIMARY}>
          Save Profile
        </button>
      </div>
    </div>
  );
}