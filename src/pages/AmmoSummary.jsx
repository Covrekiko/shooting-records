import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, AlertCircle, CheckCircle2, Crosshair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function AmmoSummary() {
  const [rifles, setRifles] = useState([]);
  const [shotguns, setShotguns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const [riflesList, shotgunsList] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
        base44.entities.Shotgun.filter({ created_by: currentUser.email }),
      ]);
      setRifles(riflesList);
      setShotguns(shotgunsList);
    } catch (error) {
      console.error('Error loading data:', error);
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
      await loadData();
    } catch (error) {
      console.error('Error marking cleaned:', error);
    }
  };

  const riflesNeedingCleaning = rifles.filter(
    (r) => r.cleaning_reminder_threshold && r.rounds_since_cleaning >= r.cleaning_reminder_threshold
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 pt-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Ammunition Summary</h1>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Cleaning Alerts */}
          {riflesNeedingCleaning.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
                    {riflesNeedingCleaning.length} Rifle(s) Need Cleaning
                  </h2>
                  <div className="space-y-2">
                    {riflesNeedingCleaning.map((rifle) => (
                      <div
                        key={rifle.id}
                        className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-sm">{rifle.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {rifle.rounds_since_cleaning} / {rifle.cleaning_reminder_threshold} rounds
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarkCleaned(rifle.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors"
                        >
                          Mark Clean
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rifles Section */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              Rifles ({rifles.length})
            </h2>
            <div className="grid gap-4">
              {rifles.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No rifles configured</p>
              ) : (
                rifles.map((rifle) => {
                  const cleaningStatus =
                    rifle.cleaning_reminder_threshold && rifle.rounds_since_cleaning >= rifle.cleaning_reminder_threshold
                      ? 'needs_cleaning'
                      : rifle.last_cleaning_date
                      ? 'clean'
                      : 'unknown';

                  return (
                    <div
                      key={rifle.id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{rifle.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {rifle.make} {rifle.model} • {rifle.caliber}
                          </p>
                        </div>
                        {cleaningStatus === 'needs_cleaning' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-600">Needs Cleaning</span>
                          </div>
                        )}
                        {cleaningStatus === 'clean' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-green-600">Clean</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Total Rounds</p>
                          <p className="text-2xl font-bold">{rifle.total_rounds_fired || 0}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Since Cleaning</p>
                          <p className="text-2xl font-bold">{rifle.rounds_since_cleaning || 0}</p>
                        </div>
                        {rifle.cleaning_reminder_threshold && (
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Target</p>
                            <p className="text-2xl font-bold">{rifle.cleaning_reminder_threshold}</p>
                          </div>
                        )}
                        {rifle.last_cleaning_date && (
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Last Cleaned</p>
                            <p className="text-xs font-semibold">{format(new Date(rifle.last_cleaning_date), 'MMM d')}</p>
                          </div>
                        )}
                      </div>

                      {rifle.cleaning_reminder_threshold && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">Cleaning Progress</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(
                                (rifle.rounds_since_cleaning / rifle.cleaning_reminder_threshold) * 100
                              )}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                cleaningStatus === 'needs_cleaning' ? 'bg-amber-600' : 'bg-primary'
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
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Shotguns Section */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Shotguns ({shotguns.length})
            </h2>
            <div className="grid gap-4">
              {shotguns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No shotguns configured</p>
              ) : (
                shotguns.map((shotgun) => (
                  <div
                    key={shotgun.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5"
                  >
                    <div>
                      <h3 className="font-bold text-lg">{shotgun.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {shotgun.make} {shotgun.model} • {shotgun.gauge}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Cartridges Fired</p>
                      <p className="text-3xl font-bold">{shotgun.total_cartridges_fired || 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}