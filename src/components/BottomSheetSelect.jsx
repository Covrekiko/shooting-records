import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export default function BottomSheetSelect({ value, onChange, options = [], placeholder = 'Select...', required, className = '' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const buttonRef = useRef(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  const handleClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 20;
      const spaceAbove = rect.top - 20;
      const maxH = Math.max(spaceBelow, spaceAbove) - 40;
      
      setPosition({
        top: rect.bottom,
        left: Math.max(12, rect.left),
        width: Math.min(rect.width, window.innerWidth - 24),
        maxHeight: Math.min(260, maxH),
      });
    }
    setOpen(!open);
  };

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-3 py-3 border border-border rounded-lg bg-background text-base text-left select-none ${!selectedLabel ? 'text-muted-foreground' : ''} ${className}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60000]"
            onClick={() => setOpen(false)}
            style={{ pointerEvents: 'auto' }}
          />
          <div 
            className="fixed z-[60001] bg-card rounded-lg shadow-2xl border border-border overflow-hidden"
            style={{
              top: `${position.top + 4}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: `${position.maxHeight}px`,
              overflowY: 'auto',
              overflowX: 'hidden',
              pointerEvents: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-border last:border-b-0 transition-colors select-none
                  ${opt.value === value ? 'text-primary font-semibold bg-primary/10' : 'text-foreground hover:bg-secondary'}`}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}