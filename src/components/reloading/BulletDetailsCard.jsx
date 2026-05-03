export default function BulletDetailsCard({ bullet }) {
  if (!bullet) return null;

  const details = [
    ['Brand', bullet.brand],
    ['Bullet Name', bullet.bullet_name],
    ['Caliber', bullet.caliber],
    ['Weight', bullet.weight ? `${bullet.weight}${bullet.weight_unit || 'gr'}` : null],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
      <p className="font-bold text-foreground mb-2">Selected bullet details</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <p className="text-muted-foreground font-semibold uppercase text-[10px]">{label}</p>
            <p className="font-medium text-foreground break-words">{value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}