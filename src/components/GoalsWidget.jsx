import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight } from 'lucide-react';

export default function GoalsWidget() {
  const [goals, setGoals] = useState([]);
  const [topGoals, setTopGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const user = await base44.auth.me();
      const userGoals = await base44.entities.Goal.filter({
        created_by: user.email,
        active: true,
      });

      setGoals(userGoals);
      setTopGoals(userGoals.slice(0, 3));
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (goals.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Personal Goals</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">Set goals to track your progress and stay motivated.</p>
        <Link
          to="/goals"
          className="text-primary hover:text-primary/80 font-semibold text-sm flex items-center gap-1"
        >
          Create your first goal
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Personal Goals</h2>
        </div>
        <Link
          to="/goals"
          className="text-primary hover:text-primary/80 font-semibold text-sm"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {topGoals.map(goal => (
          <GoalProgressItem key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}

function GoalProgressItem({ goal }) {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateProgress();
  }, [goal]);

  const calculateProgress = async () => {
    try {
      let currentValue = 0;
      const user = await base44.auth.me();

      if (goal.activity_type === 'target') {
        const records = await base44.entities.TargetShooting.filter({
          created_by: user.email,
        });
        
        if (goal.goal_type === 'rounds') {
          currentValue = records.reduce((sum, r) => sum + (r.rifles_used?.reduce((s, rf) => s + parseInt(rf.rounds_fired || 0), 0) || 0), 0);
        } else if (goal.goal_type === 'sessions') {
          currentValue = records.length;
        }
      } else if (goal.activity_type === 'clay') {
        const records = await base44.entities.ClayShooting.filter({
          created_by: user.email,
        });
        
        if (goal.goal_type === 'rounds') {
          currentValue = records.reduce((sum, r) => sum + (r.rounds_fired || 0), 0);
        } else if (goal.goal_type === 'sessions') {
          currentValue = records.length;
        }
      } else if (goal.activity_type === 'deer') {
        const records = await base44.entities.DeerManagement.filter({
          created_by: user.email,
        });
        
        if (goal.goal_type === 'sessions') {
          currentValue = records.length;
        } else if (goal.goal_type === 'rounds') {
          currentValue = records.reduce((sum, r) => sum + (parseInt(r.total_count) || 0), 0);
        }
      }

      const percentage = Math.min(100, (currentValue / goal.target_value) * 100);
      setProgress({ current: currentValue, percentage });
    } catch (error) {
      console.error('Error calculating progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const activityLabels = { target: 'Target', clay: 'Clay', deer: 'Deer' };

  if (loading) return null;

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{activityLabels[goal.activity_type]}</h3>
        <span className="text-xs font-bold text-primary">{progress.percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{progress.current.toFixed(0)} / {goal.target_value}</p>
    </div>
  );
}