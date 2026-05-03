export default function PrimerDetailsCard({ primer }) {
  if (!primer) return null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <p className="text-muted-foreground font-semibold uppercase text-[10px]">Primer Name</p>
      <p className="font-medium text-foreground">{[primer.brand, primer.name].filter(Boolean).join(' ') || 'Primer'}</p>
    </div>
  );
}