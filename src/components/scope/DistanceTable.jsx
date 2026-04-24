import { Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';

export default function DistanceTable({ data, turretType, onEdit, onDelete }) {
  // Group by distance, separating calculated vs confirmed
  const grouped = {};
  data.forEach(row => {
    if (!grouped[row.distance]) grouped[row.distance] = {};
    grouped[row.distance][row.data_type] = row;
  });

  const distances = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex gap-3 text-xs mb-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Calculated</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Confirmed</span>
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 md:hidden">
        {data.sort((a, b) => a.distance - b.distance || (a.data_type === 'calculated' ? -1 : 1)).map(row => (
          <DistanceRowCard key={row.id} row={row} turretType={turretType} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="pb-2 text-left font-semibold">Dist</th>
              <th className="pb-2 text-left font-semibold">Type</th>
              <th className="pb-2 text-right font-semibold">↑ Elev Clicks</th>
              <th className="pb-2 text-right font-semibold">{turretType} Value</th>
              <th className="pb-2 text-right font-semibold">← Wind</th>
              <th className="pb-2 text-center font-semibold">✓ Conf</th>
              <th className="pb-2 text-left font-semibold">Ammo</th>
              <th className="pb-2 text-left font-semibold">Date</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${row.data_type === 'confirmed' ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                <td className="py-2 font-bold">{row.distance}{row.distance_unit || 'm'}</td>
                <td className="py-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    row.data_type === 'confirmed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  }`}>
                    {row.data_type === 'confirmed' ? 'CONF' : 'CALC'}
                  </span>
                </td>
                <td className="py-2 text-right font-mono font-bold text-primary">
                  {row.elevation_clicks != null ? `+${row.elevation_clicks}` : '—'}
                </td>
                <td className="py-2 text-right text-muted-foreground text-xs">{row.elevation_unit_value || '—'}</td>
                <td className="py-2 text-right text-xs">{row.windage_clicks ? `${row.windage_clicks > 0 ? '+' : ''}${row.windage_clicks}` : '—'}</td>
                <td className="py-2 text-center">
                  {row.confirmed_at_range
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                    : <Circle className="w-4 h-4 text-muted-foreground mx-auto" />
                  }
                </td>
                <td className="py-2 text-xs text-muted-foreground max-w-[100px] truncate">{row.ammunition_used || '—'}</td>
                <td className="py-2 text-xs text-muted-foreground">{row.date_confirmed || '—'}</td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(row)} className="p-1 hover:text-primary rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(row.id)} className="p-1 hover:text-destructive rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DistanceRowCard({ row, turretType, onEdit, onDelete }) {
  const isConfirmed = row.data_type === 'confirmed';
  return (
    <div className={`border rounded-xl p-3 ${isConfirmed ? 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{row.distance}{row.distance_unit || 'm'}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isConfirmed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
          }`}>
            {isConfirmed ? 'CONFIRMED' : 'CALCULATED'}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(row)} className="p-1.5 hover:bg-secondary rounded-lg"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(row.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-primary/5 rounded-lg p-2 text-center">
          <p className="text-muted-foreground">Elevation</p>
          <p className="font-bold text-primary text-base">{row.elevation_clicks != null ? `+${row.elevation_clicks}` : '—'}</p>
          <p className="text-muted-foreground">clicks</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-muted-foreground">{turretType}</p>
          <p className="font-bold">{row.elevation_unit_value || '—'}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-muted-foreground">Windage</p>
          <p className="font-bold">{row.windage_clicks ? `${row.windage_clicks > 0 ? '+' : ''}${row.windage_clicks}` : '—'}</p>
        </div>
      </div>

      {(row.ammunition_used || row.date_confirmed || row.temperature || row.notes) && (
        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
          {row.ammunition_used && <p>💊 {row.ammunition_used}</p>}
          {row.date_confirmed && <p>📅 {row.date_confirmed}</p>}
          {row.temperature && <p>🌡️ {row.temperature}</p>}
          {row.notes && <p className="italic">"{row.notes}"</p>}
        </div>
      )}
      {row.photos?.length > 0 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {row.photos.map((url, i) => <img key={i} src={url} className="h-12 w-12 object-cover rounded-lg flex-shrink-0" alt="" />)}
        </div>
      )}
    </div>
  );
}