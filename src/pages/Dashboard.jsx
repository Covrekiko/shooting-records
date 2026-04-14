import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Activity, Zap, Target, MapPin, BarChart3, Crosshair, BookOpen, Map } from 'lucide-react';

import {
  MonthlyActivityChart,
  RoundsPerFirearmChart,
  ClubActivityHeatmap,
  AdminActivityChart,
} from '@/components/Charts';
import { RoundsPerMonthChart } from '@/components/RoundsPerMonthChart';
import { DeerSuccessRateChart } from '@/components/DeerSuccessRateChart';
import AmmoStockWidget from '@/components/AmmoStockWidget';
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
          const [users, targetShoots, clayShoots, deerMgmt] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.TargetShooting.list(),
            base44.entities.ClayShooting.list(),
            base44.entities.DeerManagement.list(),
          ]);

          setStats({
            totalUsers: users.length,
            totalRecords: targetShoots.length + clayShoots.length + deerMgmt.length,
            targetRecords: targetShoots.length,
            clayRecords: clayShoots.length,
            deerRecords: deerMgmt.length,
          });
        } else {
          const [targetShoots, clayShoots, deerMgmt, rifles, shotguns, clubs, locations] = await Promise.all([
            base44.entities.TargetShooting.filter({ created_by: currentUser.email }),
            base44.entities.ClayShooting.filter({ created_by: currentUser.email }),
            base44.entities.DeerManagement.filter({ created_by: currentUser.email }),
            base44.entities.Rifle.filter({ created_by: currentUser.email }),
            base44.entities.Shotgun.filter({ created_by: currentUser.email }),
            base44.entities.Club.filter({ created_by: currentUser.email }),
            base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
          ]);

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
    <div>
      <Navigation />
      {(pulling || refreshing) && (
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none', opacity: refreshing ? 1 : progress, transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.full_name}</p>
        </div>

        {user?.role === 'admin' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={<Map className="w-8 h-8" />}
              label="Stalking Map"
              value="Open"
              link="/deer-stalking"
            />
            <StatCard
              icon={<span className="text-2xl">🦌</span>}
              label="Deer Management"
              value={stats?.deerRecords || 0}
              link="/deer-management"
            />
            <StatCard
              icon={<Crosshair className="w-8 h-8" />}
              label="Target Shooting"
              value={stats?.targetRecords || 0}
              link="/target-shooting"
            />
            <StatCard
              icon={<span className="text-2xl">🎯</span>}
              label="Clay Shooting"
              value={stats?.clayRecords || 0}
              link="/clay-shooting"
             />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={<Map className="w-8 h-8" />}
              label="Stalking Map"
              value="Open"
              link="/deer-stalking"
            />
            <StatCard
              icon={<Crosshair className="w-8 h-8" />}
              label="Target Shooting Sessions"
              value={stats?.targetSessions || 0}
              link="/target-shooting"
            />
            <StatCard
              icon={<img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/d927f40c6_generated_image.png" alt="shotgun" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />}
              label="Clay Shooting Sessions"
              value={stats?.claySessions || 0}
              link="/clay-shooting"
            />
            <StatCard
              icon={<span className="text-2xl">🦌</span>}
              label="Deer Management Outings"
              value={stats?.deerOutings || 0}
              link="/deer-management"
              hideOnMobile={true}
            />
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              label="Total Rifle Rounds"
              value={stats?.totalRifleRounds || 0}
              link="/records"
              hideOnMobile={true}
            />
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              label="Total Shotgun Rounds"
              value={stats?.totalShotgunRounds || 0}
              link="/records"
              hideOnMobile={true}
            />
          </div>
        )}

        {/* Widgets */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AmmoStockWidget />
        </div>

        {/* Stalking Map Section */}
         {user?.role !== 'admin' && (
           <div className="mt-12 hidden md:block">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Deer Stalking Map</h2>
            </div>
            <Link
              to="/deer-stalking"
              className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-shadow block text-center"
            >
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-lg font-semibold text-foreground mb-2">Open Deer Stalking Map</p>
              <p className="text-sm text-muted-foreground">View boundaries, track outings, and log harvests</p>
            </Link>
          </div>
        )}

        {/* Charts Section */}
        {user?.role !== 'admin' && chartData && (
          <div className="mt-12 space-y-6 hidden md:block">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <Link
                to="/reports"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
              >
                <BarChart3 className="w-4 h-4" />
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

  // Map rifles
  const rifleMap = rifles.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {});
  const shotgunMap = shotguns.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {});

  targetShoots.forEach((record) => {
    const name = rifleMap[record.rifle_id] || 'Unknown Rifle';
    firearmMap[name] = (firearmMap[name] || 0) + (record.rounds_fired || 0);
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
    const species = record.deer_species || 'Other';
    if (!speciesMap[species]) {
      speciesMap[species] = { species, count: 0, successful: 0 };
    }
    speciesMap[species].count++;
    if (record.number_shot && record.number_shot > 0) {
      speciesMap[species].successful++;
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

function StatCard({ icon, label, value, link, hideOnMobile }) {
  const content = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground mb-2">{label}</p>
        <p className="text-3xl sm:text-4xl font-bold text-primary">{value}</p>
      </div>
      <div className="text-muted-foreground cursor-pointer hover:text-primary transition-colors flex-shrink-0 [&_svg]:w-5 [&_svg]:h-5 sm:[&_svg]:w-8 sm:[&_svg]:h-8 [&_img]:w-6 [&_img]:h-6 sm:[&_img]:w-8 sm:[&_img]:h-8 text-lg sm:text-2xl">{icon}</div>
    </div>
  );

  const cardClass = hideOnMobile ? "hidden md:block" : "";

  if (link) {
    return (
      <Link to={link} className={`bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow block ${cardClass}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow ${cardClass}`}>
      {content}
    </div>
  );
}