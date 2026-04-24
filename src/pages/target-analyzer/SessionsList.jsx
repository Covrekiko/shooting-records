import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Target, ChevronRight } from 'lucide-react';

export default function SessionsList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.TargetSession.list('-date', 100).then(r => {
      setSessions(r || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/target-analyzer')} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Previous Sessions</h1>
          <Link to="/target-analyzer/new">
            <button className="p-2 rounded-xl bg-primary text-primary-foreground"><Plus className="w-5 h-5" /></button>
          </Link>
        </div>

        {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No sessions yet.</p>
            <Link to="/target-analyzer/new" className="mt-3 inline-block text-primary underline">Start your first session</Link>
          </div>
        )}

        {sessions.map(s => (
          <Link key={s.id} to={`/target-analyzer/session/${s.id}`}>
            <div className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4 active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.rifle_name || 'Unknown Rifle'}</p>
                <p className="text-sm text-muted-foreground">{s.date} · {s.distance}{s.distance_unit} · {s.range_name || 'No range'}</p>
                {s.ammo_name && <p className="text-xs text-muted-foreground truncate">{s.ammo_name}</p>}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}