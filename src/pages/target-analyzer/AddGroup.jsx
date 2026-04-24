import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ManualGroupForm from '@/components/target-analyzer/ManualGroupForm';
import PhotoGroupAnalyzer from '@/components/target-analyzer/PhotoGroupAnalyzer';

export default function AddGroup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState(null); // 'manual' | 'photo'
  const [nextGroupNumber, setNextGroupNumber] = useState(1);

  useEffect(() => {
    Promise.all([
      base44.entities.TargetSession.filter({ id }).then(r => setSession(r[0] || null)),
      base44.entities.TargetGroup.filter({ session_id: id }).then(groups => {
        const nums = groups.map(g => {
          const match = g.group_name?.match(/Group\s*(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
        setNextGroupNumber(Math.max(...nums, 0) + 1);
      })
    ]);
  }, [id]);

  const handleSave = async (groupData) => {
    await base44.entities.TargetGroup.create({ ...groupData, session_id: id });
    navigate(`/target-analyzer/session/${id}`);
  };

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/target-analyzer/session/${id}`)} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Add Group</h1>
        </div>

        {!mode && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">How do you want to enter this group?</p>
            <button onClick={() => setMode('photo')}
              className="w-full flex flex-col items-center justify-center gap-2 p-8 bg-card border-2 border-primary rounded-2xl text-lg font-bold active:scale-95 transition-transform">
              📸 Analyze Target Photo
              <span className="text-sm font-normal text-muted-foreground">Tap bullet holes on your photo</span>
            </button>
            <button onClick={() => setMode('manual')}
              className="w-full flex flex-col items-center justify-center gap-2 p-8 bg-card border border-border rounded-2xl text-lg font-bold active:scale-95 transition-transform">
              ✏️ Enter Manually
              <span className="text-sm font-normal text-muted-foreground">Type group size and corrections</span>
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <ManualGroupForm session={session} onSave={handleSave} onBack={() => setMode(null)} defaultGroupName={`Group ${nextGroupNumber}`} />
        )}

        {mode === 'photo' && (
          <PhotoGroupAnalyzer session={session} onSave={handleSave} onBack={() => setMode(null)} defaultGroupName={`Group ${nextGroupNumber}`} />
        )}
      </div>
    </div>
  );
}