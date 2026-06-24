import React, { createContext, useContext, ReactNode } from 'react';
import { getColors } from './theme';
import useStore from '../store/useStore';

// ─── Theme Context ─────────────────────────────────────────────────────────
// This bridges Zustand's `theme` state (already in useStore.ts: 'dark' |
// 'light', toggled via toggleTheme()) into a React Context, so any screen
// can call useColors() and instantly get the right color object — without
// needing to import useStore + getColors() separately every time.

type ColorScheme = ReturnType<typeof getColors>;

const ThemeContext = createContext<ColorScheme | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useStore((s) => s.theme); // 'dark' | 'light'
  const colors = getColors(theme);

  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── useColors hook ─────────────────────────────────────────────────────────
// Returns the active color palette. Falls back to light colors if called
// outside a ThemeProvider (shouldn't happen, but avoids a hard crash).
export function useColors(): ColorScheme {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  // Fallback — keeps the app from crashing if useColors() is ever called
  // before ThemeProvider mounts (e.g. during fast refresh edge cases).
  return getColors('light');
}
