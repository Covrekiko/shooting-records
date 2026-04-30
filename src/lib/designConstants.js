// Unified design system constants for UI/UX consistency

export const DESIGN = {
  // Backgrounds
  PAGE_BG: 'bg-[var(--app-bg)]',
  CARD_BG: 'bg-[var(--panel-bg)]',
  CARD: 'bg-[var(--panel-bg)] border border-[var(--border-soft)] rounded-2xl shadow-[0_6px_20px_rgba(91,70,54,0.08)]',
  CARD_ACTIVE: 'bg-[var(--panel-bg)] border border-[var(--primary-hex)] rounded-2xl shadow-[0_6px_20px_rgba(91,70,54,0.10)]',

  // Borders & Colors
  BORDER: 'border-border',
  BORDER_LIGHT: 'border-border/70',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 border border-[var(--border-soft)] rounded-xl bg-[var(--panel-bg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-hex)]/25 focus:border-[var(--primary-hex)] transition-colors',
  LABEL: 'block text-xs font-semibold text-[var(--muted-warm)] uppercase tracking-widest mb-2',
  SELECT: 'w-full px-3.5 py-2.5 border border-[var(--border-soft)] rounded-xl bg-[var(--panel-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-hex)]/25 focus:border-[var(--primary-hex)] transition-colors',
  TEXTAREA: 'w-full px-3.5 py-2.5 border border-[var(--border-soft)] rounded-xl bg-[var(--panel-bg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-hex)]/25 focus:border-[var(--primary-hex)] transition-colors resize-none',

  // Buttons
  BUTTON_PRIMARY: 'px-5 py-2.5 bg-[var(--primary-hex)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--primary-hover)] active:scale-[0.97] transition-all duration-100 shadow-sm',
  BUTTON_SECONDARY: 'px-5 py-2.5 bg-[var(--soft-bg)] text-[var(--accent-brown)] border border-[var(--border-soft)] rounded-xl font-semibold text-sm hover:bg-[var(--icon-bg)] active:scale-[0.97] transition-all duration-100',
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