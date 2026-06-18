import React, { createContext, useContext } from 'react';
import useStore from '../store/useStore';
import { getColors, DARK_COLORS } from './theme';

type ColorPalette = typeof DARK_COLORS;

const ThemeContext = createContext<ColorPalette>(DARK_COLORS);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const colors = getColors(theme);
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

/** Use inside any component to get the current theme's color palette */
export function useColors(): ColorPalette {
  return useContext(ThemeContext);
}
