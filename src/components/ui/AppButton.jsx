import { forwardRef } from 'react';

/**
 * Standard button component with consistent styling
 * Supports multiple variants and sizes
 */
const AppButton = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      disabled = false,
      isLoading = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'font-semibold rounded-lg transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30';

    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const variantClasses = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline: 'border border-border bg-background hover:bg-secondary/30',
      ghost: 'hover:bg-secondary/50',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  }
);

AppButton.displayName = 'AppButton';
export default AppButton;