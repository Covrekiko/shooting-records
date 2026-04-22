import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useOuting } from '@/context/OutingContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Target, Crosshair, Map, BookOpen,
  BarChart3, ChevronRight, Clock, Zap, Shield, RefreshCw, Layers, FlaskConical, ShieldCheck,
} from 'lucide-react';
import {
  MonthlyActivityChart,
  RoundsPerFirearmChart,
  ClubActivityHeatmap,
} from '@/components/Charts';
import { RoundsPerMonthChart } from '@/components/RoundsPerMonthChart';
import { DeerSuccessRateChart } from '@/components/DeerSuccessRateChart';
import AmmoStockWidget from '@/components/AmmoStockWidget';
import ReloadingWidget from '@/components/widgets/ReloadingWidget';
import { preCacheUserData, getRepository } from '@/lib/offlineSupport';

// ── data helpers (unchanged logic) ──────────────────────────────────────────
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
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, targetSessions: 0, claySessions: 0, deerOutings: 0 };
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
    if (record.rifles_used?.length) {
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
  return Object.entries(firearmMap).map(([name, rounds]) => ({ name, rounds })).sort((a, b) => b.rounds - a.rounds).slice(0, 8);
}

function getRoundsPerMonth(targetShoots, clayShoots) {
  const monthlyMap = {};
  targetShoots.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, rifle: 0, shotgun: 0 };
    monthlyMap[monthKey].rifle += record.rounds_fired || 0;
  });
  clayShoots.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, rifle: 0, shotgun: 0 };
    monthlyMap[monthKey].shotgun += record.rounds_fired || 0;
  });
  return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

function getDeerSuccessRate(deerMgmt) {
  const speciesMap = {};
  deerMgmt.forEach((record) => {
    if (record.species_list?.length) {
      record.species_list.forEach((item) => {
        const species = item.species || 'Other';
        if (!speciesMap[species]) speciesMap[species] = { species, count: 0, successful: 0 };
        speciesMap[species].count++;
        speciesMap[species].successful++;
      });
    } else if (record.deer_species) {
      const species = record.deer_species;
      if (!speciesMap[species]) speciesMap[species] = { species, count: 0, successful: 0 };
      speciesMap[species].count++;
      if (record.number_shot > 0) speciesMap[species].successful++;
    }
  });
  return Object.values(speciesMap).sort((a, b) => b.count - a.count);
}

function getLocationData(targetShoots, clayShoots, deerMgmt, clubs, locations) {
  const locationMap = {};
  const clubMap = clubs.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
  const deerLocationMap = locations.reduce((acc, l) => ({ ...acc, [l.id]: l.place_name }), {});
  targetShoots.forEach((r) => { const name = clubMap[r.club_id] || 'Unknown Club'; locationMap[name] = (locationMap[name] || 0) + 1; });
  clayShoots.forEach((r) => { const name = clubMap[r.club_id] || 'Unknown Club'; locationMap[name] = (locationMap[name] || 0) + 1; });
  deerMgmt.forEach((r) => { const name = deerLocationMap[r.location_id] || r.place_name || 'Unknown Location'; locationMap[name] = (locationMap[name] || 0) + 1; });
  return Object.entries(locationMap).map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits).slice(0, 8);
}

// ── sub-components ───────────────────────────────────────────────────────────

