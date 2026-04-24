import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportScorecardPDF } from '@/utils/clayScorecardPDF';
import ScorecardShareButton from './ScorecardShareButton';

export default function ClayCheckoutSummary({ sessionId, scorecard, shotguns, ammunition, onShowScorecard }) {
  const [stands, setStands] = useState([]);
  const [shotsMap, setShotsMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !scorecard) return;
    loadStandsData();
  }, [sessionId, scorecard]);

  const loadStandsData = async () => {
    setLoading(true);
    const standsData = await base44.entities.ClayStand.filter({ clay_scorecard_id: scorecard.id });
    const sorted = standsData.sort((a, b) => a.stand_number - b.stand_number);
    setStands(sorted);

    const sbsStands = sorted.filter(s => s.scoring_method === 'shot_by_shot');
    const map = {};
    await Promise.all(sbsStands.map(async stand => {
      const shots = await base44.entities.ClayShot.filter({ clay_stand_id: stand.id });
      map[stand.id] = shots.sort((a, b) => a.shot_number - b.shot_number);
    }));
    setShotsMap(map);
    setLoading(false);
  };

  if (!scorecard || scorecard.total_stands === 0) return null;

  const session = { id: sessionId };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Clay Scorecard Summary</p>
        {loading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Stand-by-Stand Summary */}
      {stands.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {stands.map((stand) => {
            const valid = (stand.hits || 0) + (stand.misses || 0);
            const pct = valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0;
            return (
              <div key={stand.id} className="bg-white dark:bg-slate-800 rounded-lg p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Stand {stand.stand_number}</span>
                  <span className="text-muted-foreground text-[10px]">{stand.discipline_type}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-[10px]">
                  <div className="text-emerald-600 font-semibold">{stand.hits || 0} Dead</div>
                  <div className="text-red-500 font-semibold">{stand.misses || 0} Lost</div>
                  <div className="text-amber-600 font-semibold">{stand.no_birds || 0} NB</div>
                  <div className="text-right font-semibold">{stand.hits || 0}/{valid}</div>
                  <div className="text-right font-bold text-primary">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Totals */}
      <div className="border-t border-primary/20 pt-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Total Stands</span>
          <span className="font-semibold text-right">{scorecard.total_stands}</span>

          <span className="text-muted-foreground">Total Clays</span>
          <span className="font-semibold text-right">{scorecard.total_clays}</span>

          <span className="text-muted-foreground">Dead</span>
          <span className="font-semibold text-emerald-600 text-right">{scorecard.total_hits}</span>

          <span className="text-muted-foreground">Lost</span>
          <span className="font-semibold text-red-500 text-right">{scorecard.total_misses}</span>

          <span className="text-muted-foreground">No Birds</span>
          <span className="font-semibold text-amber-600 text-right">{scorecard.total_no_birds || 0}</span>

          <span className="text-muted-foreground">Valid Scored</span>
          <span className="font-semibold text-right">{scorecard.total_valid_scored_clays}</span>

          <span className="text-muted-foreground font-bold">Final Score</span>
          <span className="font-bold text-right">{scorecard.total_hits}/{scorecard.total_valid_scored_clays}</span>

          <span className="text-muted-foreground font-bold">Percentage</span>
          <span className="font-bold text-primary text-right">{scorecard.hit_percentage}%</span>

          <span className="text-muted-foreground">Cartridges</span>
          <span className="font-semibold text-right">{scorecard.total_cartridges_used || 0}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onShowScorecard}
          className="flex items-center justify-center gap-1.5 py-2.5 bg-background hover:bg-secondary border border-primary/30 rounded-lg text-xs font-semibold text-primary transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const shotgun = shotguns?.find(s => s.id === session.shotgun_id);
            const ammo = ammunition?.find(a => a.id === session.ammunition_id);
            exportScorecardPDF(session, stands, scorecard, shotgun, ammo, shotsMap);
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 bg-background hover:bg-secondary border border-primary/30 rounded-lg text-xs font-semibold text-primary transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </motion.button>
        <ScorecardShareButton scorecard={scorecard} stands={stands} />
      </div>
    </div>
  );
}