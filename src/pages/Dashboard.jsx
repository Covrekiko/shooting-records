import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Activity, Zap, Target, MapPin, BarChart3, Crosshair, BookOpen, Map, Settings } from 'lucide-react';
import { DESIGN } from '@/lib/designConstants';

import {
  MonthlyActivityChart,
  RoundsPerFirearmChart,
  ClubActivityHeatmap,
  AdminActivityChart,
} from '@/components/Charts';
import { RoundsPerMonthChart } from '@/components/RoundsPerMonthChart';
import { DeerSuccessRateChart } from '@/components/DeerSuccessRateChart';
import AmmoStockWidget from '@/components/AmmoStockWidget';
import AmmunitionTrackingWidget from '@/components/AmmunitionTrackingWidget';
import ReloadingWidget from '@/components/widgets/ReloadingWidget';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);

  const loadData = useCallback(async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (currentUser.role === 'admin') {
          const [users, allRecords] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.SessionRecord.filter({ created_by: currentUser.email }),
          ]);

          const targetRecords = allRecords.filter(r => r.category === 'target_shooting');
          const clayRecords = allRecords.filter(r => r.category === 'clay_shooting');
          const deerRecords = allRecords.filter(r => r.category === 'deer_management');

          setStats({
            totalUsers: users.length,
            totalRecords: allRecords.length,
            targetRecords: targetRecords.length,
            clayRecords: clayRecords.length,
            deerRecords: deerRecords.length,
          });
        } else {
          const [allRecords, rifles, shotguns, clubs, locations] = await Promise.all([
            base44.entities.SessionRecord.filter({ created_by: currentUser.email }),
            base44.entities.Rifle.filter({ created_by: currentUser.email }),
            base44.entities.Shotgun.filter({ created_by: currentUser.email }),
            base44.entities.Club.filter({ created_by: currentUser.email }),
            base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
          ]);

          const targetShoots = allRecords.filter(r => r.category === 'target_shooting');
          const clayShoots = allRecords.filter(r => r.category === 'clay_shooting');
          const deerMgmt = allRecords.filter(r => r.category === 'deer_management');

          const totalRounds = targetShoots.reduce((sum, s) => sum + (s.rounds_fired || 0), 0);
          const totalShotgunRounds = clayShoots.reduce((sum, s) => sum + (s.rounds_fired || 0), 0);

          setStats({
            targetSessions: targetShoots.length,
            claySessions: clayShoots.length,
            deerOutings: deerMgmt.length,
            totalRifleRounds: totalRounds,
            totalShotgunRounds: totalShotgunRounds,
          });

          // Prepare chart data
          const monthlyData = getMonthlyData(targetShoots, clayShoots, deerMgmt);
          const firearmData = getFirearmData(targetShoots, clayShoots, rifles, shotguns);
          const locationData = getLocationData(targetShoots, clayShoots, deerMgmt, clubs, locations);
          const roundsPerMonth = getRoundsPerMonth(targetShoots, clayShoots);
          const deerSuccessRate = getDeerSuccessRate(deerMgmt);

          setChartData({ monthly: monthlyData, firearm: firearmData, location: locationData, roundsPerMonth, deerSuccessRate });
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { pulling, progress, refreshing } = usePullToRefresh(loadData);

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
     <div className={`${DESIGN.PAGE_BG} min-h-screen flex flex-col`}>
       <Navigation />
       {(pulling || refreshing) && (
         <div className="flex justify-center py-1">
           <div
             className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
             style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none', opacity: refreshing ? 1 : progress, transform: `rotate(${progress * 360}deg)` }}
           />
         </div>
       )}
       <main className="max-w-7xl mx-auto px-4 pt-4 md:pt-6 pb-8">
          <div className="mb-6 hidden md:flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.full_name}</span></p>
            </div>
          </div>

         {user?.role === 'admin' ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard
             icon={<Map className="w-6 h-6" />}
             label="Stalking Map"
             subtitle="View & plan areas"
             link="/deer-stalking"
           />
           <StatCard
             icon={<span className="text-2xl">🦌</span>}
             label="Deer Management"
             subtitle="Total Deer"
             value={stats?.deerRecords || 0}
             link="/deer-management"
           />
           <StatCard
             icon={<Crosshair className="w-6 h-6" />}
             label="Target Shooting"
             subtitle="Sessions"
             value={stats?.targetRecords || 0}
             link="/target-shooting"
           />
           <StatCard
             icon={<Target className="w-6 h-6" />}
             label="Clay Shooting"
             subtitle="Sessions"
             value={stats?.clayRecords || 0}
             link="/clay-shooting"
           />
           <StatCard
             icon={<Settings className="w-6 h-6" />}
             label="Equipment & Areas"
             subtitle="Manage gear"
             link="/profile/settings"
           />
           <StatCard
             icon={<span className="text-2xl">Ⓡ</span>}
             label="Reloading"
             subtitle="Manage batches"
             link="/reloading"
           />
           <StatCard
             icon={<BookOpen className="w-6 h-6" />}
             label="Records"
             subtitle="View all sessions"
             link="/records"
           />
           <StatCard
             icon={<Zap className="w-6 h-6" />}
             label="Ammunition"
             subtitle="Manage usage"
             link="/ammo-summary"
           />
         </div>
         ) : (
         <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Map className="w-6 h-6" />}
            label="Stalking Map"
            subtitle="View & plan areas"
            link="/deer-stalking"
          />
           <StatCard
             icon={<span className="text-2xl">🦌</span>}
             label="Deer Management"
             subtitle="Total Outings"
             value={stats?.deerOutings || 0}
             link="/deer-management"
           />
           <StatCard
             icon={<Crosshair className="w-6 h-6" />}
             label="Target Shooting"
             subtitle="Sessions Completed"
             value={stats?.targetSessions || 0}
             link="/target-shooting"
           />
           <StatCard
             icon={<Target className="w-6 h-6" />}
             label="Clay Shooting"
             subtitle="Rounds Tracked"
             value={stats?.claySessions || 0}
             link="/clay-shooting"
           />
           <StatCard
             icon={<Settings className="w-6 h-6" />}
             label="Equipment & Areas"
             subtitle="Manage gear"
             link="/profile/settings"
           />
           <StatCard
             icon={<span className="text-2xl">Ⓡ</span>}
             label="Reloading"
             subtitle="Manage batches"
             link="/reloading"
           />
           <StatCard
             icon={<BookOpen className="w-6 h-6" />}
             label="Records"
             subtitle="View all sessions"
             link="/records"
           />
           <StatCard
             icon={<Zap className="w-6 h-6" />}
             label="Ammunition"
             subtitle="Manage usage"
             link="/ammo-summary"
           />
         </div>
         )}



        {/* Widgets */}
        {user && (
          <div className="mt-6 space-y-5">
            <AmmoStockWidget />
            <ReloadingWidget />
          </div>
        )}



        {/* Charts Section */}
        {chartData && (
          <div className="mt-8 space-y-6 hidden md:block">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Performance Analytics</h2>
              <Link
                to="/reports"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2 text-xs font-semibold"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Generate Report
              </Link>
            </div>
            <MonthlyActivityChart data={chartData.monthly} />
            <RoundsPerMonthChart data={chartData.roundsPerMonth} />
            <RoundsPerFirearmChart data={chartData.firearm} />
            <DeerSuccessRateChart data={chartData.deerSuccessRate} />
            <ClubActivityHeatmap data={chartData.location} />
          </div>
        )}
      </main>
    </div>
  );
}

