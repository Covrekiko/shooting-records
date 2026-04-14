import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Mobile-friendly bottom sheet select replacement.
 * Props mirror a standard <select>:
 *   value, onChange(value), options: [{value, label}], placeholder, required, className
 */
export default function BottomSheetSelect({ value, onChange, options = [], placeholder = 'Select...', required, className = '' }) {
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between px-3 py-3 border border-border rounded-lg bg-background text-base text-left ${!selectedLabel ? 'text-muted-foreground' : ''} ${className}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground ml-2" />
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60000]"
            onClick={() => setOpen(false)}
            style={{ pointerEvents: 'auto' }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[60001] bg-card rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', maxHeight: '70vh' }}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1" />
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 40px)' }}>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-base border-b border-border last:border-b-0 transition-colors
                    ${opt.value === value ? 'text-primary font-semibold' : 'text-foreground hover:bg-secondary'}`}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}