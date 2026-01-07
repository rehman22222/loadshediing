// constants/theme.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

const LightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#0F172A',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  primary: '#2563EB',
};

const DarkColors = {
  background: '#020617',
  card: '#0F172A',
  text: '#F9FAFB',
  mutedText: '#94A3B8',
  border: '#1E293B',
  primary: '#3B82F6',
};

export const ThemeContext = createContext({
  theme: 'light',
  colors: LightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemTheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(systemTheme === 'dark' ? 'dark' : 'light');

  // Auto-update when system theme changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) setTheme(colorScheme);
    });
    return () => listener.remove();
  }, []);

  const colors = theme === 'dark' ? DarkColors : LightColors;

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(() => ({ theme, colors, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeColor(colorName, overrideColor) {
  const { colors } = useTheme();
  return overrideColor || colors[colorName];
}