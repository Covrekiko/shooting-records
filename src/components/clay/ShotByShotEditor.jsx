import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceScoring } from '@/hooks/useVoiceScoring';

const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';

/**
 * SINGLE SOURCE OF TRUTH for shot-by-shot scoring
 * 
 * shots = [
 *   { shot_number: 1, result: null, input_method: null },
 *   { shot_number: 2, result: 'hit', input_method: 'voice' },
 *   ...
 * ]
 * 
 * activeShotIndex = index of shot being scored
 * activeShotIndexRef = ref for voice callback to read current index
 */

export default function ShotByShotEditor({ totalShots, shots, shotMeta, noBirds, onChange, onNoBirdsChange, onShotMeta }) {
  // ─── STATE: Single source of truth ──────────────────────────────
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const activeShotIndexRef = useRef(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [standComplete, setStandComplete] = useState(false);
  const [voiceFlash, setVoiceFlash] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeShotIndexRef.current = activeShotIndex;
  }, [activeShotIndex]);

  // ─── HELPER FUNCTIONS ─────────────────────────────────────────────

  const findFirstEmptyShot = useCallback(() => {
    return shots.findIndex((s) => s === null || s === undefined);
  }, [shots]);

  const findNextEmptyShot = useCallback((fromIndex) => {
    return shots.findIndex((s, i) => i > fromIndex && (s === null || s === undefined));
  }, [shots]);

  /**
   * CORE FUNCTION: All scoring goes through here
   * Manual buttons and voice commands call this
   */
  const recordShotResult = useCallback((result, inputMethod = 'manual') => {
    const currentIdx = activeShotIndexRef.current;
    
    // Update shot array
    const updated = [...shots];
    updated[currentIdx] = result;
    onChange(updated);

    // Update metadata
    const updatedMeta = [...(shotMeta || [])];
    updatedMeta[currentIdx] = { input_method: inputMethod };
    onShotMeta?.(updatedMeta);

    // Find next empty shot
    const nextEmpty = findNextEmptyShot(currentIdx);
    if (nextEmpty !== -1) {
      setActiveShotIndex(nextEmpty);
    } else {
      // All shots filled
      setStandComplete(true);
      // Don't auto-stop voice — user must press Stop
    }
  }, [shots, shotMeta, onChange, onShotMeta, findNextEmptyShot]);

  // ─── VOICE HOOK ───────────────────────────────────────────────────
  const { isListening, lastHeard, error: voiceError, start: startVoice, stop: stopVoice } = useVoiceScoring({
    onResult: ({ result, input_method, voice_timestamp, voice_confidence_score }) => {
      if (result === 'no_bird') {
        // No bird: increment counter, don't take a shot slot
        onNoBirdsChange(noBirds + 1);
        setVoiceFlash('nb');
        setLastCommand('no_bird');
        setTimeout(() => setVoiceFlash(null), 800);
        
        // Move to next empty shot (if any)
        const currentIdx = activeShotIndexRef.current;
        const nextIdx = findNextEmptyShot(currentIdx - 1);
        if (nextIdx !== -1) {
          setActiveShotIndex(nextIdx);
        } else {
          setStandComplete(true);
        }
        return;
      }

      // Hit or Miss: use recordShotResult (reads current ref value)
      recordShotResult(result, 'voice');
      setVoiceFlash(activeShotIndexRef.current);
      setLastCommand(result);
      setTimeout(() => setVoiceFlash(null), 800);
    },
  });

  // ─── CALCULATIONS ─────────────────────────────────────────────────
  const hits = shots.filter(r => r === 'hit').length;
  const misses = shots.filter(r => r === 'miss').length;
  const validScored = hits + misses;
  const hitPct = validScored > 0 ? Math.round((hits / validScored) * 100) : 0;

  // ─── EVENT HANDLERS ───────────────────────────────────────────────

  const handleStartStopVoice = () => {
    if (isListening || isVoiceActive) {
      // STOP VOICE
      stopVoice();
      setIsVoiceActive(false);
      setStandComplete(false);
      // Do NOT change activeShotIndex
      // Do NOT reset shots
      // Do NOT delete results
    } else {
      // START VOICE
      const firstEmpty = findFirstEmptyShot();
      if (firstEmpty !== -1) {
        setActiveShotIndex(firstEmpty);
        setStandComplete(false);
        setIsVoiceActive(true);
        startVoice();
      } else {
        setStandComplete(true);
      }
    }
  };

  const handleResetStand = () => {
    if (!confirm('Clear all shots and reset this stand?')) return;
    
    // Stop voice
    if (isListening || isVoiceActive) {
      stopVoice();
      setIsVoiceActive(false);
    }
    
    // Clear all results
    onChange(Array(totalShots).fill(null));
    onShotMeta(Array(totalShots).fill({ input_method: 'manual' }));
    
    // Reset index
    setActiveShotIndex(0);
    setStandComplete(false);
  };

  const handleUndoLast = () => {
    const arr = [...shots];
    // Find last non-null shot
    let lastIdx = -1;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== null) {
        lastIdx = i;
        break;
      }
    }
    
    if (lastIdx !== -1) {
      arr[lastIdx] = null;
      onChange(arr);
      const updatedMeta = [...(shotMeta || [])];
      updatedMeta[lastIdx] = { input_method: 'manual' };
      onShotMeta?.(updatedMeta);
      setActiveShotIndex(lastIdx);
      setStandComplete(false);
    }
  };

  const handleTapShot = (shotIndex) => {
    // User tapped a shot — set it as active
    setActiveShotIndex(shotIndex);
  };

  const handleManualResult = (shotIndex, result) => {
    // User tapped manual button
    setActiveShotIndex(shotIndex);
    recordShotResult(result, 'manual');
  };

  // ─── DEBUG PANEL ──────────────────────────────────────────────────
  const debugInfo = {
    activeShotIndex,
    activeShotIndexRef: activeShotIndexRef.current,
    voiceModeActive: isVoiceActive,
    listening: isListening,
    lastCommand,
    lastHeard,
    shots: shots.map((r, i) => `${i + 1}:${r || '—'}`).join(' '),
    validScored,
    hits,
    misses,
    noBirds,
  };

  // ─── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Live stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-emerald-600">{hits}</p>
          <p className="text-[10px] text-muted-foreground">Hits</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-red-500">{misses}</p>
          <p className="text-[10px] text-muted-foreground">Misses</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-amber-600">{noBirds}</p>
          <p className="text-[10px] text-muted-foreground">No Birds</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-primary">{hitPct}%</p>
          <p className="text-[10px] text-muted-foreground">Hit %</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Score: {hits}/{validScored} valid · {shots.filter(Boolean).length}/{totalShots} recorded</p>

      {/* Voice Scoring Controls */}
      <div className={`rounded-xl border px-4 py-3 transition-colors ${isListening ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-secondary/50 border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isListening ? (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            ) : (
              <Mic className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold">{isListening ? 'Voice Scoring Active' : 'Voice Scoring'}</p>
              {standComplete && !isListening ? (
                <p className="text-[10px] text-emerald-600 font-semibold">✓ Stand complete!</p>
              ) : isListening && lastHeard ? (
                <p className="text-[10px] text-muted-foreground">Heard: "<span className="font-semibold text-foreground">{lastHeard}</span>"</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">{isListening ? `Targeting: Shot ${activeShotIndex + 1}/${totalShots}` : 'Say: Hit · Miss · No Bird'}</p>
              )}
            </div>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={handleStartStopVoice}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isListening ? <><MicOff className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Start Voice</>}
          </motion.button>
        </div>
        {standComplete && !isListening && (
          <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ All shots recorded</p>
        )}
        {voiceFlash === 'nb' && (
          <p className="text-[10px] text-amber-600 font-bold mt-1">🎙 No Bird recorded</p>
        )}
        {voiceError && <p className="text-[10px] text-destructive mt-1">{voiceError}</p>}
      </div>

      {/* No Bird counter */}
      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">No Birds</p>
          <p className="text-[10px] text-muted-foreground">Clay not launched — no shot taken</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onNoBirdsChange(Math.max(0, noBirds - 1))}
            className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 font-bold text-lg flex items-center justify-center"
          >
            −
          </motion.button>
          <span className="text-lg font-black text-amber-700 dark:text-amber-300 w-6 text-center">{noBirds}</span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onNoBirdsChange(noBirds + 1)}
            className="w-8 h-8 rounded-lg bg-amber-400 text-white font-bold text-lg flex items-center justify-center"
          >
            +
          </motion.button>
        </div>
      </div>

      {/* Per-shot rows */}
      <div className="space-y-2">
        {Array.from({ length: totalShots }, (_, i) => {
          const result = shots[i] || null;
          const meta = shotMeta?.[i];
          const isVoice = meta?.input_method === 'voice';
          const isFlashing = voiceFlash === i;
          const isCurrent = isVoiceActive && activeShotIndex === i && !result;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 transition-all rounded-lg px-2 py-1 cursor-pointer ${
                isFlashing ? 'bg-primary/10 scale-[1.01]' : isCurrent ? 'bg-primary/5 ring-1 ring-primary' : 'hover:bg-secondary/50'
              }`}
              onClick={() => handleTapShot(i)}
            >
              <div className="flex flex-col items-center w-14 flex-shrink-0">
                <span className={`text-xs font-semibold ${isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  Shot {i + 1}
                </span>
                {isCurrent && !result && <span className="text-[9px] text-primary font-bold animate-pulse">← target</span>}
                {isVoice && result && <span className="text-[9px] text-primary font-bold">🎙</span>}
              </div>

              <div className="flex gap-1 flex-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualResult(i, 'hit');
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    result === 'hit'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow'
                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  ✓ Hit
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualResult(i, 'miss');
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    result === 'miss'
                      ? 'bg-red-500 text-white border-red-600 shadow'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                  }`}
                >
                  ✗ Miss
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Control buttons */}
      <div className="flex gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleUndoLast}
          className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-xs font-semibold hover:bg-secondary/80"
        >
          ↩ Undo Last
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleResetStand}
          className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-xs font-semibold hover:bg-secondary/80"
        >
          ✕ Reset All
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDebug(!showDebug)}
          className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600"
        >
          🔧
        </motion.button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Debug Panel</p>
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-slate-600 dark:text-slate-400 w-24">{key}:</span>
              <span className="text-slate-900 dark:text-slate-100">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}