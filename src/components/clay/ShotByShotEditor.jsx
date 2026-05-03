import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceScoring } from '@/hooks/useVoiceScoring';

const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';

/**
 * SINGLE SOURCE OF TRUTH for shot-by-shot scoring
 * 
 * shots = [null, 'dead', 'lost', null, 'no_bird', ...]
 * 
 * Result values: 'dead' | 'lost' | 'no_bird' | null
 * 
 * Two modes:
 * 1. Normal recording: recordShotResult(result) fills first empty shot
 * 2. Edit mode: editShotResult(shotIndex, result) updates specific shot
 */

export default function ShotByShotEditor({ totalShots, shots, shotMeta, noBirds, onChange, onNoBirdsChange, onShotMeta }) {
  // ─── STATE ──────────────────────────────────────────────────────
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const activeShotIndexRef = useRef(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [standComplete, setStandComplete] = useState(false);
  const [voiceFlash, setVoiceFlash] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

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
   * RECORD: Fill next empty shot (normal scoring mode)
   * Used by manual buttons and voice commands
   * 
   * @param {string} result - 'dead' | 'lost' | 'no_bird'
   * @param {string} inputMethod - 'manual' | 'voice'
   * @param {object} metadata - Optional {voice_timestamp, voice_confidence_score}
   */
  const recordShotResult = useCallback((result, inputMethod = 'manual', metadata = {}) => {
    // If in edit mode, use edit function instead
    if (editingIndex !== null) {
      editShotResult(editingIndex, result);
      return;
    }

    const currentIdx = activeShotIndexRef.current;
    
    // Verify current shot is actually empty
    if (shots[currentIdx] !== null && shots[currentIdx] !== undefined) {
      // Current shot already filled, find next empty
      const nextEmpty = findNextEmptyShot(currentIdx);
      if (nextEmpty === -1) {
        setStandComplete(true);
        return;
      }
      // Record to next empty shot
      const updated = [...shots];
      updated[nextEmpty] = result;
      onChange(updated);

      const updatedMeta = [...(shotMeta || [])];
      updatedMeta[nextEmpty] = { input_method: inputMethod, ...metadata };
      onShotMeta?.(updatedMeta);

      setActiveShotIndex(nextEmpty);
      setStandComplete(false);
    } else {
      // Current shot is empty, fill it
      const updated = [...shots];
      updated[currentIdx] = result;
      onChange(updated);

      const updatedMeta = [...(shotMeta || [])];
      updatedMeta[currentIdx] = { input_method: inputMethod, ...metadata };
      onShotMeta?.(updatedMeta);

      // Find next empty
      const nextEmpty = findNextEmptyShot(currentIdx);
      if (nextEmpty !== -1) {
        setActiveShotIndex(nextEmpty);
        setStandComplete(false);
      } else {
        setStandComplete(true);
      }
    }
  }, [shots, shotMeta, onChange, onShotMeta, findNextEmptyShot, editingIndex]);

  /**
   * EDIT: Update specific shot (edit mode)
   */
  const editShotResult = useCallback((shotIndex, result) => {
    const updated = [...shots];
    updated[shotIndex] = result;
    onChange(updated);

    const updatedMeta = [...(shotMeta || [])];
    updatedMeta[shotIndex] = { input_method: 'manual' };
    onShotMeta?.(updatedMeta);

    setEditingIndex(null);
  }, [shots, shotMeta, onChange, onShotMeta]);

  // ─── VOICE HOOK ───────────────────────────────────────────────────
  const { isListening, lastHeard, error: voiceError, start: startVoice, stop: stopVoice } = useVoiceScoring({
    onResult: ({ result, input_method, voice_timestamp, voice_confidence_score }) => {
      // Debug logging (development)
      if (typeof window !== 'undefined' && window.__VOICE_DEBUG__) {
        console.log('🎙 Voice result:', {
          heard: lastHeard,
          parsed: result,
          confidence: voice_confidence_score,
          targetShot: activeShotIndexRef.current + 1,
          timestamp: voice_timestamp,
        });
      }

      if (result === 'no_bird') {
        // No bird: increment counter, don't take a shot slot
        onNoBirdsChange(noBirds + 1);
        setVoiceFlash('nb');
        setLastCommand('no_bird');
        setTimeout(() => setVoiceFlash(null), 800);
        return;
      }

      // Dead or Lost: record to next empty shot with full voice metadata
      recordShotResult(result, 'voice', { voice_timestamp, voice_confidence_score });
      setVoiceFlash(activeShotIndexRef.current);
      setLastCommand(result);
      setTimeout(() => setVoiceFlash(null), 800);
    },
  });

  // ─── CALCULATIONS ─────────────────────────────────────────────────
  const dead = shots.filter(r => r === 'dead').length;
  const lost = shots.filter(r => r === 'lost').length;
  const validScored = dead + lost;
  const score = validScored > 0 ? Math.round((dead / validScored) * 100) : 0;

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

  const handleTapShot = (shotIndex) => {
    // User tapped a shot — if it has a result, enter edit mode; otherwise set as active
    if (shots[shotIndex] !== null && shots[shotIndex] !== undefined) {
      setEditingIndex(shotIndex);
    } else {
      setActiveShotIndex(shotIndex);
    }
  };

  const handleManualResult = (shotIndex, result) => {
    // User tapped manual button
    if (editingIndex !== null) {
      // In edit mode: update that specific shot
      editShotResult(shotIndex, result);
    } else if (shots[shotIndex] === null || shots[shotIndex] === undefined) {
      // Shot is empty: record to it
      setActiveShotIndex(shotIndex);
      recordShotResult(result, 'manual');
    } else {
      // Shot already has a result: enter edit mode for it
      setEditingIndex(shotIndex);
      editShotResult(shotIndex, result);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Live stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-emerald-600">{dead}</p>
          <p className="text-[10px] text-muted-foreground">Dead</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-red-500">{lost}</p>
          <p className="text-[10px] text-muted-foreground">Lost</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-amber-600">{noBirds}</p>
          <p className="text-[10px] text-muted-foreground">No Bird</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-primary">{score}%</p>
          <p className="text-[10px] text-muted-foreground">Score</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Score: {dead}/{validScored} · {shots.filter(Boolean).length}/{totalShots} recorded</p>

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
              <p className="text-xs font-bold">{isListening ? 'Voice Active' : 'Voice Scoring'}</p>
              {standComplete && !isListening ? (
                <p className="text-[10px] text-emerald-600 font-semibold">✓ Stand complete!</p>
              ) : isListening && lastHeard ? (
                <p className="text-[10px] text-muted-foreground">Heard: "<span className="font-semibold text-foreground">{lastHeard}</span>"</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">{isListening ? `Targeting: Shot ${activeShotIndex + 1}/${totalShots}` : 'Say: Dead · Lost · No Bird'}</p>
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
          <p className="text-[10px] text-amber-600 font-bold mt-1">🎙 No Bird</p>
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
          const isCurrent = activeShotIndex === i && !result;
          const isEditing = editingIndex === i;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 transition-all rounded-lg px-2 py-1 cursor-pointer ${
                isFlashing ? 'bg-primary/10 scale-[1.01]' : isEditing ? 'bg-primary/10 ring-2 ring-primary' : isCurrent ? 'bg-primary/5 ring-1 ring-primary' : 'hover:bg-secondary/50'
              }`}
              onClick={() => handleTapShot(i)}
            >
              <div className="flex flex-col items-center w-14 flex-shrink-0">
                <span className={`text-xs font-semibold ${isCurrent || isEditing ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  Shot {i + 1}
                </span>
                {isCurrent && !result && <span className="text-[9px] text-primary font-bold animate-pulse">ready</span>}
                {isVoice && result && <span className="text-[9px] text-primary font-bold">🎙</span>}
                {isEditing && <span className="text-[9px] text-primary font-bold">edit</span>}
              </div>

              <div className="flex gap-1 flex-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualResult(i, 'dead');
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    result === 'dead'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow'
                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  ✓ Dead
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualResult(i, 'lost');
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    result === 'lost'
                      ? 'bg-red-500 text-white border-red-600 shadow'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                  }`}
                >
                  ✗ Lost
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary actions are rendered once below by StandFormWrapper. */}
    </div>
  );
}