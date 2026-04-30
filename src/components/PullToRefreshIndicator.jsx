export default function PullToRefreshIndicator({ pulling, refreshing, progress = 0, offline = false }) {
  if (!pulling && !refreshing) return null;

  return (
    <div className="flex justify-center pt-3 pb-1">
      <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 shadow-sm">
        <div
          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
          style={{
            animation: refreshing ? 'spin 0.6s linear infinite' : 'none',
            opacity: refreshing ? 1 : progress,
            transform: `rotate(${progress * 360}deg)`,
          }}
        />
        {offline && <span className="text-xs text-muted-foreground">Offline — showing cached data</span>}
      </div>
    </div>
  );
}