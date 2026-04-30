// Unified design system constants for UI/UX consistency

export const DESIGN = {
  // Backgrounds
  PAGE_BG: 'bg-slate-50 dark:bg-[#0f1117]',
  CARD_BG: 'bg-white dark:bg-slate-800/80',
  CARD: 'bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm',
  CARD_ACTIVE: 'bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-sm',

  // Borders & Colors
  BORDER: 'border-slate-200/60 dark:border-slate-700/60',
  BORDER_LIGHT: 'border-slate-100 dark:border-slate-700',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600/80 rounded-xl bg-white dark:bg-slate-700/60 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors',
  LABEL: 'block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2',
  SELECT: 'w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600/80 rounded-xl bg-white dark:bg-slate-700/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors',
  TEXTAREA: 'w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600/80 rounded-xl bg-white dark:bg-slate-700/60 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none',

  // Buttons
  BUTTON_PRIMARY: 'px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all duration-100 shadow-sm',
  BUTTON_SECONDARY: 'px-5 py-2.5 bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600/80 active:scale-[0.97] transition-all duration-100',
  BUTTON_DANGER: 'px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-100',
  BUTTON_GHOST: 'px-4 py-2 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors',
  BUTTON_SMALL: 'px-3 py-1.5 text-xs font-semibold rounded-lg',

  // Badges
  BADGE_ACTIVE: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-xs font-semibold',
  BADGE_IDLE: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 rounded-full text-xs font-semibold',
  BADGE_WARNING: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-full text-xs font-semibold',

  // Typography
  PAGE_HEADING: 'text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight',
  SECTION_HEADING: 'text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest',
  CARD_HEADING: 'text-base font-semibold text-slate-900 dark:text-slate-100',

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
  DIVIDER: 'border-t border-slate-100 dark:border-slate-700/60',
};