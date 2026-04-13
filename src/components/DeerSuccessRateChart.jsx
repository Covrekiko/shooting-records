import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function DeerSuccessRateChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Deer Management Success Rate</h3>
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Deer Management Success Rate</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="species" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#1e642d" name="Total Outings" />
          <Bar dataKey="successful" fill="#16a34a" name="With Kills" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-muted-foreground mt-4">
        Shows the number of deer outings and successful hunts by species.
      </p>
    </div>
  );
}