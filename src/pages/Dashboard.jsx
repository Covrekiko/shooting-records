import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import Navigation from '@/components/Navigation';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { useOuting } from '@/context/OutingContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import React from 'react';
import {
  Target, Crosshair, BookOpen,
  BarChart3, ChevronRight, Clock, Zap, Shield, RefreshCw, Layers, FlaskConical, ShieldCheck, MessageCircle, MapPin,
} from 'lucide-react';
import {
  MonthlyActivityChart,
  RoundsPerFirearmChart,
  ClubActivityHeatmap,
} from '@/components/Charts';
import { RoundsPerMonthChart } from '@/components/RoundsPerMonthChart';
import { DeerSuccessRateChart } from '@/components/DeerSuccessRateChart';
import { getRepository } from '@/lib/offlineSupport';

const AmmoStockWidget = React.lazy(() => import('@/components/AmmoStockWidget'));
const ReloadingWidget = React.lazy(() => import('@/components/widgets/ReloadingWidget'));

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
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Active Outing</p>
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

const CHECKIN_CONFIG = {
  target_shooting: { label: 'Target Shooting', badge: 'Checked In', to: '/target-shooting', color: 'bg-blue-600 dark:bg-blue-700', textColor: 'text-blue-200', icon: <Crosshair className="w-3.5 h-3.5" /> },
  clay_shooting:   { label: 'Clay Shooting',   badge: 'Checked In', to: '/clay-shooting',   color: 'bg-orange-600 dark:bg-orange-700', textColor: 'text-orange-200', icon: <Target className="w-3.5 h-3.5" /> },
  deer_management: { label: 'Deer Management', badge: 'Checked In', to: '/deer-management', color: 'bg-emerald-600 dark:bg-emerald-700', textColor: 'text-emerald-200', icon: <MapPin className="w-3.5 h-3.5" /> },
};

