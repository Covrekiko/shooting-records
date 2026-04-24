import { useState, useRef, useCallback } from 'react';

// Maps spoken words to shot results
function parseVoiceResult(transcript) {
  const t = transcript.toLowerCase().trim();
  const words = t.split(/\s+/);

  // Check for "no bird" / "no hit" as two-word phrases first
  if (t.includes('no bird') || t.includes('no birds') || t === 'bird') {
    return { result: 'no_bird', confidence: 1 };
  }
  if (t.includes('no hit') || t.includes('no-hit')) {
    return { result: 'miss', confidence: 1 };
  }

  // Single word commands
  for (const word of words) {
    if (['hit', 'dead'].includes(word)) return { result: 'hit', confidence: 1 };
    if (['miss', 'missed', 'lost'].includes(word)) return { result: 'miss', confidence: 1 };
    if (['bird'].includes(word)) return { result: 'no_bird', confidence: 0.9 };
  }

  return null;
}

export function useVoiceScoring({ onResult, onStatusChange }) {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);

  const start = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onStatusChange?.('listening');
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        setLastHeard(transcript);

        const parsed = parseVoiceResult(transcript);
        if (parsed) {
          onResult({
            result: parsed.result,
            input_method: 'voice',
            voice_timestamp: new Date().toISOString(),
            voice_confidence_score: confidence || parsed.confidence,
          });
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // not a real error
      if (event.error === 'aborted') return;
      setError(`Mic error: ${event.error}`);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (activeRef.current) {
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
        onStatusChange?.('stopped');
      }
    };

    activeRef.current = true;
    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult, onStatusChange]);

  const stop = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setLastHeard('');
    onStatusChange?.('stopped');
  }, [onStatusChange]);

  return { isListening, lastHeard, error, start, stop };
}