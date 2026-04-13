import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function RoundsPerMonthChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Rounds Fired Per Month</h3>
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Rounds Fired Per Month</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="rifle" stroke="#1e642d" strokeWidth={2} name="Rifle Rounds" />
          <Line type="monotone" dataKey="shotgun" stroke="#dc2626" strokeWidth={2} name="Shotgun Rounds" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}