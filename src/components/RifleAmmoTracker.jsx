import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Crosshair, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function RifleAmmoTracker() {
  const [rifles, setRifles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadRifles();
  }, []);

  const loadRifles = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const riflesList = await base44.entities.Rifle.filter({ created_by: currentUser.email });
      setRifles(riflesList);
    } catch (error) {
      console.error('Error loading rifles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCleaned = async (rifleId) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await base44.entities.Rifle.update(rifleId, {
        rounds_since_cleaning: 0,
        last_cleaning_date: today,
      });
      await loadRifles();
    } catch (error) {
      console.error('Error marking cleaned:', error);
    }
  };

  const getRiflesToClean = () => {
    return rifles.filter(
      (r) => r.cleaning_reminder_threshold && r.rounds_since_cleaning >= r.cleaning_reminder_threshold
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const riflesNeedingCleaning = getRiflesToClean();

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          Rifle Tracking
        </h3>
      </div>

      {rifles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rifles tracked</p>
      ) : (
        <div className="space-y-3">
          {riflesNeedingCleaning.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">{riflesNeedingCleaning.length} rifle(s) need cleaning</p>
                  {riflesNeedingCleaning.map((rifle) => (
                    <div key={rifle.id} className="mt-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-700 rounded p-2">
                      <span className="text-xs font-medium">{rifle.name}</span>
                      <button
                        onClick={() => handleMarkCleaned(rifle.id)}
                        className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                      >
                        Mark Clean
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rifles
              .filter((r) => r.total_rounds_fired > 0 || r.cleaning_reminder_threshold)
              .map((rifle) => {
                const isNearLimit =
                  rifle.cleaning_reminder_threshold && 
                  rifle.rounds_since_cleaning >= rifle.cleaning_reminder_threshold * 0.8;

                return (
                  <div
                    key={rifle.id}
                    className={`p-3 rounded-lg border ${
                      isNearLimit
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'
                        : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold">{rifle.name}</p>
                        <p className="text-xs text-muted-foreground">{rifle.caliber}</p>
                      </div>
                      {isNearLimit && <Zap className="w-4 h-4 text-amber-600" />}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total Rounds:</span>
                        <p className="font-semibold">{rifle.total_rounds_fired || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Since Cleaning:</span>
                        <p className="font-semibold">{rifle.rounds_since_cleaning || 0}</p>
                      </div>
                    </div>

                    {rifle.cleaning_reminder_threshold && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Cleaning Target:</span>
                          <span className="font-semibold">{rifle.cleaning_reminder_threshold} rounds</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isNearLimit ? 'bg-amber-600' : 'bg-primary'
                            }`}
                            style={{
                              width: `${Math.min(
                                (rifle.rounds_since_cleaning / rifle.cleaning_reminder_threshold) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {rifle.last_cleaning_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last cleaned: {format(new Date(rifle.last_cleaning_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}