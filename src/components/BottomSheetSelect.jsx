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
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
      const spaceBelow = viewportHeight + viewportOffsetTop - rect.bottom - 16;
      const spaceAbove = rect.top - viewportOffsetTop - 16;
      const openUp = spaceAbove > spaceBelow;
      const maxH = Math.max(160, Math.min(280, (openUp ? spaceAbove : spaceBelow) - 8));
      
      setPosition({
        top: openUp ? Math.max(viewportOffsetTop + 12, rect.top - maxH - 4) : rect.bottom + 4,
        left: Math.max(12, rect.left),
        width: Math.min(rect.width, window.innerWidth - 24),
        maxHeight: maxH,
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
        className={`w-full min-w-0 flex items-center justify-between px-3 py-3 border border-border rounded-lg bg-background text-base text-left select-none ${!selectedLabel ? 'text-muted-foreground' : ''} ${className}`}
      >
        <span className="truncate min-w-0 flex-1">{selectedLabel || placeholder}</span>
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
                <span className="min-w-0 flex-1 text-left leading-snug break-words">{opt.label}</span>
                {opt.value === value && <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}