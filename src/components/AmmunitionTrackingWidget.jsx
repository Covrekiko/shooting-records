import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Zap } from 'lucide-react';

export default function AmmunitionTrackingWidget() {
  const [riflesToClean, setRiflesToClean] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const rifles = await base44.entities.Rifle.filter({ created_by: currentUser.email });
      const needsCleaning = rifles.filter(
        (r) => r.cleaning_reminder_threshold && r.rounds_since_cleaning >= r.cleaning_reminder_threshold
      );
      setRiflesToClean(needsCleaning.length);
    } catch (error) {
      console.error('Error loading widget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('/ammo-summary')}
      className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left w-full active:scale-95 transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Ammunition Tracking</p>
          <p className="text-xs text-muted-foreground mt-1">
            {riflesToClean > 0 ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                {riflesToClean} rifle(s) need cleaning
              </span>
            ) : (
              'Manage rifle & shotgun usage'
            )}
          </p>
        </div>
        <span className="text-slate-300 dark:text-slate-600 text-xl flex-shrink-0">›</span>
      </div>
    </button>
  );
}