/**
 * UI System Constants
 * Centralized sizing, spacing, z-index, and styling standards
 */

// Icon sizes
export const ICON_SIZES = {
  xs: 'w-3 h-3',           // 12px - micro indicators
  sm: 'w-4 h-4',           // 16px - labels, small controls
  md: 'w-5 h-5',           // 20px - normal UI icons (default)
  lg: 'w-6 h-6',           // 24px - section headers
  xl: 'w-8 h-8',           // 32px - dashboard icons (max for cards)
  xxl: 'w-12 h-12',        // 48px - empty states only
};

// Z-index layers (critical for modal/map/nav)
export const Z_INDEX = {
  base: 0,
  page: 1,
  map: 10,
  floating: 20,
  sticky: 25,
  bottomNav: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  alert: 70,
};

// Spacing scale (all in rem/Tailwind units)
export const SPACING = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
};

// Radius (consistent with Tailwind var(--radius))
export const RADIUS = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  2xl: 'rounded-2xl',
  full: 'rounded-full',
};

// Card styling
export const CARD = {
  base: 'bg-card rounded-2xl border border-border shadow-sm',
  hover: 'hover:shadow-md transition-shadow',
  interactive: 'active:scale-[0.97] transition-all duration-100',
};

// Button styling (all themes use theme tokens)
export const BUTTON = {
  primary: 'px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50',
  secondary: 'px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50',
  outline: 'px-4 py-2.5 border border-border rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50',
  danger: 'px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50',
  ghost: 'px-4 py-2.5 text-foreground rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50',
};

// Input styling (all themes use theme tokens)
export const INPUT = {
  base: 'w-full px-3 py-2 border border-border rounded-lg bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
  error: 'border-destructive focus:ring-destructive',
  disabled: 'bg-muted opacity-50 cursor-not-allowed',
};

// Modal system (use with inline styles for z-index)
export const MODAL = {
  overlay: 'fixed inset-0 bg-black/40',
  backdrop: 'fixed inset-0',
  container: 'fixed inset-0 flex items-center justify-center pointer-events-none',
};

// Bottom sheet system (use with inline styles for z-index)
export const SHEET = {
  overlay: 'fixed inset-0 bg-black/40',
  container: 'fixed bottom-0 left-0 right-0',
  handle: 'flex justify-center pt-3 pb-1',
};

export default {
  ICON_SIZES,
  Z_INDEX,
  SPACING,
  RADIUS,
  CARD,
  BUTTON,
  INPUT,
  MODAL,
  SHEET,
};