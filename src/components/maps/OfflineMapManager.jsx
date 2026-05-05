import { useEffect, useState } from 'react';
import { Download, HardDrive, Trash2, Map, RefreshCw } from 'lucide-react';
import { getRepository } from '@/lib/offlineSupport';
import { OFFLINE_MAP_CONFIG, hasConfiguredOfflineMapPackage } from '@/lib/offlineMapConfig';
import { deleteOfflineMapPackage, downloadOfflineMapPackage, estimateOfflineMapPackage, getOfflineMapStorageSummary } from '@/lib/offlineMapStore';

export default function OfflineMapManager() {
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('uk_overview');
  const [sourceUrl, setSourceUrl] = useState(OFFLINE_MAP_CONFIG.packageUrl);
  const [packages, setPackages] = useState([]);
  const [storageLabel, setStorageLabel] = useState('0 B');
  const [estimate, setEstimate] = useState(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [areaList, summary] = await Promise.all([
      getRepository('Area').list(),
      getOfflineMapStorageSummary(),
    ]);
    setAreas(areaList || []);
    setPackages(summary.packages || []);
    setStorageLabel(summary.totalLabel);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedArea = areas.find((area) => area.id === selectedAreaId);

  const handleEstimate = async () => {
    if (!sourceUrl.trim()) return;
    setBusy(true);
    const result = await estimateOfflineMapPackage(sourceUrl.trim());
    setEstimate(result);
    setBusy(false);
  };

  const handleDownload = async () => {
    if (!sourceUrl.trim()) return;
    setBusy(true);
    setProgress(0);
    const type = selectedAreaId === 'uk_overview' ? 'uk_overview' : 'area';
    await downloadOfflineMapPackage({
      name: selectedAreaId === 'uk_overview' ? 'UK overview offline map' : selectedArea?.name,
      sourceUrl: sourceUrl.trim(),
      type,
      area: selectedArea,
      onProgress: setProgress,
    });
    setProgress(null);
    setEstimate(null);
    setBusy(false);
    await load();
  };

  const handleDelete = async (id) => {
    await deleteOfflineMapPackage(id);
    await load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Map className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Offline Maps</h3>
          <p className="text-sm text-muted-foreground mt-1">Download legal PMTiles map packages for offline stalking map use.</p>
          {!hasConfiguredOfflineMapPackage() && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 font-medium">
              Offline map package URL not configured. Add a legal PMTiles package URL to enable offline map download.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <label className="text-sm font-medium">Map area</label>
        <select
          value={selectedAreaId}
          onChange={(e) => setSelectedAreaId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
        >
          <option value="uk_overview">UK overview — low zoom only</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        <label className="text-sm font-medium">Legal PMTiles package URL</label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://your-tiles.example/area.pmtiles"
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
        />
        <p className="text-xs text-muted-foreground">Use your own licensed PMTiles/MapLibre vector package. The app does not cache Google Maps or bulk-download public OSM tiles.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleEstimate}
          disabled={busy || !sourceUrl.trim()}
          className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          <HardDrive className="w-4 h-4" /> Estimate size
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy || !sourceUrl.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download map
        </button>
      </div>

      {OFFLINE_MAP_CONFIG.sizeEstimate && !estimate && (
        <p className="text-sm text-muted-foreground">Configured estimate: <span className="font-semibold text-foreground">{OFFLINE_MAP_CONFIG.sizeEstimate}</span></p>
      )}
      {estimate && <p className="text-sm text-muted-foreground">Estimated download: <span className="font-semibold text-foreground">{estimate.label}</span></p>}
      {progress !== null && <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>}

      <div className="rounded-xl bg-secondary/50 p-3 text-sm text-muted-foreground space-y-1">
        <p>Configured region: <span className="font-semibold text-foreground">{OFFLINE_MAP_CONFIG.regionName}</span></p>
        <p>Zoom range: <span className="font-semibold text-foreground">{OFFLINE_MAP_CONFIG.minZoom}–{OFFLINE_MAP_CONFIG.maxZoom}</span></p>
        <p>Storage used by offline maps: <span className="font-semibold text-foreground">{storageLabel}</span></p>
      </div>

      <div className="space-y-2">
        {packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offline map packages downloaded yet.</p>
        ) : packages.map((pkg) => (
          <div key={pkg.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{pkg.name}</p>
              <p className="text-xs text-muted-foreground">{pkg.zoom?.label || pkg.type} • {pkg.sizeLabel || 'Unknown size'} • {pkg.status}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(pkg.id)}
              className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
              title="Delete offline map"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}