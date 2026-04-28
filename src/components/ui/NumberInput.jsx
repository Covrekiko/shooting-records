/**
 * NumberInput — manages state as a raw string during typing,
 * only parsing on blur. Prevents auto-overwriting, leading-zero bugs,
 * and decimal entry issues.
 */

export default function NumberInput({
  label,
  value,
  onChange,
  placeholder = '0',
  allowDecimal = false,
  unit,
  min,
  max,
  disabled = false,
  className = '',
}) {
  const lbl = 'block text-xs font-bold text-muted-foreground uppercase mb-1.5';
  const inp = `w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  const handleChange = (e) => {
    let raw = e.target.value;
    if (!allowDecimal) {
      raw = raw.replace(/[^0-9]/g, '');
    } else {
      raw = raw.replace(/[^0-9.]/g, '');
      // allow only one decimal point
      const parts = raw.split('.');
      if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    }
    onChange(raw);
  };

  const handleBlur = () => {
    if (value === '' || value === '.') {
      onChange('');
      return;
    }
    const num = allowDecimal ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(num)) {
      onChange('');
      return;
    }
    if (min !== undefined && num < min) { onChange(String(min)); return; }
    if (max !== undefined && num > max) { onChange(String(max)); return; }
    onChange(String(num));
  };

  return (
    <div>
      {label && <label className={lbl}>{label}{unit ? <span className="ml-1 font-normal normal-case">({unit})</span> : ''}</label>}
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={inp}
      />
    </div>
  );
}