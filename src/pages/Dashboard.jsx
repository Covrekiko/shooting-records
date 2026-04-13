import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Activity, Zap, Target, MapPin } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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
          const [targetShoots, clayShoots, deerMgmt] = await Promise.all([
            base44.entities.TargetShooting.filter({ created_by: currentUser.email }),
            base44.entities.ClayShooting.filter({ created_by: currentUser.email }),
            base44.entities.DeerManagement.filter({ created_by: currentUser.email }),
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
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.full_name}</p>
        </div>

        {user?.role === 'admin' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              label="Total Users"
              value={stats?.totalUsers || 0}
            />
            <StatCard
              icon={<Target className="w-8 h-8" />}
              label="Total Records"
              value={stats?.totalRecords || 0}
            />
            <StatCard
              icon={<Zap className="w-8 h-8" />}
              label="Target Shooting"
              value={stats?.targetRecords || 0}
            />
            <StatCard
              icon={<Zap className="w-8 h-8" />}
              label="Clay Shooting"
              value={stats?.clayRecords || 0}
            />
            <StatCard
              icon={<MapPin className="w-8 h-8" />}
              label="Deer Management"
              value={stats?.deerRecords || 0}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={<Target className="w-8 h-8" />}
              label="Target Shooting Sessions"
              value={stats?.targetSessions || 0}
            />
            <StatCard
              icon={<Zap className="w-8 h-8" />}
              label="Clay Shooting Sessions"
              value={stats?.claySessions || 0}
            />
            <StatCard
              icon={<MapPin className="w-8 h-8" />}
              label="Deer Management Outings"
              value={stats?.deerOutings || 0}
            />
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              label="Total Rifle Rounds"
              value={stats?.totalRifleRounds || 0}
            />
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              label="Total Shotgun Rounds"
              value={stats?.totalShotgunRounds || 0}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <p className="text-4xl font-bold text-primary">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </div>
  );
}