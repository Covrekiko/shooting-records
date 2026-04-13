import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import GoalCard from '@/components/GoalCard';
import { Plus, Trophy } from 'lucide-react';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

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
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>

        {showForm && (
          <GoalForm onSuccess={() => {
            loadGoals();
            setShowForm(false);
          }} onCancel={() => setShowForm(false)} />
        )}

        {goals.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
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
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Activity Type</label>
            <select
              value={formData.activity_type}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  activity_type: e.target.value,
                  goal_type: goalTypesByActivity[e.target.value][0].value,
                });
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="target">Target Shooting</option>
              <option value="clay">Clay Shooting</option>
              <option value="deer">Deer Management</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Goal Type</label>
            <select
              value={formData.goal_type}
              onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              {goalTypesByActivity[formData.activity_type].map(gt => (
                <option key={gt.value} value={gt.value}>{gt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Value</label>
            <input
              type="number"
              step="0.1"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              placeholder="e.g., 85"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes about this goal..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
            rows="2"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-lg hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}