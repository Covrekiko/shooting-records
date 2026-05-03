import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import NumberInput from '@/components/ui/NumberInput.jsx';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { Plus, Trash2, Edit2, Download, FileUp } from 'lucide-react';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
const lbl = 'block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5';
import AmmoEditModal from '@/components/AmmoEditModal';
import { generateAmmunitionInventoryPDF } from '@/utils/pdfGenerators';
import BulletReferencePicker from '@/components/reference/BulletReferencePicker';
import BulletReferenceImporter from '@/components/reference/BulletReferenceImporter';
import CaliberTypeahead from '@/components/CaliberTypeahead';
import { normalizeCaliber } from '@/utils/caliberCatalog';

export default function Ammunition() {
  const [ammunition, setAmmunition] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAmmo, setEditingAmmo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    caliber: '',
    bullet_type: '',
    grain: '',
    quantity_in_stock: '',
    cost_per_unit: '',
    date_purchased: '',
    notes: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const ammoList = await base44.entities.Ammunition.filter({ created_by: currentUser.email });
        setAmmunition(ammoList);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleAddAmmunition = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      const newAmmo = await base44.entities.Ammunition.create({ ...formData, caliber: normalizeCaliber(formData.caliber) });
      setAmmunition([...ammunition, newAmmo]);
      setFormData({ brand: '', caliber: '', bullet_type: '', grain: '', quantity_in_stock: '', cost_per_unit: '', date_purchased: '', notes: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding ammunition:', error);
    }
  };

  const handleDeleteAmmunition = async (id) => {
    if (confirm('Delete this ammunition?')) {
      try {
        await base44.entities.Ammunition.delete(id);
        setAmmunition(ammunition.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting ammunition:', error);
      }
    }
  };

  const handleEditAmmo = (ammo) => {
    setEditingAmmo(ammo);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      const normalizedData = { ...updatedData, caliber: normalizeCaliber(updatedData.caliber) };
      await base44.entities.Ammunition.update(editingAmmo.id, normalizedData);
      setAmmunition(ammunition.map(a => a.id === editingAmmo.id ? { ...a, ...normalizedData } : a));
      setShowEditModal(false);
      setEditingAmmo(null);
    } catch (error) {
      console.error('Error saving ammunition:', error);
    }
  };

  const handleExportPDF = () => {
    const doc = generateAmmunitionInventoryPDF(ammunition);
    doc.save('ammunition-inventory.pdf');
  };



  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <ChildScreenHeader title="Ammunition" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Ammunition" />
      <main className="max-w-4xl mx-auto px-4 py-8 mobile-page-padding">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ammunition Management</h1>
          <p className="text-muted-foreground">Manage ammunition for your rifles</p>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Ammunition
          </button>
          <button
            onClick={() => setShowImporter(true)}
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <FileUp className="w-5 h-5" />
            Import Reference Feed
          </button>
          {ammunition.length > 0 && (
            <button
              onClick={handleExportPDF}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>
          )}
        </div>

        <GlobalModal
          open={showForm}
          onClose={() => setShowForm(false)}
          title="Add Ammunition"
          onSubmit={handleAddAmmunition}
          primaryAction="Save Ammunition"
          secondaryAction="Cancel"
        >
          <div className="space-y-4">
            <div>
              <label className={lbl}>Bullet Reference Database <span className="font-normal normal-case text-muted-foreground">(optional autofill)</span></label>
              <BulletReferencePicker onSelect={(b) => setFormData(f => ({ ...f, brand: b.manufacturer, caliber: b.calibre || f.caliber, bullet_type: b.bullet_type || f.bullet_type, grain: b.weight_grains ? String(b.weight_grains) : f.grain }))} onClear={() => {}} />
            </div>
            <div><label className={lbl}>Brand *</label><input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className={inp} required /></div>
            <div><label className={lbl}>Caliber (optional)</label><CaliberTypeahead placeholder="e.g., .303 British, .308 Win" value={formData.caliber} onChange={(caliber) => setFormData({ ...formData, caliber })} className={inp} /></div>
            <div><label className={lbl}>Bullet Type (optional)</label><input type="text" value={formData.bullet_type} onChange={(e) => setFormData({ ...formData, bullet_type: e.target.value })} className={inp} /></div>
            <div><label className={lbl}>Grain (optional)</label><input type="text" value={formData.grain} onChange={(e) => setFormData({ ...formData, grain: e.target.value })} className={inp} /></div>
            <NumberInput label="Quantity" value={formData.quantity_in_stock} onChange={(v) => setFormData({ ...formData, quantity_in_stock: v })} placeholder="0" unit="rounds" />
            <NumberInput label="Cost per Round" value={formData.cost_per_unit} onChange={(v) => setFormData({ ...formData, cost_per_unit: v })} placeholder="0.00" allowDecimal unit="£" />
            <div><label className={lbl}>Purchase Date</label><input type="date" value={formData.date_purchased} onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })} className={inp} /></div>
            <div><label className={lbl}>Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={inp} rows="2" placeholder="Additional notes" /></div>
          </div>
        </GlobalModal>

        {ammunition.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No ammunition saved yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ammunition.map((ammo) => (
              <div key={ammo.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mt-1">Brand: {ammo.brand}</p>
                  {ammo.caliber && (
                    <p className="text-sm text-muted-foreground">Caliber: {ammo.caliber}</p>
                  )}
                  {ammo.bullet_type && (
                    <p className="text-sm text-muted-foreground">Bullet Type: {ammo.bullet_type}</p>
                  )}
                  {ammo.grain && (
                    <p className="text-sm text-muted-foreground">Grain: {ammo.grain}</p>
                  )}
                </div>
                <div className="text-right mr-3">
                  {ammo.quantity_in_stock !== undefined && (
                    <p className="text-sm font-bold text-foreground">{ammo.quantity_in_stock} <span className="text-xs font-normal text-muted-foreground">{ammo.units || 'rounds'}</span></p>
                  )}
                  {ammo.cost_per_unit > 0 && (
                    <p className="text-xs text-muted-foreground">£{ammo.cost_per_unit.toFixed(2)}/rd</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAmmo(ammo)}
                    className="px-3 py-1 text-sm bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAmmunition(ammo.id)}
                    className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        <AmmoEditModal
          ammo={editingAmmo}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAmmo(null);
          }}
          onSave={handleSaveEdit}
        />

        {/* Import Modal */}
        {showImporter && (
          <BulletReferenceImporter
            onClose={() => setShowImporter(false)}
            onImportComplete={() => {
              // Importer handles its own confirmation
            }}
          />
        )}
      </main>
    </div>
  );
}