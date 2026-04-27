/**
 * Central Theme System for Shooting Records App
 * 
 * This file defines all 4 themes with consistent design tokens.
 * Each theme controls:
 * - Colours (primary, accent, backgrounds, text, borders)
 * - Component styling (buttons, cards, forms, modals)
 * - Surfaces (cards, inputs, overlays)
 * 
 * No colours should be hardcoded in components.
 * All colours come from these theme definitions.
 */

export const THEME_KEYS = {
  CURRENT: 'current',
  FIELD_GREEN: 'field-green',
  GRAPHITE_TACTICAL: 'graphite-tactical',
  IVORY_GUNMETAL: 'ivory-gunmetal-copper'
};

export const THEME_DISPLAY_NAMES = {
  [THEME_KEYS.CURRENT]: 'Current Design',
  [THEME_KEYS.FIELD_GREEN]: 'Field Green',
  [THEME_KEYS.GRAPHITE_TACTICAL]: 'Graphite Tactical',
  [THEME_KEYS.IVORY_GUNMETAL]: 'Ivory Gunmetal Copper'
};

export const THEME_DESCRIPTIONS = {
  [THEME_KEYS.CURRENT]: 'Original Shooting Records design',
  [THEME_KEYS.FIELD_GREEN]: 'Premium countryside style for stalking and outdoor records',
  [THEME_KEYS.GRAPHITE_TACTICAL]: 'Modern tactical style for range, armory, and ballistic tools',
  [THEME_KEYS.IVORY_GUNMETAL]: 'Luxury Apple-style theme with ivory, gunmetal, and copper accents'
};

/**
 * Theme Tokens Definition
 * 
 * Each theme is a complete colour palette in HSL format.
 * HSL allows for consistent colour manipulation and dark mode support.
 */

const THEMES = {
  [THEME_KEYS.CURRENT]: {
    // Current Design - Original colours preserved
    background: '0 0% 98%',
    foreground: '215 20% 12%',
    card: '0 0% 100%',
    cardForeground: '215 20% 12%',
    primary: '28 85% 42%',       // Orange
    primaryForeground: '0 0% 100%',
    secondary: '220 14% 93%',     // Light grey
    secondaryForeground: '215 20% 20%',
    accent: '220 14% 93%',        // Neutral slate (not used for accent, secondary)
    accentForeground: '215 20% 20%',
    muted: '220 10% 90%',
    mutedForeground: '220 8% 48%',
    border: '220 13% 91%',
    input: '220 13% 94%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 98%',
    success: '152 60% 40%',
    warning: '38 92% 50%',
    ring: '28 85% 42%',
    // Dark mode for current design
    dark: {
      background: '222 20% 9%',
      foreground: '210 18% 92%',
      card: '222 18% 13%',
      cardForeground: '210 18% 92%',
      primary: '28 80% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '220 16% 24%',
      secondaryForeground: '210 20% 94%',
      accent: '220 16% 24%',
      accentForeground: '210 20% 94%',
      muted: '220 16% 22%',
      mutedForeground: '220 8% 58%',
      border: '220 14% 20%',
      input: '220 14% 18%',
      destructive: '0 62.8% 40%',
      destructiveForeground: '0 0% 98%',
      success: '152 55% 48%',
      warning: '38 88% 60%',
      ring: '28 80% 48%'
    }
  },

  [THEME_KEYS.FIELD_GREEN]: {
    // Field Green - Premium UK countryside feel
    background: '40 25% 96%',     // Warm cream #F7F4EC
    foreground: '30 17% 11%',     // Dark charcoal #1D1D1B
    card: '0 0% 100%',            // White
    cardForeground: '30 17% 11%',
    primary: '162 53% 17%',       // Deep forest green #12382B
    primaryForeground: '0 0% 100%',
    secondary: '40 15% 93%',      // Warm beige #EFE9DD
    secondaryForeground: '30 17% 11%',
    accent: '32 44% 44%',         // Bronze/gold #B88746
    accentForeground: '0 0% 100%',
    muted: '30 20% 75%',          // Warm grey/brown
    mutedForeground: '25 15% 37%',
    border: '35 30% 82%',         // Soft beige #DDD4C3
    input: '40 25% 96%',
    destructive: '8 74% 50%',     // Deep red #B42318
    destructiveForeground: '0 0% 100%',
    success: '145 63% 42%',       // Green #2F855A
    warning: '38 92% 50%',
    ring: '32 44% 44%',
    // Dark mode for field green
    dark: {
      background: '30 25% 15%',
      foreground: '40 25% 92%',
      card: '30 20% 22%',
      cardForeground: '40 25% 92%',
      primary: '162 53% 25%',     // Lighter green for dark mode
      primaryForeground: '0 0% 100%',
      secondary: '30 25% 25%',
      secondaryForeground: '40 25% 92%',
      accent: '32 44% 54%',       // Lighter bronze
      accentForeground: '0 0% 100%',
      muted: '30 10% 50%',
      mutedForeground: '30 10% 70%',
      border: '30 15% 30%',
      input: '30 20% 20%',
      destructive: '8 74% 60%',
      destructiveForeground: '0 0% 100%',
      success: '145 63% 52%',
      warning: '38 88% 60%',
      ring: '32 44% 54%'
    }
  },

  [THEME_KEYS.GRAPHITE_TACTICAL]: {
    // Graphite Tactical - Modern tactical/range style
    background: '210 13% 97%',    // Soft light grey #F4F5F4
    foreground: '217 33% 17%',    // Charcoal #111827
    card: '0 0% 100%',            // White
    cardForeground: '217 33% 17%',
    primary: '217 33% 17%',       // Charcoal/gunmetal #111827
    primaryForeground: '0 0% 100%',
    secondary: '210 13% 97%',
    secondaryForeground: '217 33% 17%',
    accent: '39 75% 55%',         // Amber #D99A2B
    accentForeground: '0 0% 100%',
    muted: '218 14% 45%',         // Neutral grey
    mutedForeground: '217 13% 42%',
    border: '220 13% 91%',        // Light grey #E5E7EB
    input: '220 13% 97%',
    destructive: '0 84% 60%',     // Red #DC2626
    destructiveForeground: '0 0% 100%',
    success: '145 63% 42%',       // Green #2F855A
    warning: '39 75% 55%',
    ring: '39 75% 55%',
    // Dark mode for graphite tactical
    dark: {
      background: '217 33% 20%',
      foreground: '210 13% 96%',
      card: '217 33% 30%',
      cardForeground: '210 13% 96%',
      primary: '217 33% 25%',     // Lighter for dark mode
      primaryForeground: '0 0% 100%',
      secondary: '217 33% 25%',
      secondaryForeground: '210 13% 96%',
      accent: '39 75% 65%',       // Lighter amber
      accentForeground: '0 0% 100%',
      muted: '218 14% 55%',
      mutedForeground: '218 14% 75%',
      border: '217 33% 28%',
      input: '217 33% 25%',
      destructive: '0 84% 70%',
      destructiveForeground: '0 0% 100%',
      success: '145 63% 52%',
      warning: '39 75% 65%',
      ring: '39 75% 65%'
    }
  },

  [THEME_KEYS.IVORY_GUNMETAL]: {
    // Ivory Gunmetal Copper - Luxury Apple-style
    background: '30 20% 97%',     // Ivory #F8F5EF
    foreground: '210 13% 12%',    // Near black #1F2328
    card: '0 0% 100%',            // White
    cardForeground: '210 13% 12%',
    primary: '213 17% 15%',       // Gunmetal #20242A
    primaryForeground: '0 0% 100%',
    secondary: '213 15% 29%',     // Slate #3A414A
    secondaryForeground: '0 0% 100%',
    accent: '22 52% 45%',         // Copper #C47A3A
    accentForeground: '0 0% 100%',
    muted: '25 10% 70%',          // Warm grey
    mutedForeground: '25 12% 41%',
    border: '30 15% 87%',         // Warm light grey #DED8CE
    input: '30 20% 97%',
    destructive: '0 74% 55%',     // Red #B91C1C
    destructiveForeground: '0 0% 100%',
    success: '145 63% 42%',       // Green #2F855A
    warning: '22 52% 45%',
    ring: '22 52% 45%',
    // Dark mode for ivory gunmetal
    dark: {
      background: '213 17% 20%',
      foreground: '30 20% 95%',
      card: '213 17% 28%',
      cardForeground: '30 20% 95%',
      primary: '213 17% 25%',     // Lighter gunmetal
      primaryForeground: '0 0% 100%',
      secondary: '213 15% 38%',
      secondaryForeground: '0 0% 100%',
      accent: '22 52% 55%',       // Lighter copper
      accentForeground: '0 0% 100%',
      muted: '213 10% 50%',
      mutedForeground: '213 10% 70%',
      border: '213 15% 32%',
      input: '213 17% 25%',
      destructive: '0 74% 65%',
      destructiveForeground: '0 0% 100%',
      success: '145 63% 52%',
      warning: '22 52% 55%',
      ring: '22 52% 55%'
    }
  }
};

