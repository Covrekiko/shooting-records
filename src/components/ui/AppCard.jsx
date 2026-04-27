/**
 * Standard card component with consistent styling
 */
export default function AppCard({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-card border border-border rounded-lg p-4 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card header with title and optional action
 */
export function AppCardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-4 pb-3 border-b border-border ${className}`}>
      <div className="flex-1">
        {title && <h3 className="font-semibold text-foreground">{title}</h3>}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Card content wrapper
 */
export function AppCardContent({ children, className = '' }) {
  return <div className={`space-y-3 ${className}`}>{children}</div>;
}

/**
 * Card footer with actions
 */
export function AppCardFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 pt-3 border-t border-border mt-4 ${className}`}>
      {children}
    </div>
  );
}