function ActiveSessionBanner({ outing }) {
  const startTime = outing.start_time ? new Date(outing.start_time) : null;
  const elapsed = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : null;

  return (
    <Link to="/deer-stalking">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3.5 bg-emerald-600 dark:bg-emerald-700 rounded-2xl shadow-lg"
      >
        <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">Active Outing</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">{outing.location_name || 'Deer Stalking'}</p>
        </div>
        {elapsed !== null && (
          <div className="flex items-center gap-1 text-emerald-200 text-xs font-semibold flex-shrink-0 bg-black/10 px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />
            {elapsed >= 60 ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m` : `${elapsed}m`}
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-emerald-300 flex-shrink-0" />
      </motion.div>
    </Link>
  );
}

function KpiRow({ stats }) {
  const items = [
    { label: 'Target', value: stats?.targetSessions ?? stats?.targetRecords ?? 0 },
    { label: 'Clay', value: stats?.claySessions ?? stats?.clayRecords ?? 0 },
    { label: 'Deer', value: stats?.deerOutings ?? stats?.deerRecords ?? 0 },
    { label: 'Rounds', value: (stats?.totalRifleRounds ?? 0) + (stats?.totalShotgunRounds ?? 0) },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl px-2 py-2.5 text-center border border-slate-200/70 dark:border-slate-700 shadow-sm">
          <p className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">{item.value}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function PrimaryCard({ to, icon, label, sub }) {
  return (
    <Link to={to}>
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-sm active:scale-[0.97] transition-all duration-100 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary [&_svg]:w-5 [&_svg]:h-5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight">{label}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{sub}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
      </div>
    </Link>
  );
}

function SecondaryGrid({ user }) {
  const items = [
    { to: '/target-shooting', icon: <Crosshair />, label: 'Target' },
    { to: '/clay-shooting', icon: <Target />, label: 'Clay' },
    { to: '/deer-management', icon: <span className="text-lg">🦌</span>, label: 'Deer' },
    { to: '/reloading', icon: <RefreshCw />, label: 'Reloading' },
    { to: '/load-development', icon: <FlaskConical />, label: 'Load Dev' },
    { to: '/settings/rifles', icon: <span className="text-lg">🔧</span>, label: 'Equipment' },
    { to: '/reports', icon: <BarChart3 />, label: 'Reports' },
    ...(user?.role === 'admin' ? [{ to: '/admin/users', icon: <ShieldCheck />, label: 'Admin' }] : []),
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <Link key={item.to} to={item.to}>
          <div className="bg-white dark:bg-slate-800/80 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm active:scale-[0.95] transition-all duration-100 flex flex-col items-center gap-1.5 text-center">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
              {item.icon}
            </div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight tracking-wide">{item.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ChartsSection({ chartData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="tracking-tight">Analytics</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-300 dark:text-slate-600 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700/60 pt-4">
          <MonthlyActivityChart data={chartData.monthly} />
          <RoundsPerMonthChart data={chartData.roundsPerMonth} />
          <RoundsPerFirearmChart data={chartData.firearm} />
          <DeerSuccessRateChart data={chartData.deerSuccessRate} />
          <ClubActivityHeatmap data={chartData.location} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { activeOuting } = useOuting();

  const today = format(new Date(), 'EEE, d MMM');

  const loadData = useCallback(async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Pre-cache data for offline use (non-blocking)
      preCacheUserData(currentUser.email).catch(() => {});

      if (currentUser.role === 'admin') {
        const [users, allRecords] = await Promise.all([
          base44.entities.User.list(),
          getRepository('SessionRecord').filter({ created_by: currentUser.email }),
        ]);
        const targetRecords = allRecords.filter((r) => r.category === 'target_shooting');
        const clayRecords = allRecords.filter((r) => r.category === 'clay_shooting');
        const deerRecords = allRecords.filter((r) => r.category === 'deer_management');
        setStats({ totalUsers: users.length, totalRecords: allRecords.length, targetRecords: targetRecords.length, clayRecords: clayRecords.length, deerRecords: deerRecords.length });
      } else {
        const [allRecords, rifles, shotguns, clubs, locations] = await Promise.all([
          getRepository('SessionRecord').filter({ created_by: currentUser.email }),
          getRepository('Rifle').filter({ created_by: currentUser.email }),
          getRepository('Shotgun').filter({ created_by: currentUser.email }),
          getRepository('Club').filter({ created_by: currentUser.email }),
          getRepository('DeerLocation').filter({ created_by: currentUser.email }),
        ]);
        const targetShoots = allRecords.filter((r) => r.category === 'target_shooting');
        const clayShoots = allRecords.filter((r) => r.category === 'clay_shooting');
        const deerMgmt = allRecords.filter((r) => r.category === 'deer_management');
        const totalRounds = targetShoots.reduce((sum, s) => sum + (s.rounds_fired || 0), 0);
        const totalShotgunRounds = clayShoots.reduce((sum, s) => sum + (s.rounds_fired || 0), 0);
        setStats({ targetSessions: targetShoots.length, claySessions: clayShoots.length, deerOutings: deerMgmt.length, totalRifleRounds: totalRounds, totalShotgunRounds });
        setChartData({
          monthly: getMonthlyData(targetShoots, clayShoots, deerMgmt),
          firearm: getFirearmData(targetShoots, clayShoots, rifles, shotguns),
          location: getLocationData(targetShoots, clayShoots, deerMgmt, clubs, locations),
          roundsPerMonth: getRoundsPerMonth(targetShoots, clayShoots),
          deerSuccessRate: getDeerSuccessRate(deerMgmt),
        });
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { pulling, progress, refreshing } = usePullToRefresh(loadData);

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />

      {/* Pull-to-refresh indicator */}
      {(pulling || refreshing) && (
        <div className="flex justify-center py-1">
          <div
            className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
            style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none', opacity: refreshing ? 1 : progress, transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 pt-2 pb-8 mobile-page-padding space-y-3">



        {/* ── Active Session Banner ── */}
        {activeOuting && <ActiveSessionBanner outing={activeOuting} />}

        {/* ── Primary Actions ── */}
        <PrimaryCard to="/deer-stalking" icon={<Map />} label="Stalking Map" sub="Areas & outings" />

        {/* ── Secondary Grid ── */}
        <SecondaryGrid user={user} />

        {/* ── Widgets ── */}
        <AmmoStockWidget />
        <ReloadingWidget />

        {/* ── Analytics (collapsible) ── */}
        {chartData && <ChartsSection chartData={chartData} />}

      </main>
    </div>
  );
}