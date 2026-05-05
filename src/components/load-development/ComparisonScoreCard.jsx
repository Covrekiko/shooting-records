import { Medal, PoundSterling, ShieldCheck, Target } from 'lucide-react';
import { formatMoney, formatMoa } from '@/lib/loadComparison';

export default function ComparisonScoreCard({ row, rank }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{rank}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{row.sourceType}</span>
          </div>
          <h3 className="font-bold text-foreground truncate">{row.name || 'Unnamed load'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{row.rifleName} · {row.caliber || 'Unknown caliber'}</p>
          {row.batch && <p className="text-xs text-muted-foreground mt-0.5">{row.batch}</p>}
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-primary leading-none">{row.overallScore}</div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Score</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/40 p-3">
          <Target className="w-4 h-4 text-primary mb-1" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Accuracy</p>
          <p className="text-sm font-semibold">{formatMoa(row.avgMoa)}</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <PoundSterling className="w-4 h-4 text-primary mb-1" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Cost</p>
          <p className="text-sm font-semibold">{formatMoney(row.costPerRound)}</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <ShieldCheck className="w-4 h-4 text-primary mb-1" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Reliability</p>
          <p className="text-sm font-semibold">{Math.round(row.reliability)}%</p>
        </div>
      </div>

      {rank === 1 && (
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-xl px-3 py-2">
          <Medal className="w-4 h-4" /> Best ranked option for current filters
        </div>
      )}
    </div>
  );
}