/**
 * Get theme tokens for the current theme
 * 
 * @param {string} themeKey - Theme key (current, field-green, etc)
 * @param {boolean} isDark - Whether dark mode is active
 * @returns {object} All theme colour tokens
 */
export function getThemeTokens(themeKey = THEME_KEYS.CURRENT, isDark = false) {
  const theme = THEMES[themeKey];
  if (!theme) return THEMES[THEME_KEYS.CURRENT];
  
  if (isDark && theme.dark) {
    return { ...theme, ...theme.dark };
  }
  
  // Light mode — remove dark key from return
  const { dark, ...lightTokens } = theme;
  return lightTokens;
}

/**
 * Convert theme tokens to CSS variables
 * Applied to :root in index.css
 * 
 * @param {string} themeKey - Theme key
 * @param {boolean} isDark - Dark mode active
 */
export function applyThemeToCSSVariables(themeKey = THEME_KEYS.CURRENT, isDark = false) {
  const tokens = getThemeTokens(themeKey, isDark);
  
  // Get root element (for light mode) or html.dark (for dark mode)
  const selector = isDark ? document.documentElement.classList.contains('dark') ? ':root.dark' : ':root' : ':root';
  
  // Apply CSS variables
  Object.entries(tokens).forEach(([key, value]) => {
    // Convert camelCase to kebab-case
    const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    document.documentElement.style.setProperty(cssVar, value);
  });
}

/**
 * Get all available themes as an array for UI selection
 */
export function getAllThemes() {
  return Object.entries(THEME_KEYS).map(([key, themeKey]) => ({
    key: themeKey,
    name: THEME_DISPLAY_NAMES[themeKey],
    description: THEME_DESCRIPTIONS[themeKey]
  }));
}

/**
 * Theme storage helpers
 */
export const ThemeStorage = {
  // Get user's selected theme (defaults to 'current')
  getSelectedTheme() {
    try {
      const stored = localStorage.getItem('shooting-records-theme');
      return stored || THEME_KEYS.CURRENT;
    } catch {
      return THEME_KEYS.CURRENT;
    }
  },

  // Save user's selected theme
  setSelectedTheme(themeKey) {
    try {
      localStorage.setItem('shooting-records-theme', themeKey);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  },

  // Clear saved theme (back to default)
  clearSelectedTheme() {
    try {
      localStorage.removeItem('shooting-records-theme');
    } catch {
      // Ignore
    }
  }
};