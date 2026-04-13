import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, TrendingUp } from 'lucide-react';

export default function GoalCard({ goal, onDelete }) {
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
        
        if (goal.goal_type === 'accuracy') {
          const totalRounds = records.reduce((sum, r) => sum + (r.rifles_used?.reduce((s, rf) => s + parseInt(rf.rounds_fired || 0), 0) || 0), 0);
          currentValue = totalRounds > 0 ? Math.min(100, (totalRounds / goal.target_value) * 100) : 0;
        } else if (goal.goal_type === 'rounds') {
          currentValue = records.reduce((sum, r) => sum + (r.rifles_used?.reduce((s, rf) => s + parseInt(rf.rounds_fired || 0), 0) || 0), 0);
        } else if (goal.goal_type === 'sessions') {
          currentValue = records.length;
        }
      } else if (goal.activity_type === 'clay') {
        const records = await base44.entities.ClayShooting.filter({
          created_by: user.email,
        });
        
        if (goal.goal_type === 'accuracy') {
          const totalRounds = records.reduce((sum, r) => sum + (r.rounds_fired || 0), 0);
          currentValue = totalRounds > 0 ? Math.min(100, (totalRounds / goal.target_value) * 100) : 0;
        } else if (goal.goal_type === 'rounds') {
          currentValue = records.reduce((sum, r) => sum + (r.rounds_fired || 0), 0);
        } else if (goal.goal_type === 'sessions') {
          currentValue = records.length;
        }
      } else if (goal.activity_type === 'deer') {
        const records = await base44.entities.DeerManagement.filter({
          created_by: user.email,
        });
        
        if (goal.goal_type === 'success_rate') {
          const successful = records.filter(r => r.total_count && parseInt(r.total_count) > 0).length;
          currentValue = records.length > 0 ? (successful / records.length) * 100 : 0;
        } else if (goal.goal_type === 'sessions') {
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

  const getActivityLabel = (type) => {
    const labels = { target: 'Target Shooting', clay: 'Clay Shooting', deer: 'Deer Management' };
    return labels[type] || type;
  };

  const getGoalTypeLabel = (type) => {
    const labels = {
      accuracy: 'Accuracy %',
      success_rate: 'Success Rate %',
      sessions: 'Sessions',
      rounds: 'Rounds',
      distance: 'Distance (m)',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-secondary rounded w-2/3"></div>
          <div className="h-8 bg-secondary rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase">{getActivityLabel(goal.activity_type)}</p>
          <h3 className="text-lg font-bold mt-1">{getGoalTypeLabel(goal.goal_type)}</h3>
          {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-lg font-bold text-primary">{progress.percentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Current</p>
          <p className="text-lg font-bold text-primary">{progress.current.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Target</p>
          <p className="text-lg font-bold">{goal.target_value}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Period</p>
          <p className="text-sm font-semibold capitalize">{goal.period}</p>
        </div>
      </div>

      {progress.percentage >= 100 && (
        <div className="mt-4 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Goal Achieved! 🎉
        </div>
      )}
    </div>
  );
}