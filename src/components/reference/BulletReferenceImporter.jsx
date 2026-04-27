import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DUPLICATE_KEY = (row) => `${row.manufacturer}|${row.bullet_family}|${row.calibre}|${row.weight_grains}`;

export default function BulletReferenceImporter({ onClose, onImportComplete }) {
  const [step, setStep] = useState('upload'); // upload, preview, importing, complete
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      header.forEach((key, idx) => {
        row[key] = values[idx] || '';
      });
      if (row.manufacturer) data.push(row);
    }
    return data;
  };

  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const parsed = parseCSV(text);
    setRows(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    setLoading(true);
    try {
      // Get existing records to check for duplicates
      const existing = await base44.entities.BulletReference.list('-updated_date', 1000);
      const existingKeys = new Set(existing.map(r => DUPLICATE_KEY(r)));

      const toInsert = [];
      const duplicates = [];
      const errors = [];

      for (const row of rows) {
        if (!row.manufacturer || !row.calibre || !row.weight_grains) {
          errors.push({ row, reason: 'Missing required fields' });
          continue;
        }

        const key = DUPLICATE_KEY(row);
        if (existingKeys.has(key)) {
          duplicates.push(row);
          continue;
        }

        toInsert.push({
          manufacturer: row.manufacturer,
          bullet_family: row.bullet_family || '',
          calibre: row.calibre,
          diameter: row.diameter ? parseFloat(row.diameter) : null,
          weight_grains: parseFloat(row.weight_grains),
          bullet_type: row.bullet_type || '',
          use: row.use || '',
          source_type: row.source_type || 'component_bullet',
        });
      }

      // Batch insert
      if (toInsert.length > 0) {
        await base44.entities.BulletReference.bulkCreate(toInsert);
      }

      setImportStats({
        total: rows.length,
        imported: toInsert.length,
        duplicates: duplicates.length,
        errors: errors.length,
      });
      setStep('complete');
      if (onImportComplete) onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: ' + error.message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold">Import Bullet Reference Feed</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with bullet reference data. The file should have columns: manufacturer, bullet_family, calibre, diameter, weight_grains, bullet_type, use, source_type.
              </p>
              <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <span className="text-sm font-semibold">Click to select CSV file</span>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">
                {rows.length} rows found in file. Review before importing.
              </p>
              <div className="border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Manufacturer</th>
                      <th className="px-3 py-2 text-left">Family</th>
                      <th className="px-3 py-2 text-left">Calibre</th>
                      <th className="px-3 py-2 text-right">Weight</th>
                      <th className="px-3 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-3 py-2">{row.manufacturer}</td>
                        <td className="px-3 py-2">{row.bullet_family}</td>
                        <td className="px-3 py-2">{row.calibre}</td>
                        <td className="px-3 py-2 text-right">{row.weight_grains}gr</td>
                        <td className="px-3 py-2 text-xs">{row.source_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  ...and {rows.length - 50} more rows
                </p>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                <p className="text-sm font-semibold">Importing {rows.length} bullets...</p>
              </div>
            </div>
          )}

          {step === 'complete' && importStats && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">Import Complete!</p>
                    <div className="text-sm text-green-700 dark:text-green-200 mt-2 space-y-1">
                      <p>✓ {importStats.imported} records imported</p>
                      <p>↷ {importStats.duplicates} duplicates skipped</p>
                      {importStats.errors > 0 && <p>⚠ {importStats.errors} rows had errors</p>}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can now use the bullet reference in dropdowns across Ammunition Inventory, Reloading, and other features. Import more feeds anytime.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setRows([]);
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-secondary transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                Import {rows.length} Bullets
              </button>
            </>
          )}
          {step === 'complete' && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}