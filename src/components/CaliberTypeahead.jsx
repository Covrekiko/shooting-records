import { useState } from 'react';
import { normalizeCaliber, searchCalibers } from '@/utils/caliberCatalog';

export default function CaliberTypeahead({ value, onChange, className = '', placeholder = '.308 Win', required = false }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  const updateValue = (nextValue) => {
    onChange(nextValue);
    setResults(searchCalibers(nextValue));
    setOpen(Boolean(nextValue));
  };

  const selectValue = (caliber) => {
    onChange(normalizeCaliber(caliber));
    setResults([]);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 120);
    const normalized = normalizeCaliber(value);
    if (normalized !== value) onChange(normalized);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => updateValue(e.target.value)}
        onFocus={() => {
          const matches = searchCalibers(value || '');
          setResults(matches);
          setOpen(matches.length > 0);
        }}
        onBlur={handleBlur}
        className={className}
        placeholder={placeholder}
        required={required}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {results.map((caliber) => (
            <button
              key={caliber}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectValue(caliber)}
              className="w-full text-left px-3 py-2 hover:bg-secondary text-sm border-b border-border last:border-0"
            >
              {caliber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}