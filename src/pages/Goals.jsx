import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import GoalCard from '@/components/GoalCard';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import { Plus, Trophy } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  useBodyScrollLock(showForm);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const userGoals = await base44.entities.Goal.filter({
        created_by: currentUser.email,
      });

      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await base44.entities.Goal.delete(id);
      setGoals(goals.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const pullToRefresh = usePullToRefresh(loadGoals, { disabled: showForm });

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold">Personal Goals</h1>
            </div>
            <p className="text-muted-foreground">Set and track goals for each shooting activity</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>

        {showForm && createPortal(
          <div className="fixed inset-0 z-[50001] bg-black/50 flex items-end sm:items-center justify-center">
            <div className="bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-y-auto max-h-[90dvh] border border-slate-200/70 dark:border-slate-700 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 sm:hidden" />
              <GoalForm onSuccess={() => { loadGoals(); setShowForm(false); }} onCancel={() => setShowForm(false)} />
            </div>
          </div>,
          document.body
        )}

        {goals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No goals yet. Create your first goal to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GoalForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    activity_type: 'target',
    goal_type: 'accuracy',
    target_value: '',
    period: 'monthly',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.Goal.create({
        ...formData,
        target_value: parseFloat(formData.target_value),
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const goalTypesByActivity = {
    target: [
      { value: 'accuracy', label: 'Accuracy %' },
      { value: 'rounds', label: 'Total Rounds' },
      { value: 'sessions', label: 'Sessions' },
      { value: 'distance', label: 'Average Distance (m)' },
    ],
    clay: [
      { value: 'accuracy', label: 'Hit Rate %' },
      { value: 'rounds', label: 'Total Rounds' },
      { value: 'sessions', label: 'Number of Sessions' },
    ],
    deer: [
      { value: 'success_rate', label: 'Success Rate %' },
      { value: 'sessions', label: 'Number of Outings' },
      { value: 'rounds', label: 'Total Shots' },
    ],
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Activity Type</label>
            <BottomSheetSelect
              value={formData.activity_type}
              onChange={(val) => setFormData({ ...formData, activity_type: val, goal_type: goalTypesByActivity[val][0].value })}
              placeholder="Select activity"
              options={[
                { value: 'target', label: 'Target Shooting' },
                { value: 'clay', label: 'Clay Shooting' },
                { value: 'deer', label: 'Deer Management' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Goal Type</label>
            <BottomSheetSelect
              value={formData.goal_type}
              onChange={(val) => setFormData({ ...formData, goal_type: val })}
              placeholder="Select goal type"
              options={goalTypesByActivity[formData.activity_type].map(gt => ({ value: gt.value, label: gt.label }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Value</label>
            <input
              type="number"
              step="0.1"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              placeholder="e.g., 85"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Period</label>
            <BottomSheetSelect
              value={formData.period}
              onChange={(val) => setFormData({ ...formData, period: val })}
              placeholder="Select period"
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes about this goal..."
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows="2"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}