function ActiveCheckinBanner({ session }) {
  const cfg = CHECKIN_CONFIG[session.category];
  if (!cfg) return null;
  const checkinTime = session.checkin_time || session.start_time;
  const elapsed = checkinTime ? (() => {
    const base = checkinTime.includes('T') ? new Date(checkinTime) : new Date(`${session.date}T${checkinTime}`);
    return Math.floor((Date.now() - base.getTime()) / 60000);
  })() : null;

  return (
    <Link to={cfg.to}>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 px-4 py-3.5 ${cfg.color} rounded-2xl shadow-lg`}
      >
        <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${cfg.textColor} uppercase tracking-widest`}>{cfg.badge}</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">
            {session.location_name || session.title || cfg.label}
          </p>
        </div>
        {elapsed !== null && elapsed >= 0 && (
          <div className={`flex items-center gap-1 ${cfg.textColor} text-xs font-semibold flex-shrink-0 bg-black/10 px-2 py-1 rounded-lg`}>
            <Clock className="w-3 h-3" />
            {elapsed >= 60 ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m` : `${elapsed}m`}
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0" />
      </motion.div>
    </Link>
  );
}

const KpiRow = React.memo(function KpiRow({ stats }) {
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
          <p className="text-xs text-muted-foreground mt-1 font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
});

const PrimaryCard = React.memo(function PrimaryCard({ to, icon, label, sub }) {
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
});

const SecondaryGrid = React.memo(function SecondaryGrid({ user }) {
  const items = [
    { to: '/target-shooting', icon: <Crosshair className="w-5 h-5" />, label: 'Target' },
    { to: '/clay-shooting', icon: <Target className="w-5 h-5" />, label: 'Clay' },
    { to: '/deer-management', icon: <span className="text-lg">🦌</span>, label: 'Deer' },
    { to: '/reloading', icon: <RefreshCw className="w-5 h-5" />, label: 'Reloading' },
    { to: '/load-development', icon: <FlaskConical className="w-5 h-5" />, label: 'Load Dev' },
    { to: '/settings/rifles', icon: <span className="text-lg">🔧</span>, label: 'Equipment' },
    { to: '/reports', icon: <BarChart3 className="w-5 h-5" />, label: 'Reports' },
    ...(user?.role === 'admin' ? [{ to: '/admin/users', icon: <ShieldCheck className="w-5 h-5" />, label: 'Admin' }] : []),
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
         <Link key={item.to} to={item.to}>
           <div className="bg-card rounded-xl p-2.5 border border-border shadow-sm active:scale-[0.95] transition-all duration-100 flex flex-col items-center gap-1.5 text-center select-none">
             <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground [&_svg]:w-5 [&_svg]:h-5 select-none">
               {item.icon}
             </div>
             <p className="text-xs font-semibold text-muted-foreground leading-tight tracking-wide">{item.label}</p>
           </div>
         </Link>
       ))}
    </div>
  );
});

const ChartsSection = React.memo(function ChartsSection({ analyticsData }) {
  const [open, setOpen] = useState(false);
  const chartData = useMemo(() => {
    if (!open || !analyticsData) return null;
    const { targetShoots, clayShoots, deerMgmt, rifles, shotguns, clubs, locations } = analyticsData;
    return {
      monthly: getMonthlyData(targetShoots, clayShoots, deerMgmt),
      firearm: getFirearmData(targetShoots, clayShoots, rifles, shotguns),
      location: getLocationData(targetShoots, clayShoots, deerMgmt, clubs, locations),
      roundsPerMonth: getRoundsPerMonth(targetShoots, clayShoots),
      deerSuccessRate: getDeerSuccessRate(deerMgmt),
    };
  }, [open, analyticsData]);

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
      {open && chartData && (
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
});

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const isEnabled = () => true;
  const { user: authUser, refreshUser } = useAuth();
  const [user, setUser] = useState(authUser || null);
  const [stats, setStats] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [activeCheckins, setActiveCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const { activeOuting } = useOuting();

  const today = format(new Date(), 'EEE, d MMM');

  const loadData = useCallback(async () => {
    try {
      const currentUser = authUser || await refreshUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);
      
      const [allRecordsRaw, activeSessionsRaw, rifles, shotguns, clubs, locations] = await Promise.all([
        getRepository('SessionRecord').filter({ created_by: currentUser.email, status: 'completed' }),
        getRepository('SessionRecord').filter({ created_by: currentUser.email, status: 'active' }),
        getRepository('Rifle').filter({ created_by: currentUser.email }),
        getRepository('Shotgun').filter({ created_by: currentUser.email }),
        getRepository('Club').filter({ created_by: currentUser.email }),
        getRepository('Area').filter({ created_by: currentUser.email }),
      ]);
      const allRecords = allRecordsRaw.filter((r) => r.isDeleted !== true && r.status !== 'deleted');
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
      setAnalyticsData({ targetShoots, clayShoots, deerMgmt, rifles, shotguns, clubs, locations });
      setActiveCheckins((activeSessionsRaw || []).filter(r => r.isDeleted !== true));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser, refreshUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading) return;
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 150));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = schedule(() => setWidgetsReady(true));
    return () => cancel(handle);
  }, [loading]);

  const pullToRefresh = { pulling: false, progress: 0, refreshing: false };

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

      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />

      <main className="max-w-2xl mx-auto px-3 pt-2 pb-8 mobile-page-padding space-y-3">



        {/* ── Active Check-in Banners (target, clay, deer management) ── */}
        {activeCheckins.map(session => (
          <ActiveCheckinBanner key={session.id} session={session} />
        ))}

        {/* ── Active Deer Outing Banner (OutingContext) ── */}
        {activeOuting && <ActiveSessionBanner outing={activeOuting} />}

        {/* ── Secondary Grid ── */}
        <SecondaryGrid user={user} />

        {/* ── Widgets ── */}
         {widgetsReady ? (
           <Suspense fallback={<div className="w-full h-32 bg-secondary/20 rounded-lg animate-pulse" />}>
             <AmmoStockWidget />
             <ReloadingWidget />
           </Suspense>
         ) : (
           <div className="w-full h-32 bg-secondary/20 rounded-lg animate-pulse" />
         )}

          {/* ── Beta Tester Feedback (if beta tester or admin) ── */}
         {(user?.role === 'beta_tester' || user?.role === 'admin') && (
           <Link to="/beta-feedback" className="block">
             <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 hover:bg-primary/15 transition-colors">
               <div className="flex items-center gap-3">
                 <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
                 <div>
                   <p className="font-semibold text-sm text-foreground">
                     {user?.role === 'admin' ? 'Manage Feedback Forum' : 'Help Improve the App'}
                   </p>
                   <p className="text-xs text-muted-foreground mt-0.5">
                     {user?.role === 'admin' ? 'Review beta tester feedback' : 'Share bugs and ideas in the feedback forum'}
                   </p>
                 </div>
                 <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 ml-auto" />
               </div>
             </div>
           </Link>
         )}

         {/* ── Analytics (collapsible) ── */}
          {analyticsData && <ChartsSection analyticsData={analyticsData} />}

      </main>
    </div>
  );
}