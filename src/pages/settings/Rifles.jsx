import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import RifleCard from '@/components/RifleCard';
import RifleCleaningLog from '@/components/RifleCleaningLog';
import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Rifles() {
  const [rifles, setRifles] = useState([]);
  const [cleaning_logs, setCleaningLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    caliber: '',
    serial_number: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const [riflesList, logsList] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
        base44.entities.CleaningHistory.filter({ created_by: currentUser.email }).catch(() => []),
      ]);
      setRifles(riflesList);
      setCleaningLogs(logsList || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await base44.entities.Rifle.update(editingId, formData);
        setRifles(rifles.map((r) => (r.id === editingId ? { ...r, ...formData } : r)));
        setEditingId(null);
      } else {
        const newRifle = await base44.entities.Rifle.create(formData);
        setRifles([...rifles, newRifle]);
      }
      setFormData({ name: '', make: '', model: '', caliber: '', serial_number: '', notes: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving rifle:', error);
      alert('Error saving rifle: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Rifle.delete(id);
      setRifles(rifles.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting rifle:', error);
      alert('Error deleting rifle: ' + error.message);
    }
  };

  const handleClean = async (rifle) => {
    try {
      const now = new Date();
      const roundsSinceClean = (rifle.total_rounds_fired || 0) - (rifle.rounds_at_last_cleaning || 0);

      // Create cleaning log entry
      const logEntry = {
        rifle_id: rifle.id,
        rifle_name: rifle.name,
        total_rounds_at_cleaning: rifle.total_rounds_fired || 0,
        rounds_since_previous_cleaning: roundsSinceClean,
        notes: '',
      };

      await base44.entities.CleaningHistory.create(logEntry);

      // Update rifle: reset rounds_at_last_cleaning and set last_cleaning_date
      await base44.entities.Rifle.update(rifle.id, {
        rounds_at_last_cleaning: rifle.total_rounds_fired || 0,
        last_cleaning_date: now.toISOString().split('T')[0],
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error marking rifle clean:', error);
      alert('Error marking rifle clean: ' + error.message);
    }
  };

  const startEdit = (rifle) => {
    setFormData(rifle);
    setEditingId(rifle.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        <ChildScreenHeader title="Rifles" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <ChildScreenHeader title="Rifles" />
      <main className="max-w-5xl mx-auto px-4 py-8 mobile-page-padding">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Manage Your Rifle Collection
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track your rifles, round counts, maintenance, and cleaning history.
          </p>
        </div>

        {/* Add Rifle Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', make: '', model: '', caliber: '', serial_number: '', notes: '' });
            setShowForm(!showForm);
          }}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center gap-2 mb-6 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Rifle
        </motion.button>

        {/* Form */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-8 space-y-4"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {editingId ? 'Edit Rifle' : 'Add New Rifle'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Rifle Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
              <input
                type="text"
                placeholder="Make / Brand *"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
              <input
                type="text"
                placeholder="Model *"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
              <input
                type="text"
                placeholder="Caliber *"
                value={formData.caliber}
                onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
              <input
                type="text"
                placeholder="Serial Number (optional)"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 md:col-span-2"
              />
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              rows="3"
            />
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Update Rifle' : 'Save Rifle'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.form>
        )}

        {/* Rifles Grid */}
        {rifles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {rifles.map((rifle) => (
                <RifleCard
                  key={rifle.id}
                  rifle={rifle}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onClean={handleClean}
                />
              ))}
            </div>

            {/* Cleaning History */}
            {cleaning_logs.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  Cleaning History
                </h2>
                <RifleCleaningLog logs={cleaning_logs} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">No rifles added yet.</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Your First Rifle
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
}