import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { AlertCircle, CheckCircle2, Crosshair, Download, Droplet } from 'lucide-react';
import { format } from 'date-fns';
import { generateAmmunitionSummaryPDF } from '@/utils/pdfGenerators';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { useFirstTimeGuide } from '@/hooks/useFirstTimeGuide';
import { FIRST_TIME_GUIDES } from '@/lib/firstTimeGuides';
import ProfileBackLink from '@/components/ProfileBackLink';

export default function AmmoSummary() {
  const [rifles, setRifles] = useState([]);
  const [shotguns, setShotguns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { Guide: CleaningGuide, showGuideThen: showCleaningGuideThen } = useFirstTimeGuide(FIRST_TIME_GUIDES.cleaningCreate);

  useEffect(() => {
  loadData();
  }, []);

  useEffect(() => {
  const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
  loadData();
  }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      const rifle = rifles.find(r => r.id === rifleId);
      if (!rifle) return;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const roundsSincePrevious = (rifle.total_rounds_fired || 0) - (rifle.rounds_at_last_cleaning || 0);
      
      // Update rifle baseline
      await base44.entities.Rifle.update(rifleId, {
        rounds_at_last_cleaning: rifle.total_rounds_fired || 0,
        last_cleaning_date: today,
      });
      
      // Create cleaning history entry
      await base44.entities.CleaningHistory.create({
        firearm_id: rifleId,
        firearm_type: 'rifle',
        firearm_name: rifle.name,
        cleaning_date: today,
        total_rounds_at_cleaning: rifle.total_rounds_fired || 0,
        rounds_since_previous_cleaning: roundsSincePrevious,
      });
      
      await loadData();
    } catch (error) {
      console.error('Error marking rifle cleaned:', error);
    }
  };

  const handleShotgunMarkCleaned = async (shotgunId) => {
    try {
      const shotgun = shotguns.find(s => s.id === shotgunId);
      if (!shotgun) return;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const cartridgesSincePrevious = (shotgun.total_cartridges_fired || 0) - (shotgun.cartridges_at_last_cleaning || 0);
      
      // Update shotgun baseline
      await base44.entities.Shotgun.update(shotgunId, {
        cartridges_at_last_cleaning: shotgun.total_cartridges_fired || 0,
        last_cleaning_date: today,
      });
      
      // Create cleaning history entry
      await base44.entities.CleaningHistory.create({
        firearm_id: shotgunId,
        firearm_type: 'shotgun',
        firearm_name: shotgun.name,
        cleaning_date: today,
        total_rounds_at_cleaning: shotgun.total_cartridges_fired || 0,
        rounds_since_previous_cleaning: cartridgesSincePrevious,
      });
      
      await loadData();
    } catch (error) {
      console.error('Error marking shotgun cleaned:', error);
    }
  };

  const riflesNeedingCleaning = rifles.filter(
    (r) => r.cleaning_reminder_threshold && ((r.total_rounds_fired || 0) - (r.rounds_at_last_cleaning || 0)) >= r.cleaning_reminder_threshold
  );

  const handleExportPDF = () => {
    const doc = generateAmmunitionSummaryPDF(rifles, shotguns);
    doc.save('ammunition-summary.pdf');
  };

  const pullToRefresh = usePullToRefresh(loadData);

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
      <CleaningGuide />
      <main className="max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <ProfileBackLink />
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Armory</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Usage, cleaning & firearm status</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>

        <div className="space-y-6">
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
                      className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">{rifle.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(rifle.total_rounds_fired || 0) - (rifle.rounds_at_last_cleaning || 0)} / {rifle.cleaning_reminder_threshold} rounds
                        </p>
                      </div>
                      <button
                        onClick={() => showCleaningGuideThen(() => handleMarkCleaned(rifle.id))}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg font-semibold transition-colors"
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
          <h2 className="text-xs font-bold mb-3 flex items-center gap-2 text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <Crosshair className="w-3.5 h-3.5" />
            Rifles ({rifles.length})
          </h2>
          <div className="grid gap-3">
            {rifles.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl shadow-sm p-8 text-center">
                <p className="text-muted-foreground">No rifles configured</p>
              </div>
            ) : (
              rifles.map((rifle) => {
                const roundsSinceCleaning = (rifle.total_rounds_fired || 0) - (rifle.rounds_at_last_cleaning || 0);
                const cleaningStatus =
                  roundsSinceCleaning > 0
                    ? rifle.cleaning_reminder_threshold && roundsSinceCleaning >= rifle.cleaning_reminder_threshold
                      ? 'needs_cleaning'
                      : 'dirty'
                    : rifle.last_cleaning_date
                    ? 'clean'
                    : 'unknown';

                return (
                  <div
                    key={rifle.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl shadow-sm p-4"
                           >
                             <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="font-semibold text-lg">{rifle.name}</h3>
                         <p className="text-xs text-muted-foreground mt-1">
                           {rifle.make} {rifle.model} • {rifle.caliber}
                         </p>
                       </div>
                       <div className="flex items-center gap-2">
                         {cleaningStatus === 'needs_cleaning' && (
                           <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                             <AlertCircle className="w-4 h-4 text-amber-600" />
                             <span className="text-xs font-semibold text-amber-600">Needs Cleaning</span>
                           </div>
                         )}
                         {cleaningStatus === 'clean' && (
                           <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                             <CheckCircle2 className="w-4 h-4 text-green-600" />
                             <span className="text-xs font-semibold text-green-600">Clean</span>
                           </div>
                         )}
                       </div>
                     </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Rounds</p>
                        <p className="text-xl font-bold">{rifle.total_rounds_fired || 0}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Since Cleaning</p>
                        <p className="text-xl font-bold">{roundsSinceCleaning}</p>
                      </div>
                       {rifle.cleaning_reminder_threshold && (
                         <div className="bg-secondary/30 rounded-lg p-3">
                           <p className="text-xs text-muted-foreground mb-1">Target</p>
                           <p className="text-xl font-bold">{rifle.cleaning_reminder_threshold}</p>
                         </div>
                       )}
                       {rifle.last_cleaning_date && (
                         <div className="bg-secondary/30 rounded-lg p-3">
                           <p className="text-xs text-muted-foreground mb-1">Last Cleaned</p>
                           <p className="text-xs font-semibold">{format(new Date(rifle.last_cleaning_date), 'MMM d')}</p>
                         </div>
                       )}
                     </div>

                     <div className="pt-4 border-t border-border">
                       {rifle.cleaning_reminder_threshold && (
                         <div className="mb-3">
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-xs font-medium text-muted-foreground">Cleaning Progress</span>
                             <span className="text-xs font-semibold">
                               {Math.round(
                                 (roundsSinceCleaning / rifle.cleaning_reminder_threshold) * 100
                               )}%
                             </span>
                           </div>
                           <div className="h-2 bg-border rounded-full overflow-hidden">
                             <div
                               className={`h-full transition-all ${
                                 cleaningStatus === 'needs_cleaning' ? 'bg-amber-600' : 'bg-primary'
                               }`}
                               style={{
                                 width: `${Math.min(
                                   (roundsSinceCleaning / rifle.cleaning_reminder_threshold) * 100,
                                   100
                                 )}%`,
                               }}
                             />
                           </div>
                         </div>
                       )}
                       <button
                         onClick={() => showCleaningGuideThen(() => handleMarkCleaned(rifle.id))}
                         className="w-full px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                       >
                         <Droplet className="w-4 h-4" />
                         Mark as Cleaned
                       </button>
                     </div>
                  </div>
                );
              })
            )}
          </div>
          </div>

          {/* Shotguns Section */}
          <div>
          <h2 className="text-xs font-bold mb-3 flex items-center gap-2 text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <AlertCircle className="w-3.5 h-3.5" />
            Shotguns ({shotguns.length})
          </h2>
          <div className="grid gap-3">
            {shotguns.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl shadow-sm p-8 text-center">
                <p className="text-muted-foreground">No shotguns configured</p>
              </div>
            ) : (
              shotguns.map((shotgun) => {
                const cartridgesSinceCleaning = (shotgun.total_cartridges_fired || 0) - (shotgun.cartridges_at_last_cleaning || 0);
                const cleaningStatus =
                  cartridgesSinceCleaning > 0
                    ? shotgun.cleaning_reminder_threshold && cartridgesSinceCleaning >= shotgun.cleaning_reminder_threshold
                      ? 'needs_cleaning'
                      : 'dirty'
                    : shotgun.last_cleaning_date
                    ? 'clean'
                    : 'unknown';

                return (
                  <div
                    key={shotgun.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{shotgun.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {shotgun.make} {shotgun.model} • {shotgun.gauge}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cleaningStatus === 'needs_cleaning' && (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-600">Needs Cleaning</span>
                          </div>
                        )}
                        {cleaningStatus === 'clean' && (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-green-600">Clean</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Cartridges</p>
                        <p className="text-xl font-bold">{shotgun.total_cartridges_fired || 0}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Since Cleaning</p>
                        <p className="text-xl font-bold">{cartridgesSinceCleaning}</p>
                      </div>
                      {shotgun.cleaning_reminder_threshold && (
                        <div className="bg-secondary/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Target</p>
                          <p className="text-xl font-bold">{shotgun.cleaning_reminder_threshold}</p>
                        </div>
                      )}
                      {shotgun.last_cleaning_date && (
                        <div className="bg-secondary/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Last Cleaned</p>
                          <p className="text-xs font-semibold">{format(new Date(shotgun.last_cleaning_date), 'MMM d')}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border">
                      {shotgun.cleaning_reminder_threshold && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Cleaning Progress</span>
                            <span className="text-xs font-semibold">
                              {Math.round(
                                (cartridgesSinceCleaning / shotgun.cleaning_reminder_threshold) * 100
                              )}%
                            </span>
                          </div>
                          <div className="h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                cleaningStatus === 'needs_cleaning' ? 'bg-amber-600' : 'bg-primary'
                              }`}
                              style={{
                                width: `${Math.min(
                                  (cartridgesSinceCleaning / shotgun.cleaning_reminder_threshold) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => showCleaningGuideThen(() => handleShotgunMarkCleaned(shotgun.id))}
                        className="w-full px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Droplet className="w-4 h-4" />
                        Mark as Cleaned
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}