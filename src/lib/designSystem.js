/**
 * Unified Design System Tokens
 * Single source of truth for spacing, sizing, z-index, and layout
 * Used across the entire app for consistency
 */

export const SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.25rem',  // 20px
  xl: '1.5rem',   // 24px
  '2xl': '2rem',  // 32px
};

export const SIZING = {
  icon_sm: '16px',
  icon_md: '18px',
  icon_lg: '20px',
  icon_xl: '24px',
  icon_feature: '28px',
  icon_hero: '32px',
  
  button_sm: '36px',
  button_md: '44px',
  button_lg: '48px',
  
  input_height: '44px',
  input_padding_x: '12px',
  input_padding_y: '10px',
};

export const RADIUS = {
  sm: '0.375rem',    // 6px
  md: '0.75rem',     // 12px (default)
  lg: '1.25rem',     // 20px
};

export const Z_INDEX = {
  base: 0,
  page: 1,
  map: 10,
  floating: 20,
  sticky: 25,
  bottom_nav: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  alert: 70,
};

export const MODAL_SIZES = {
  mobile: {
    small_confirm: 'max-w-[90vw] max-h-[50vh]',
    normal_form: 'max-h-[85vh]',
    long_form: 'h-screen',
    map_action: 'max-h-[70vh]',
  },
  desktop: {
    small_confirm: 'w-[420px]',
    normal_form: 'w-[560px]',
    complex: 'w-[720px]',
  },
};

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
};

export const BUTTON_VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-background hover:bg-secondary/30',
  ghost: 'hover:bg-secondary/50',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

export const CARD_STYLES = {
  container: 'bg-card border border-border rounded-lg',
  padding: 'p-4',
  shadow: 'shadow-sm',
};

export const SAFE_AREA = {
  top: 'safe-area-top',
  bottom: 'safe-area-bottom',
  mobile_padding: 'mobile-page-padding',
};

// Utility to build consistent button classes
export const buttonClass = (variant = 'primary', size = 'md') => {
  const baseClasses = 'font-semibold rounded-lg transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeClasses = {
    sm: `h-${SIZING.button_sm} px-3 text-sm`,
    md: `h-${SIZING.button_md} px-4 text-sm`,
    lg: `h-${SIZING.button_lg} px-6 text-base`,
  };
  
  return `${baseClasses} ${BUTTON_VARIANTS[variant]} ${sizeClasses[size]}`;
};

// Utility to build consistent input classes
export const inputClass = 'w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors';

// Utility to build consistent label classes
export const labelClass = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

// Safe area padding for modals
export const modalPadding = 'safe-area-bottom';