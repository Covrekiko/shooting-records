import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';

export default function ShotgunCartridgeTracker() {
  const [shotguns, setShotguns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShotguns();
  }, []);

  const loadShotguns = async () => {
    try {
      const currentUser = await base44.auth.me();
      const shotgunsList = await base44.entities.Shotgun.filter({ created_by: currentUser.email });
      setShotguns(shotgunsList);
    } catch (error) {
      console.error('Error loading shotguns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Shotgun Cartridges
        </h3>
      </div>

      {shotguns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shotguns tracked</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {shotguns
            .filter((s) => s.total_cartridges_fired > 0)
            .map((shotgun) => (
              <div key={shotgun.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{shotgun.name}</p>
                    <p className="text-xs text-muted-foreground">{shotgun.gauge}</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Cartridges:</span>
                  <span className="font-semibold">{shotgun.total_cartridges_fired || 0}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}