import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { generateSessionPDF, generateRifleHistoryPDF, generateAmmoComparisonPDF } from '@/utils/targetAnalyzerPDF';

export default function AnalyzerReports() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const [r, s, g] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: user.email }),
        base44.entities.TargetSession.list('-date', 500),
        base44.entities.TargetGroup.list('-created_date', 1000),
      ]);
      setRifles(r || []);
      setSessions(s || []);
      setGroups(g || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleRifleHistory = async (rifle) => {
    setGenerating(rifle.id);
    const rifleSessions = sessions.filter(s => s.rifle_id === rifle.id);
    const sessionIds = new Set(rifleSessions.map(s => s.id));
    const rifleGroups = groups.filter(g => sessionIds.has(g.session_id));
    await generateRifleHistoryPDF(rifle, rifleSessions, rifleGroups);
    setGenerating(null);
  };

  const handleAmmoComparison = async () => {
    setGenerating('ammo');
    await generateAmmoComparisonPDF(sessions, groups, rifles);
    setGenerating(null);
  };

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/target-analyzer')} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">PDF Reports</h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ammo Comparison</h2>
          <button
            onClick={handleAmmoComparison}
            disabled={generating === 'ammo'}
            className="w-full flex items-center gap-3 py-4 px-4 bg-secondary rounded-xl hover:bg-accent active:scale-95 transition-all text-left">
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-medium">{generating === 'ammo' ? 'Generating...' : 'Ammo Comparison Report'}</span>
            <Download className="w-4 h-4 ml-auto text-muted-foreground" />
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Rifle History Reports</h2>
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {rifles.map(rifle => (
            <button
              key={rifle.id}
              onClick={() => handleRifleHistory(rifle)}
              disabled={!!generating}
              className="w-full flex items-center gap-3 py-4 px-4 bg-secondary rounded-xl hover:bg-accent active:scale-95 transition-all text-left">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{rifle.name || `${rifle.make} ${rifle.model}`}</p>
                <p className="text-xs text-muted-foreground">{rifle.caliber} · {sessions.filter(s => s.rifle_id === rifle.id).length} sessions</p>
              </div>
              {generating === rifle.id
                ? <span className="text-xs text-muted-foreground">Generating...</span>
                : <Download className="w-4 h-4 text-muted-foreground" />}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Individual Session Reports</h2>
          <p className="text-xs text-muted-foreground">Open a session and tap "PDF Export" to download.</p>
          {sessions.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-secondary rounded-xl text-sm">
              <div>
                <p className="font-medium">{s.rifle_name || 'Unknown Rifle'}</p>
                <p className="text-muted-foreground text-xs">{s.date} · {s.distance}{s.distance_unit}</p>
              </div>
              <button
                onClick={() => {
                  const sg = groups.filter(g => g.session_id === s.id);
                  generateSessionPDF(s, sg);
                }}
                className="p-2 rounded-lg bg-card border border-border hover:bg-primary hover:text-primary-foreground transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}