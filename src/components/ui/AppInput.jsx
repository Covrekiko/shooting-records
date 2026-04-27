import { forwardRef } from 'react';

/**
 * Standard input component with consistent styling
 */
const AppInput = forwardRef(
  ({ label, error, helpText, required = false, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    };

    const baseClasses =
      'w-full border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors';

    const errorClass = error ? 'border-destructive/50 focus:ring-destructive/30' : '';

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseClasses} ${sizeClasses[size]} ${errorClass}`}
          {...props}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
      </div>
    );
  }
);

AppInput.displayName = 'AppInput';
export default AppInput;