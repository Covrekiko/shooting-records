import React, { useState, useEffect } from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEME_KEYS, THEME_DISPLAY_NAMES, THEME_DESCRIPTIONS } from '@/lib/themeSystem';

/**
 * Theme Selector Component
 * 
 * Displays 4 selectable theme cards with colour previews.
 * Shows selected state with checkmark.
 * Updates theme instantly on selection.
 */
export default function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme();
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('shooting-records-dark-mode');
    return saved === null ? true : saved === 'true';
  });

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('shooting-records-dark-mode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const handleThemeSelect = (themeKey) => {
    changeTheme(themeKey);
    setLastUpdated(themeKey);
    
    // Show toast briefly
    setTimeout(() => setLastUpdated(null), 2000);
  };

  const themes = [
    {
      key: THEME_KEYS.CURRENT,
      name: THEME_DISPLAY_NAMES[THEME_KEYS.CURRENT],
      description: THEME_DESCRIPTIONS[THEME_KEYS.CURRENT],
      colors: ['#F7F4EC', '#1D1D1B', '#28663B']  // Light bg, dark text, orange primary
    },
    {
      key: THEME_KEYS.FIELD_GREEN,
      name: THEME_DISPLAY_NAMES[THEME_KEYS.FIELD_GREEN],
      description: THEME_DESCRIPTIONS[THEME_KEYS.FIELD_GREEN],
      colors: ['#F7F4EC', '#12382B', '#B88746']  // Cream, forest green, bronze
    },
    {
      key: THEME_KEYS.GRAPHITE_TACTICAL,
      name: THEME_DISPLAY_NAMES[THEME_KEYS.GRAPHITE_TACTICAL],
      description: THEME_DESCRIPTIONS[THEME_KEYS.GRAPHITE_TACTICAL],
      colors: ['#F4F5F4', '#111827', '#D99A2B']  // Light grey, charcoal, amber
    },
    {
      key: THEME_KEYS.IVORY_GUNMETAL,
      name: THEME_DISPLAY_NAMES[THEME_KEYS.IVORY_GUNMETAL],
      description: THEME_DESCRIPTIONS[THEME_KEYS.IVORY_GUNMETAL],
      colors: ['#F8F5EF', '#20242A', '#C47A3A']  // Ivory, gunmetal, copper
    }
  ];

  return (
    <div className="space-y-4">
      {/* Dark / Light Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-yellow-400" />}
          <div>
            <p className="text-sm font-semibold">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
            <p className="text-xs text-muted-foreground">{isDark ? 'Premium dark design' : 'Clean light design'}</p>
          </div>
        </div>
        <button
          onClick={toggleDarkMode}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isDark ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Select App Theme</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Choose a visual style. Your selection is saved automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme) => {
          const isSelected = currentTheme === theme.key;
          const justUpdated = lastUpdated === theme.key;

          return (
            <button
              key={theme.key}
              onClick={() => handleThemeSelect(theme.key)}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              {/* Theme name */}
              <h4 className="font-semibold mb-1 pr-8">{theme.name}</h4>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-3">{theme.description}</p>

              {/* Colour preview dots */}
              <div className="flex items-center gap-2">
                {theme.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Updated toast */}
              {justUpdated && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/90 rounded-2xl">
                  <span className="text-primary-foreground text-sm font-medium">Theme updated</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        All app screens will instantly reflect your chosen theme.
      </p>
    </div>
  );
}