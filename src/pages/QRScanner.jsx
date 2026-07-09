import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Camera, Keyboard, QrCode, StopCircle } from 'lucide-react';

export default function QRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [message, setMessage] = useState('Scan a Shooting Records QR label to open item details.');

  const openScanValue = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;

    try {
      const url = new URL(trimmed);
      if (url.pathname === '/qr-item') {
        stopScanner();
        navigate(`${url.pathname}${url.search}`);
        return;
      }
    } catch {
      // Manual values can still be JSON from future QR formats.
    }

    try {
      const payload = JSON.parse(trimmed);
      if (payload.type && payload.id) {
        stopScanner();
        navigate(`/qr-item?type=${encodeURIComponent(payload.type)}&id=${encodeURIComponent(payload.id)}`);
        return;
      }
    } catch {
      // Not JSON.
    }

    setMessage('That QR code is not recognised by this app.');
  };

  const stopScanner = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startScanner = async () => {
    if (!('BarcodeDetector' in window)) {
      setMessage('Camera QR scanning is not supported on this browser. You can paste the QR link below.');
      return;
    }

    const detector = new (/** @type {any} */ (window).BarcodeDetector)({ formats: ['qr_code'] });
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    setScanning(true);
    setMessage('Point your camera at a QR label.');

    const detect = async () => {
      if (!videoRef.current || !streamRef.current) return;
      const codes = await detector.detect(videoRef.current);
      if (codes.length > 0) {
        openScanValue(codes[0].rawValue);
        return;
      }
      frameRef.current = requestAnimationFrame(detect);
    };

    frameRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => () => stopScanner(), []);

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8 mobile-page-padding">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">QR Scanner</h1>
              <p className="text-sm text-muted-foreground">Open firearms and ammunition instantly</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center mb-4">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {!scanning && <Camera className="absolute w-12 h-12 text-white/60" />}
          </div>

          <p className="text-sm text-muted-foreground mb-4">{message}</p>

          <div className="flex gap-3 mb-6">
            {!scanning ? (
              <button type="button" onClick={startScanner} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> Start Scan
              </button>
            ) : (
              <button type="button" onClick={stopScanner} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-2">
                <StopCircle className="w-4 h-4" /> Stop
              </button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2">
              <Keyboard className="w-3 h-3" /> Manual QR link
            </label>
            <div className="flex gap-2">
              <input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm"
                placeholder="Paste QR link here"
              />
              <button type="button" onClick={() => openScanValue(manualValue)} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm">
                Open
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}