// Unified design system constants for UI/UX consistency

export const DESIGN = {
  // Backgrounds
  PAGE_BG: 'bg-background',
  CARD_BG: 'bg-card',
  CARD: 'bg-card border border-border rounded-2xl shadow-[0_6px_20px_rgba(180,83,9,0.08)]',
  CARD_ACTIVE: 'bg-card border border-primary/40 rounded-2xl shadow-[0_6px_20px_rgba(180,83,9,0.10)]',

  // Borders & Colors
  BORDER: 'border-border',
  BORDER_LIGHT: 'border-border/70',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 border border-border rounded-xl bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors',
  LABEL: 'block text-xs font-semibold text-accent uppercase tracking-widest mb-2',
  SELECT: 'w-full px-3.5 py-2.5 border border-border rounded-xl bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors',
  TEXTAREA: 'w-full px-3.5 py-2.5 border border-border rounded-xl bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors resize-none',

  // Buttons
  BUTTON_PRIMARY: 'px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-[#B45309] active:scale-[0.97] transition-all duration-100 shadow-sm',
  BUTTON_SECONDARY: 'px-5 py-2.5 bg-secondary text-accent border border-border rounded-xl font-semibold text-sm hover:bg-secondary/80 active:scale-[0.97] transition-all duration-100',
  BUTTON_DANGER: 'px-5 py-2.5 bg-destructive/10 text-destructive border border-destructive/25 rounded-xl font-semibold text-sm hover:bg-destructive/15 transition-all duration-100',
  BUTTON_GHOST: 'px-4 py-2 text-accent rounded-xl text-sm font-medium hover:bg-secondary transition-colors',
  BUTTON_SMALL: 'px-3 py-1.5 text-xs font-semibold rounded-lg',

  // Badges
  BADGE_ACTIVE: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-primary border border-border rounded-full text-xs font-semibold',
  BADGE_IDLE: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-accent border border-border rounded-full text-xs font-semibold',
  BADGE_WARNING: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-primary border border-border rounded-full text-xs font-semibold',

  // Typography
  PAGE_HEADING: 'text-xl font-bold text-foreground tracking-tight',
  SECTION_HEADING: 'text-sm font-semibold text-accent uppercase tracking-widest',
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