function getMonthlyData(targetShoots, clayShoots, deerMgmt) {
  const monthlyMap = {};
  const allRecords = [
    ...targetShoots.map((r) => ({ ...r, type: 'target' })),
    ...clayShoots.map((r) => ({ ...r, type: 'clay' })),
    ...deerMgmt.map((r) => ({ ...r, type: 'deer' })),
  ];

  allRecords.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { month: monthKey, targetSessions: 0, claySessions: 0, deerOutings: 0 };
    }

    if (record.type === 'target') monthlyMap[monthKey].targetSessions++;
    else if (record.type === 'clay') monthlyMap[monthKey].claySessions++;
    else if (record.type === 'deer') monthlyMap[monthKey].deerOutings++;
  });

  return Object.values(monthlyMap).slice(-6);
}

function getFirearmData(targetShoots, clayShoots, rifles, shotguns) {
   const firearmMap = {};
   const rifleMap = rifles.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {});
   const shotgunMap = shotguns.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {});

   targetShoots.forEach((record) => {
     if (record.rifles_used && Array.isArray(record.rifles_used)) {
       record.rifles_used.forEach((rifle) => {
         const name = rifleMap[rifle.rifle_id] || 'Unknown Rifle';
         firearmMap[name] = (firearmMap[name] || 0) + (rifle.rounds_fired || 0);
       });
     } else if (record.rifle_id) {
       const name = rifleMap[record.rifle_id] || 'Unknown Rifle';
       firearmMap[name] = (firearmMap[name] || 0) + (record.rounds_fired || 0);
     }
   });

   clayShoots.forEach((record) => {
     const name = shotgunMap[record.shotgun_id] || 'Unknown Shotgun';
     firearmMap[name] = (firearmMap[name] || 0) + (record.rounds_fired || 0);
   });

   return Object.entries(firearmMap)
     .map(([name, rounds]) => ({ name, rounds }))
     .sort((a, b) => b.rounds - a.rounds)
     .slice(0, 8);
 }

