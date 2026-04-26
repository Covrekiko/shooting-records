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
  BarChart3, ChevronRight, Clock, Shield, RefreshCw, Layers, FlaskConical, ShieldCheck, TrendingUp,
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

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0B0F0E',
  card: '#151A18',
  panel: '#1E2421',
  border: '#2E3732',
  bronze: '#C79A45',
  bronzeDark: '#8A6A35',
  text: '#F2F2EF',
  muted: '#A8ADA7',
  success: '#4CAF50',
};

const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
};

// ── data helpers ──────────────────────────────────────────────────────────────
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

// ── sub-components ────────────────────────────────────────────────────────────

function ActiveSessionBanner({ outing }) {
  const startTime = outing.start_time ? new Date(outing.start_time) : null;
  const elapsed = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : null;

  return (
    <Link to="/deer-stalking">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #1A3A2A 0%, #0F2218 100%)',
          border: `1px solid ${C.success}40`,
          boxShadow: `0 0 20px ${C.success}20`,
        }}
      >
        <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: C.success }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.success }}>Active Outing</p>
          <p className="text-sm font-bold truncate mt-0.5" style={{ color: C.text }}>{outing.location_name || 'Deer Stalking'}</p>
        </div>
        {elapsed !== null && (
          <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 px-2 py-1 rounded-lg" style={{ background: 'rgba(76,175,80,0.15)', color: C.success }}>
            <Clock className="w-3 h-3" />
            {elapsed >= 60 ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m` : `${elapsed}m`}
          </div>
        )}
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.success }} />
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
        <div
          key={item.label}
          className="rounded-xl px-2 py-3 text-center"
          style={{ background: C.panel, border: `1px solid ${C.border}` }}
        >
          <p className="text-lg font-bold leading-none" style={{ color: C.bronze }}>{item.value}</p>
          <p className="text-[10px] mt-1 font-medium" style={{ color: C.muted }}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function PrimaryCard({ to, icon, label, sub }) {
  return (
    <Link to={to}>
      <div
        className="rounded-2xl p-4 active:scale-[0.97] transition-all duration-100 flex items-center gap-4"
        style={{ ...cardStyle, borderTop: `2px solid ${C.bronze}` }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 [&_svg]:w-5 [&_svg]:h-5"
          style={{ background: `${C.bronze}20`, color: C.bronze }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug tracking-tight" style={{ color: C.text }}>{label}</p>
          {sub && <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{sub}</p>}
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.bronzeDark }} />
      </div>
    </Link>
  );
}

function SecondaryGrid({ user }) {
  const { isEnabled } = useModules();
  const allItems = [
    { to: '/target-shooting', icon: <Crosshair />, label: 'Target', module: 'target_shooting' },
    { to: '/clay-shooting', icon: <Target />, label: 'Clay', module: 'clay_shooting' },
    { to: '/deer-management', icon: <Layers />, label: 'Deer', module: 'deer_management' },
    { to: '/reloading', icon: <RefreshCw />, label: 'Reloading', module: 'reloading' },
    { to: '/load-development', icon: <FlaskConical />, label: 'Load Dev', module: 'reloading' },
    { to: '/settings/rifles', icon: <Shield />, label: 'Equipment' },
    { to: '/reports', icon: <BarChart3 />, label: 'Reports' },
    ...(user?.role === 'admin' ? [{ to: '/admin/users', icon: <ShieldCheck />, label: 'Admin' }] : []),
  ];
  const items = allItems.filter(item => !item.module || isEnabled(item.module));

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <Link key={item.to} to={item.to}>
          <div
            className="rounded-xl p-2.5 active:scale-[0.95] transition-all duration-100 flex flex-col items-center gap-1.5 text-center"
            style={{ background: C.panel, border: `1px solid ${C.border}` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4"
              style={{ background: `${C.bronze}15`, color: C.bronze }}
            >
              {item.icon}
            </div>
            <p className="text-[10px] font-semibold leading-tight tracking-wide" style={{ color: C.muted }}>{item.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ChartsSection({ chartData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
        style={{ color: C.text }}
      >
        <span className="flex items-center gap-2.5">
          <TrendingUp className="w-4 h-4" style={{ color: C.bronze }} />
          <span className="text-sm font-semibold tracking-tight">Analytics</span>
        </span>
        <ChevronRight
          className="w-4 h-4 transition-transform duration-200"
          style={{ color: C.bronzeDark, transform: open ? 'rotate(90deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
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

// ── Main component ─────────────────────────────────────────────────────────────
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
      <div className="min-h-screen" style={{ background: C.bg }}>
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${C.bronze} transparent ${C.bronze} ${C.bronze}` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <Navigation />

      {/* Pull-to-refresh indicator */}
      {(pulling || refreshing) && (
        <div className="flex justify-center py-1">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full"
            style={{
              borderColor: `${C.bronze} transparent ${C.bronze} ${C.bronze}`,
              animation: refreshing ? 'spin 0.6s linear infinite' : 'none',
              opacity: refreshing ? 1 : progress,
              transform: `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 pt-3 pb-8 mobile-page-padding space-y-3">

        {/* ── Header row ── */}
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.bronze }}>Overview</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: C.muted }}>{today}</p>
          </div>
          <BookOpen className="w-5 h-5" style={{ color: C.bronzeDark }} />
        </div>

        {/* ── KPI Strip ── */}
        {stats && <KpiRow stats={stats} />}

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