import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_KEYS, applyThemeToCSSVariables, ThemeStorage } from '@/lib/themeSystem';

const ThemeContext = createContext();

/**
 * Theme Provider Component
 * 
 * Manages the selected theme and applies it globally via CSS variables.
 * Persists theme selection to localStorage.
 * Respects system dark/light mode preference.
 */
export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(THEME_KEYS.CURRENT);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    // Restore saved theme from localStorage
    const savedTheme = ThemeStorage.getSelectedTheme();
    setCurrentTheme(savedTheme);

    // Detect dark mode preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const prefersDark = darkModeQuery.matches;
    setIsDark(prefersDark);

    // Apply theme
    applyThemeToCSSVariables(savedTheme, prefersDark);
    setIsLoading(false);

    // Listen for dark mode changes
    const handleDarkModeChange = (e) => {
      setIsDark(e.matches);
      applyThemeToCSSVariables(savedTheme, e.matches);
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);
    return () => darkModeQuery.removeEventListener('change', handleDarkModeChange);
  }, []);

  // Change theme and persist
  const changeTheme = (themeKey) => {
    if (!Object.values(THEME_KEYS).includes(themeKey)) {
      console.warn('Invalid theme key:', themeKey);
      return;
    }

    setCurrentTheme(themeKey);
    ThemeStorage.setSelectedTheme(themeKey);
    applyThemeToCSSVariables(themeKey, isDark);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isDark,
        isLoading,
        changeTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}