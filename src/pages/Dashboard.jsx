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
  Wrench, BarChart2,
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
import { getRepository } from '@/lib/offlineSupport';
import { useModules } from '@/context/ModulesContext';

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
        firearmMap[name] = (firearmMap[name] || 0) + (parseInt(rifle.rounds_fired) || 0);
      });
    } else if (record.rifle_id) {
      const name = rifleMap[record.rifle_id] || 'Unknown Rifle';
      firearmMap[name] = (firearmMap[name] || 0) + (parseInt(record.rounds_fired) || 0);
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
    // Rounds are in rifles_used array for target shooting
    const rounds = Array.isArray(record.rifles_used)
      ? record.rifles_used.reduce((sum, r) => sum + (parseInt(r.rounds_fired) || 0), 0)
      : (record.rounds_fired || 0);
    monthlyMap[monthKey].rifle += rounds;
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
  const deerLocationMap = locations.reduce((acc, l) => ({ ...acc, [l.id]: l.name }), {});
  targetShoots.forEach((r) => { const name = clubMap[r.location_id] || clubMap[r.club_id] || r.location_name || 'Unknown Club'; locationMap[name] = (locationMap[name] || 0) + 1; });
  clayShoots.forEach((r) => { const name = clubMap[r.location_id] || clubMap[r.club_id] || r.location_name || 'Unknown Club'; locationMap[name] = (locationMap[name] || 0) + 1; });
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
        <div key={item.label} className="bg-card rounded-xl px-2 py-2.5 text-center border border-border shadow-sm">
          <p className="text-base md:text-lg font-bold text-foreground leading-none">{item.value}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function PrimaryCard({ to, icon, label, sub }) {
  return (
    <Link to={to}>
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm active:scale-[0.97] transition-all duration-100 flex items-center gap-4 select-none">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary [&_svg]:w-5 [&_svg]:h-5 select-none">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-snug tracking-tight">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

// SVG Deer icon component
function DeerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Antlers */}
      <path d="M8 6L5 3M8 6L5 9M16 6L19 3M16 6L19 9M8 6H16M12 6V10" />
      {/* Head */}
      <circle cx="12" cy="13" r="3" />
      {/* Body */}
      <path d="M12 16V22" />
      {/* Legs */}
      <path d="M10 22V20M14 22V20" />
    </svg>
  );
}

// Icon badge card with color theming
function IconCard({ to, Icon, label, color }) {
  const colorMap = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-950', icon: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-600' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-950', icon: 'text-orange-600 dark:text-orange-400', accent: 'bg-orange-600' },
    green: { bg: 'bg-green-100 dark:bg-green-950', icon: 'text-green-600 dark:text-green-400', accent: 'bg-green-600' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-950', icon: 'text-purple-600 dark:text-purple-400', accent: 'bg-purple-600' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-950', icon: 'text-teal-600 dark:text-teal-400', accent: 'bg-teal-600' },
    slate: { bg: 'bg-slate-100 dark:bg-slate-900', icon: 'text-slate-600 dark:text-slate-400', accent: 'bg-slate-600' },
  };

  const colors = colorMap[color] || colorMap.slate;

  return (
    <Link to={to}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="bg-card rounded-[18px] p-5 border border-border/50 shadow-md active:shadow-lg transition-all duration-100 flex flex-col items-center gap-3.5 select-none h-full min-h-[140px] justify-center"
      >
        {/* Icon badge circle */}
        <div className={`w-14 h-14 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
          {Icon === 'DeerIcon' ? <DeerIcon /> : <Icon className="w-7 h-7" />}
        </div>

        {/* Label with underline accent */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-bold text-foreground leading-tight">{label}</p>
          <div className={`h-1 w-6 rounded-full ${colors.accent}`}></div>
        </div>
      </motion.div>
    </Link>
  );
}

function SecondaryGrid({ user }) {
  const { isEnabled } = useModules();
  const allItems = [
    { to: '/target-shooting', Icon: Crosshair, label: 'Target', color: 'blue', module: 'target_shooting' },
    { to: '/clay-shooting', Icon: Target, label: 'Clay', color: 'orange', module: 'clay_shooting' },
    { to: '/deer-management', Icon: 'DeerIcon', label: 'Deer', color: 'green', module: 'deer_management' },
    { to: '/reloading', Icon: RefreshCw, label: 'Reloading', color: 'purple', module: 'reloading' },
    { to: '/load-development', Icon: FlaskConical, label: 'Load Dev', color: 'teal', module: 'reloading' },
    { to: '/settings/rifles', Icon: Wrench, label: 'Equipment', color: 'slate' },
    { to: '/reports', Icon: BarChart2, label: 'Reports', color: 'green' },
    ...(user?.role === 'admin' ? [{ to: '/admin/users', Icon: ShieldCheck, label: 'Admin', color: 'blue' }] : []),
  ];
  const items = allItems.filter(item => !item.module || isEnabled(item.module));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <IconCard
          key={item.to}
          to={item.to}
          Icon={item.Icon}
          label={item.label}
          color={item.color}
        />
      ))}
    </div>
  );
}

function ChartsSection({ chartData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary/30 transition-colors select-none"
      >
        <span className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-primary" />
          <span className="tracking-tight">Analytics</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
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
  const { isEnabled } = useModules();

  const today = format(new Date(), 'EEE, d MMM');

  const loadData = useCallback(async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

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
          getRepository('Area').filter({ created_by: currentUser.email }),
        ]);
        const targetShoots = allRecords.filter((r) => r.category === 'target_shooting');
        const clayShoots = allRecords.filter((r) => r.category === 'clay_shooting');
        const deerMgmt = allRecords.filter((r) => r.category === 'deer_management');
        const totalRounds = targetShoots.reduce((sum, s) => {
          if (Array.isArray(s.rifles_used) && s.rifles_used.length > 0) {
            return sum + s.rifles_used.reduce((rSum, r) => rSum + (parseInt(r.rounds_fired) || 0), 0);
          }
          return sum + (parseInt(s.rounds_fired) || 0);
        }, 0);
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
      <div className="bg-background min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
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
        {activeOuting && isEnabled('stalk_map') && <ActiveSessionBanner outing={activeOuting} />}

        {/* ── Primary Actions ── */}
        {isEnabled('stalk_map') && <PrimaryCard to="/deer-stalking" icon={<Map />} label="Stalking Map" sub="Areas & outings" />}

        {/* ── Secondary Grid ── */}
        <SecondaryGrid user={user} />

        {/* ── Widgets ── */}
        <AmmoStockWidget />
        {isEnabled('reloading') && <ReloadingWidget />}

        {/* ── Analytics (collapsible) ── */}
        {chartData && <ChartsSection chartData={chartData} />}

      </main>
    </div>
  );
}