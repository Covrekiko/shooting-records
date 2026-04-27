import { useState, useEffect, useRef } from 'react';
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { mmToMoa, mmToMrad, calcGroupSizePixels, convertGroupSize } from '@/lib/groupSizeCalculations';

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

export default function AIPhotoComparison({
  session,
  photo,
  onBack,
  onSave,
  editGroup,
  rifles = [],
  ammunition = []
}) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [userMarks, setUserMarks] = useState([]);
  const [centrePoint, setCentrePoint] = useState(null);
  const [scalePx, setScalePx] = useState(null);
  const [groupName, setGroupName] = useState(editGroup?.group_name || `Group ${(editGroup?.id || 0) + 1}`);
  const [confirmedZero, setConfirmedZero] = useState(editGroup?.confirmed || false);
  const [bestGroup, setBestGroup] = useState(editGroup?.best_group || false);
  const [notes, setNotes] = useState(editGroup?.notes || '');
  const [tab, setTab] = useState('ai'); // ai | manual | compare
  const [comparison, setComparison] = useState(null);
  const [saving, setSaving] = useState(false);
  const [shootingPosition, setShootingPosition] = useState(editGroup?.shooting_position || '');
  const [distanceOverride, setDistanceOverride] = useState(editGroup?.distance_override || '');
  const [selectedRifleId, setSelectedRifleId] = useState(editGroup?.rifle_id || '');
  const [selectedAmmoId, setSelectedAmmoId] = useState(editGroup?.ammunition_id || '');
  const imgRef = useRef(null);
  const POSITIONS = ['benchrest', 'prone', 'sticks', 'high_seat', 'standing', 'other'];

  // Perform AI analysis on mount
  useEffect(() => {
    analyzeWithAI();
  }, [photo]);

  const analyzeWithAI = async () => {
    if (!photo) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await base44.functions.invoke('analyzeTargetPhotoWithAI', {
        photo_url: photo,
        distance: session.distance,
        distance_unit: session.distance_unit || 'm'
      });
      if (res.data.success) {
        setAiAnalysis(res.data.analysis);
      } else {
        setAiError(res.data.error || 'AI analysis failed');
      }
    } catch (err) {
      setAiError(err.message || 'Error running AI analysis');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddMark = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setUserMarks(prev => [...prev, { x, y }]);
  };

  const calculateComparison = () => {
    if (!aiAnalysis || !scalePx || userMarks.length < 2) {
      setComparison(null);
      return;
    }

    const distM = session.distance_unit === 'yards' ? session.distance * 0.9144 : session.distance;
    
    // Use shared calculation function
    const aiGroupPx = calcGroupSizePixels(aiAnalysis.detected_bullets);
    const aiMetrics = convertGroupSize(aiGroupPx, scalePx, distM);

    const userGroupPx = calcGroupSizePixels(userMarks);
    const userMetrics = convertGroupSize(userGroupPx, scalePx, distM);

    if (!aiMetrics || !userMetrics) {
      setComparison(null);
      return;
    }

    setComparison({
      ai: {
        shots: aiAnalysis.detected_bullets?.length || 0,
        groupMm: aiMetrics.mm,
        groupMoa: aiMetrics.moa,
        groupMrad: aiMetrics.mrad,
      },
      user: {
        shots: userMarks.length,
        groupMm: userMetrics.mm,
        groupMoa: userMetrics.moa,
        groupMrad: userMetrics.mrad,
      },
      diff: {
        shots: userMarks.length - (aiAnalysis.detected_bullets?.length || 0),
        groupMm: Math.round((userMetrics.mm - aiMetrics.mm) * 10) / 10,
        groupMoa: Math.round((userMetrics.moa - aiMetrics.moa) * 100) / 100,
        groupMrad: Math.round((userMetrics.mrad - aiMetrics.mrad) * 1000) / 1000,
      }
    });
  };

  useEffect(() => {
    calculateComparison();
  }, [userMarks, scalePx, aiAnalysis]);

  const handleSaveComparison = async () => {
    if (!comparison) {
      alert('Complete manual marking to save');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        group_name: groupName,
        entry_method: 'ai_comparison',
        photo_url: photo,
        
        // AI results
        ai_detected_shots: comparison.ai.shots,
        ai_group_size_mm: comparison.ai.groupMm,
        ai_group_size_moa: comparison.ai.groupMoa,
        ai_group_size_mrad: comparison.ai.groupMrad,
        ai_detected_marks_json: JSON.stringify(aiAnalysis.detected_bullets),
        
        // User confirmed results
        number_of_shots: comparison.user.shots,
        group_size_mm: comparison.user.groupMm,
        group_size_moa: comparison.user.groupMoa,
        group_size_mrad: comparison.user.groupMrad,
        user_confirmed_group_size_mm: comparison.user.groupMm,
        user_confirmed_group_size_moa: comparison.user.groupMoa,
        user_confirmed_group_size_mrad: comparison.user.groupMrad,
        manual_marks_json: JSON.stringify(userMarks),
        
        // Comparison
        comparison_result_json: JSON.stringify(comparison),
        ai_analysis_confirmed: true,
        
        bullet_holes: userMarks,
         centre_x: centrePoint?.x || null,
         centre_y: centrePoint?.y || null,
         scale_mm_per_px: scalePx,
         confirmed: confirmedZero,
         best_group: bestGroup,
         notes,
         shooting_position: shootingPosition || null,
         distance_override: distanceOverride ? parseFloat(distanceOverride) : null,
         rifle_id: selectedRifleId || null,
         rifle_name: rifles.find(r => r.id === selectedRifleId)?.name || null,
         ammunition_id: selectedAmmoId || null,
         ammo_override: (() => {
           const a = ammunition.find(x => x.id === selectedAmmoId);
           return a ? `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.grain ? ` ${a.grain}gr` : ''}` : null;
         })(),
        };
      setSaving(false);
      onSave(payload);
    } catch (err) {
      alert('Error saving: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">AI Photo Analysis + Manual Review</h2>
          <p className="text-xs text-muted-foreground">{session.distance}{session.distance_unit || 'm'} · {session.rifle_name}</p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">AI analysis is only an estimate</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">Confirm bullet holes, scale reference and correction before saving.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setTab('ai')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          🤖 AI Analysis
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          ✏️ Manual Mark
        </button>
        <button
          onClick={() => setTab('compare')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'compare' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          disabled={!comparison}
        >
          ⚖️ Compare
        </button>
      </div>

      {/* AI Analysis Tab */}
      {tab === 'ai' && (
        <div className="space-y-4">
          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing photo with AI…</p>
            </div>
          )}
          {aiError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm">{aiError}</p>
            </div>
          )}
          {aiAnalysis && !aiLoading && (
            <>
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">AI Detection Results</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{aiAnalysis.detected_bullets?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Shots Detected</p>
                  </div>
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className="text-lg font-semibold">{(aiAnalysis.confidence * 100).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>
                {aiAnalysis.notes && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-primary/20">{aiAnalysis.notes}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                ✓ Review the AI detection in the Manual tab to confirm or adjust marks
              </p>
            </>
          )}
        </div>
      )}

      {/* Manual Mark Tab */}
      {tab === 'manual' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-sm mb-3">Set Scale Reference</p>
            <div className="flex gap-2 mb-2">
              <input type="number" value={scalePx ? (1 / scalePx).toFixed(2) : ''} onChange={e => setScalePx(e.target.value ? 1 / parseFloat(e.target.value) : null)}
                placeholder="mm per pixel" className={inp} />
            </div>
            <button onClick={() => setTab('ai')}
              className="text-xs text-primary font-semibold">Need help? Go back to AI analysis</button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-border bg-black">
            <img
              ref={imgRef}
              src={photo}
              className="w-full cursor-crosshair"
              alt="Target"
              onClick={handleAddMark}
            />
            {/* User marks overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {userMarks.map((m, i) => {
                const img = imgRef.current;
                if (!img) return null;
                const rect = img.getBoundingClientRect();
                const x = m.x / img.naturalWidth * rect.width;
                const y = m.y / img.naturalHeight * rect.height;
                return (
                  <div key={i} className="absolute" style={{ left: x - 10, top: y - 10 }}>
                    <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-[8px] font-bold shadow-lg">{i + 1}</div>
                  </div>
                );
              })}
              {aiAnalysis?.detected_bullets?.map((m, i) => {
                const img = imgRef.current;
                if (!img) return null;
                const rect = img.getBoundingClientRect();
                const x = m.x * img.naturalWidth / rect.width * (rect.width / img.naturalWidth);
                const y = m.y * img.naturalHeight / rect.height * (rect.height / img.naturalHeight);
                return (
                  <div key={`ai-${i}`} className="absolute" style={{ left: x - 10, top: y - 10, opacity: 0.5 }}>
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 text-[8px] font-bold shadow-lg">A</div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            🟢 Green = Your marks · 🔵 Blue = AI marks (faded)
          </p>

          <button onClick={() => setUserMarks(prev => prev.slice(0, -1))}
            className="w-full py-2 bg-secondary rounded-xl text-sm font-semibold">
            Undo Last Mark
          </button>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
           <div>
             <label className={lbl}>Group Name</label>
             <input value={groupName} onChange={e => setGroupName(e.target.value)} className={inp} />
           </div>
           <label className="flex items-center gap-3 cursor-pointer">
             <input type="checkbox" checked={confirmedZero} onChange={e => setConfirmedZero(e.target.checked)} className="w-5 h-5" />
             <span className="font-semibold text-sm">Confirmed Zero</span>
           </label>
           <label className="flex items-center gap-3 cursor-pointer">
             <input type="checkbox" checked={bestGroup} onChange={e => setBestGroup(e.target.checked)} className="w-5 h-5" />
             <span className="font-semibold text-sm">Mark as Best Group ⭐</span>
           </label>
          </div>
        </div>
      )}

      {/* Compare Tab */}
      {tab === 'compare' && comparison && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-2xl p-3">
              <p className="text-xs text-muted-foreground font-semibold mb-2">AI Result</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Shots:</span><span className="font-bold">{comparison.ai.shots}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Group:</span><span className="font-bold">{comparison.ai.groupMm}mm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MOA:</span><span className="font-bold">{comparison.ai.groupMoa}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MRAD:</span><span className="font-bold">{comparison.ai.groupMrad}</span></div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3">
              <p className="text-xs text-primary font-semibold mb-2">Your Result</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Shots:</span><span className="font-bold">{comparison.user.shots}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Group:</span><span className="font-bold">{comparison.user.groupMm}mm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MOA:</span><span className="font-bold">{comparison.user.groupMoa}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MRAD:</span><span className="font-bold">{comparison.user.groupMrad}</span></div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-2">Difference</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Shots:</span><span className={`font-bold ${comparison.diff.shots === 0 ? 'text-green-600' : 'text-amber-600'}`}>{comparison.diff.shots > 0 ? '+' : ''}{comparison.diff.shots}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Group:</span><span className={`font-bold ${comparison.diff.groupMm === 0 ? 'text-green-600' : comparison.diff.groupMm > 0 ? 'text-amber-600' : 'text-green-600'}`}>{comparison.diff.groupMm > 0 ? '+' : ''}{comparison.diff.groupMm}mm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MOA:</span><span className="font-bold">{comparison.diff.groupMoa > 0 ? '+' : ''}{comparison.diff.groupMoa}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MRAD:</span><span className="font-bold">{comparison.diff.groupMrad > 0 ? '+' : ''}{comparison.diff.groupMrad}</span></div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveComparison} disabled={saving}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Saving…' : 'Save Group with Comparison'}
          </button>
        </div>
      )}
    </div>
  );
}