function getRoundsPerMonth(targetShoots, clayShoots) {
  const monthlyMap = {};

  targetShoots.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { month: monthKey, rifle: 0, shotgun: 0 };
    }
    monthlyMap[monthKey].rifle += record.rounds_fired || 0;
  });

  clayShoots.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { month: monthKey, rifle: 0, shotgun: 0 };
    }
    monthlyMap[monthKey].shotgun += record.rounds_fired || 0;
  });

  return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

function getDeerSuccessRate(deerMgmt) {
   const speciesMap = {};

   deerMgmt.forEach((record) => {
     if (record.species_list && Array.isArray(record.species_list)) {
       record.species_list.forEach((item) => {
         const species = item.species || 'Other';
         if (!speciesMap[species]) {
           speciesMap[species] = { species, count: 0, successful: 0 };
         }
         speciesMap[species].count++;
         speciesMap[species].successful++;
       });
     } else if (record.deer_species) {
       const species = record.deer_species;
       if (!speciesMap[species]) {
         speciesMap[species] = { species, count: 0, successful: 0 };
       }
       speciesMap[species].count++;
       if (record.number_shot && record.number_shot > 0) {
         speciesMap[species].successful++;
       }
     }
   });

   return Object.values(speciesMap).sort((a, b) => b.count - a.count);
 }

function getLocationData(targetShoots, clayShoots, deerMgmt, clubs, locations) {
  const locationMap = {};

  const clubMap = clubs.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
  const deerLocationMap = locations.reduce((acc, l) => ({ ...acc, [l.id]: l.place_name }), {});

  targetShoots.forEach((record) => {
    const name = clubMap[record.club_id] || 'Unknown Club';
    locationMap[name] = (locationMap[name] || 0) + 1;
  });

  clayShoots.forEach((record) => {
    const name = clubMap[record.club_id] || 'Unknown Club';
    locationMap[name] = (locationMap[name] || 0) + 1;
  });

  deerMgmt.forEach((record) => {
    const name = deerLocationMap[record.location_id] || record.place_name || 'Unknown Location';
    locationMap[name] = (locationMap[name] || 0) + 1;
  });

  return Object.entries(locationMap)
    .map(([name, visits]) => ({ name, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);
}

function StatCard({ icon, label, subtitle, value, link, hideOnMobile }) {
     const content = (
       <div className="flex items-center gap-3.5">
         {/* Icon container */}
         <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 [&_svg]:w-5 [&_svg]:h-5 text-lg [&_svg]:text-slate-600 dark:[&_svg]:text-slate-300">
           {icon}
         </div>
         {/* Text */}
         <div className="flex-1 min-w-0">
           <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">{label}</p>
           {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">{subtitle}</p>}
           {value !== undefined && (
             <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 leading-tight">{value}</p>
           )}
         </div>
         <span className="text-slate-300 dark:text-slate-600 text-base flex-shrink-0">›</span>
       </div>
     );

     const cardClass = hideOnMobile ? "hidden md:block" : "";
     const baseClass = `bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-slate-200/90 dark:hover:border-slate-600 active:scale-[0.97] transition-all duration-100 ${cardClass}`;

    if (link) {
      return <Link to={link} className={`${baseClass} block`}>{content}</Link>;
    }
    return <div className={baseClass}>{content}</div>;
}