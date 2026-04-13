import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

export function MonthlyActivityChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Monthly Activity Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
          <Legend />
          <Line
            type="monotone"
            dataKey="targetSessions"
            stroke="var(--primary)"
            name="Target Sessions"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="claySessions"
            stroke="var(--accent)"
            name="Clay Sessions"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="deerOutings"
            stroke="var(--chart-2)"
            name="Deer Outings"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RoundsPerFirearmChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Rounds Fired by Firearm</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
          <Legend />
          <Bar dataKey="rounds" fill="var(--primary)" name="Rounds Fired" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClubActivityHeatmap({ data }) {
  const maxVisits = Math.max(...data.map((d) => d.visits), 1);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Most Visited Clubs & Locations</h3>
      <div className="space-y-2">
        {data.map((item, idx) => {
          const intensity = item.visits / maxVisits;
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.visits} visits</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${intensity * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminActivityChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">User Activity Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="user" stroke="var(--muted-foreground)" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
          <Legend />
          <Bar dataKey="records" fill="var(--primary)" name="Total Records" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}