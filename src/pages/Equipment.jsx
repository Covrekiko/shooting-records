import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Edit2, Trash2, Crosshair, Mountain, Building2, MapPin } from 'lucide-react';

export default function Equipment() {
  const [activeTab, setActiveTab] = useState('rifles');
  const [rifles, setRifles] = useState([]);
  const [shotguns, setShotguns] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadAllEquipment();
  }, []);

  const loadAllEquipment = async () => {
    try {
      const currentUser = await base44.auth.me();
      const [riflesList, shotgunsList, clubsList, locationsList] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
        base44.entities.Shotgun.filter({ created_by: currentUser.email }),
        base44.entities.Club.filter({ created_by: currentUser.email }),
        base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
      ]);
      setRifles(riflesList);
      setShotguns(shotgunsList);
      setClubs(clubsList);
      setLocations(locationsList);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Delete this item?')) return;
    try {
      const entityName = 
        type === 'rifle' ? 'Rifle' :
        type === 'shotgun' ? 'Shotgun' :
        type === 'club' ? 'Club' : 'DeerLocation';
      
      await base44.entities[entityName].delete(id);
      
      if (type === 'rifle') setRifles(rifles.filter(r => r.id !== id));
      else if (type === 'shotgun') setShotguns(shotguns.filter(s => s.id !== id));
      else if (type === 'club') setClubs(clubs.filter(c => c.id !== id));
      else setLocations(locations.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const entityName =
        activeTab === 'rifles' ? 'Rifle' :
        activeTab === 'shotguns' ? 'Shotgun' :
        activeTab === 'clubs' ? 'Club' : 'DeerLocation';

      if (editingId) {
        await base44.entities[entityName].update(editingId, formData);
        
        if (activeTab === 'rifles') {
          setRifles(rifles.map(r => r.id === editingId ? { ...r, ...formData } : r));
        } else if (activeTab === 'shotguns') {
          setShotguns(shotguns.map(s => s.id === editingId ? { ...s, ...formData } : s));
        } else if (activeTab === 'clubs') {
          setClubs(clubs.map(c => c.id === editingId ? { ...c, ...formData } : c));
        } else {
          setLocations(locations.map(l => l.id === editingId ? { ...l, ...formData } : l));
        }
        setEditingId(null);
      } else {
        const newItem = await base44.entities[entityName].create(formData);
        
        if (activeTab === 'rifles') setRifles([...rifles, newItem]);
        else if (activeTab === 'shotguns') setShotguns([...shotguns, newItem]);
        else if (activeTab === 'clubs') setClubs([...clubs, newItem]);
        else setLocations([...locations, newItem]);
      }
      
      setFormData({});
      setShowForm(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Equipment Management</h1>
          <p className="text-muted-foreground">Manage your firearms and shooting facilities</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {[
            { id: 'rifles', label: 'Rifles', icon: Crosshair },
            { id: 'shotguns', label: 'Shotguns', icon: Mountain },
            { id: 'clubs', label: 'Clubs', icon: Building2 },
            { id: 'locations', label: 'Deer Locations', icon: MapPin },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleAddNew}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add {activeTab === 'rifles' ? 'Rifle' : activeTab === 'shotguns' ? 'Shotgun' : activeTab === 'clubs' ? 'Club' : 'Location'}
        </button>

        {showForm && (
          <EquipmentForm
            type={activeTab}
            data={formData}
            onSubmit={handleSubmit}
            onChange={setFormData}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="space-y-3">
          {activeTab === 'rifles' && rifles.map(rifle => (
            <EquipmentItem
              key={rifle.id}
              item={rifle}
              type="rifle"
              title={rifle.name}
              subtitle={`${rifle.make} ${rifle.model} - ${rifle.caliber}`}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {activeTab === 'shotguns' && shotguns.map(shotgun => (
            <EquipmentItem
              key={shotgun.id}
              item={shotgun}
              type="shotgun"
              title={shotgun.name}
              subtitle={`${shotgun.make} ${shotgun.model} - ${shotgun.gauge}`}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {activeTab === 'clubs' && clubs.map(club => (
            <EquipmentItem
              key={club.id}
              item={club}
              type="club"
              title={club.name}
              subtitle={`${club.type} • ${club.location}`}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {activeTab === 'locations' && locations.map(location => (
            <EquipmentItem
              key={location.id}
              item={location}
              type="location"
              title={location.place_name}
              subtitle={location.location || 'No coordinates'}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {((activeTab === 'rifles' && rifles.length === 0) ||
          (activeTab === 'shotguns' && shotguns.length === 0) ||
          (activeTab === 'clubs' && clubs.length === 0) ||
          (activeTab === 'locations' && locations.length === 0)) && !showForm && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No {activeTab} found. Add one to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function EquipmentItem({ item, type, title, subtitle, onEdit, onDelete }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item.id, type)}
          className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EquipmentForm({ type, data, onSubmit, onChange, onCancel }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">
        {data.id ? 'Edit' : 'Add'} {type === 'rifles' ? 'Rifle' : type === 'shotguns' ? 'Shotgun' : type === 'clubs' ? 'Club' : 'Location'}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        {type === 'rifles' && (
          <>
            <input
              type="text"
              placeholder="Name"
              value={data.name || ''}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Make"
              value={data.make || ''}
              onChange={(e) => onChange({ ...data, make: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Model"
              value={data.model || ''}
              onChange={(e) => onChange({ ...data, model: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Caliber"
              value={data.caliber || ''}
              onChange={(e) => onChange({ ...data, caliber: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Serial Number"
              value={data.serial_number || ''}
              onChange={(e) => onChange({ ...data, serial_number: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
            <textarea
              placeholder="Notes"
              value={data.notes || ''}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="2"
            />
          </>
        )}

        {type === 'shotguns' && (
          <>
            <input
              type="text"
              placeholder="Name"
              value={data.name || ''}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Make"
              value={data.make || ''}
              onChange={(e) => onChange({ ...data, make: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Model"
              value={data.model || ''}
              onChange={(e) => onChange({ ...data, model: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Gauge"
              value={data.gauge || ''}
              onChange={(e) => onChange({ ...data, gauge: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Serial Number"
              value={data.serial_number || ''}
              onChange={(e) => onChange({ ...data, serial_number: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
            <textarea
              placeholder="Notes"
              value={data.notes || ''}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="2"
            />
          </>
        )}

        {type === 'clubs' && (
          <>
            <input
              type="text"
              placeholder="Club Name"
              value={data.name || ''}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <select
              value={data.type || ''}
              onChange={(e) => onChange({ ...data, type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            >
              <option value="">Select Type</option>
              <option value="Target Shooting">Target Shooting</option>
              <option value="Clay Shooting">Clay Shooting</option>
              <option value="Both">Both</option>
            </select>
            <input
              type="text"
              placeholder="Location"
              value={data.location || ''}
              onChange={(e) => onChange({ ...data, location: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <textarea
              placeholder="Notes"
              value={data.notes || ''}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="2"
            />
          </>
        )}

        {type === 'locations' && (
          <>
            <input
              type="text"
              placeholder="Place Name"
              value={data.place_name || ''}
              onChange={(e) => onChange({ ...data, place_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Location (lat,lon)"
              value={data.location || ''}
              onChange={(e) => onChange({ ...data, location: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <textarea
              placeholder="Notes"
              value={data.notes || ''}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="2"
            />
          </>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}