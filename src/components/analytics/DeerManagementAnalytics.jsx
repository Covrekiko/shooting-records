import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/card';

export default function DeerManagementAnalytics({ records }) {
  if (!records || records.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No deer management records found</div>;
  }

  // Success rate by location
  const locationData = {};
  records.forEach((record) => {
    const location = record.place_name || 'Unknown Location';
    if (!locationData[location]) {
      locationData[location] = { name: location, sessions: 0, successful: 0 };
    }
    locationData[location].sessions++;
    if (record.total_count && parseInt(record.total_count) > 0) {
      locationData[location].successful++;
    }
  });
  const locationStats = Object.values(locationData).map((loc) => ({
    ...loc,
    successRate: ((loc.successful / loc.sessions) * 100).toFixed(1),
  }));

  // Species distribution
  const speciesData = {};
  records.forEach((record) => {
    if (record.species_list) {
      record.species_list.forEach((s) => {
        const species = s.species || 'Unknown';
        if (!speciesData[species]) {
          speciesData[species] = { name: species, harvested: 0, attempts: 0 };
        }
        speciesData[species].harvested += parseInt(s.count) || 0;
        speciesData[species].attempts++;
      });
    }
  });
  const topSpecies = Object.values(speciesData)
    .sort((a, b) => b.harvested - a.harvested)
    .slice(0, 8);

  // Weapon usage
  const weaponData = {};
  records.forEach((record) => {
    const weapon = record.rifle_id || 'Unknown Rifle';
    if (!weaponData[weapon]) {
      weaponData[weapon] = { name: weapon, sessions: 0, harvests: 0 };
    }
    weaponData[weapon].sessions++;
    if (record.total_count && parseInt(record.total_count) > 0) {
      weaponData[weapon].harvests++;
    }
  });
  const topWeapons = Object.values(weaponData)
    .sort((a, b) => b.harvests - a.harvests)
    .slice(0, 6);

  // Monthly trends
  const monthlyData = {};
  records.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, outings: 0, successful: 0 };
    }
    monthlyData[monthKey].outings++;
    if (record.total_count && parseInt(record.total_count) > 0) {
      monthlyData[monthKey].successful++;
    }
  });
  const monthly = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  const totalOutings = records.length;
  const successfulOutings = records.filter((r) => r.total_count && parseInt(r.total_count) > 0).length;
  const successRate = ((successfulOutings / totalOutings) * 100).toFixed(1);
  const totalHarvested = records.reduce((sum, r) => sum + (parseInt(r.total_count) || 0), 0);

  const COLORS = ['#ff7c00', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Outings</p>
          <p className="text-2xl font-bold text-primary">{totalOutings}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Successful Outings</p>
          <p className="text-2xl font-bold text-primary">{successfulOutings}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-primary">{successRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Harvested</p>
          <p className="text-2xl font-bold text-primary">{totalHarvested}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Success Rate by Location</h3>
        {locationStats.length > 0 ? (
          <div className="space-y-3">
            {locationStats.map((loc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="font-medium text-sm">{loc.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{loc.sessions} outings</span>
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${loc.successRate}%` }}
                    />
                  </div>
                  <span className="font-semibold text-sm min-w-12 text-right">{loc.successRate}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Monthly Success Trend</h3>
        {monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="outings" stroke="#ff7c00" name="Outings" />
              <Line yAxisId="right" type="monotone" dataKey="successful" stroke="#10b981" name="Successful" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Species Distribution</h3>
        {topSpecies.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSpecies}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="harvested" fill="#ff7c00" name="Harvested" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Weapon Success Rate</h3>
        {topWeapons.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topWeapons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="sessions" fill="#2563eb" name="Sessions" />
              <Bar yAxisId="right" dataKey="harvests" fill="#10b981" name="Successful" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Species Breakdown</h3>
        {topSpecies.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topSpecies}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, harvested }) => `${name}: ${harvested}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="harvested"
              >
                {topSpecies.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>
    </div>
  );
}