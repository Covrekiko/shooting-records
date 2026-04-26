// Unified design system constants for UI/UX consistency

export const DESIGN = {
  // Backgrounds
  PAGE_BG: 'bg-background',
  CARD_BG: 'bg-card',
  CARD: 'bg-card border border-border rounded-2xl shadow-sm',
  CARD_ACTIVE: 'bg-primary/5 border border-primary/20 rounded-2xl shadow-sm',

  // Borders & Colors
  BORDER: 'border-border',
  BORDER_LIGHT: 'border-border',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 border border-border rounded-xl bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors',
  LABEL: 'block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2',
  SELECT: 'w-full px-3.5 py-2.5 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors',
  TEXTAREA: 'w-full px-3.5 py-2.5 border border-border rounded-xl bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none',

  // Buttons
  BUTTON_PRIMARY: 'px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all duration-100 shadow-sm',
  BUTTON_SECONDARY: 'px-5 py-2.5 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 active:scale-[0.97] transition-all duration-100',
  BUTTON_DANGER: 'px-5 py-2.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-xl font-semibold text-sm hover:bg-destructive/20 transition-all duration-100',
  BUTTON_GHOST: 'px-4 py-2 text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors',
  BUTTON_SMALL: 'px-3 py-1.5 text-xs font-semibold rounded-lg',

  // Badges
  BADGE_ACTIVE: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 rounded-full text-xs font-semibold',
  BADGE_IDLE: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-muted-foreground rounded-full text-xs font-semibold',
  BADGE_WARNING: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/30 text-amber-400 border border-amber-800/50 rounded-full text-xs font-semibold',

  // Typography
  PAGE_HEADING: 'text-xl font-bold text-foreground tracking-tight',
  SECTION_HEADING: 'text-sm font-semibold text-muted-foreground uppercase tracking-widest',
  CARD_HEADING: 'text-base font-semibold text-foreground',

  // Layout
  CONTAINER: 'max-w-7xl mx-auto px-4 pt-4 md:pt-6 pb-8',
  MAIN_MAX_WIDTH: 'max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-4 mobile-page-padding',

  // Modal
  MODAL_WIDTH: 'sm:max-w-md',

  // Spacing
  GAP_SMALL: 'gap-2',
  GAP_MEDIUM: 'gap-3',
  GAP_LARGE: 'gap-4',

  // Section divider
  DIVIDER: 'border-t border-border',
};