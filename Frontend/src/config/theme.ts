// ─── Premium Light Palette (reference design) ─────────────────────────────
export const LIGHT_COLORS = {
  background:       '#F5F6FA',       // soft off-white page bg
  surface:          '#FFFFFF',       // card / panel white
  surfaceElevated:  '#F0F2F8',       // slightly dimmer surface
  surfaceGlass:     'rgba(255,255,255,0.82)', // glassmorphism overlay

  primary:          '#1A1A2E',       // near-black (main CTA, bold text)
  primaryDark:      '#0D0D1A',
  accent:           '#4F7FFA',       // vibrant blue (active states, highlights)
  accentSoft:       '#EEF3FF',       // very light blue tint backgrounds
  danger:           '#EF4444',
  dangerSoft:       '#FEF2F2',
  warning:          '#F59E0B',
  warningSoft:      '#FFFBEB',
  info:             '#6366F1',
  infoSoft:         '#EEF2FF',
  success:          '#10B981',
  successSoft:      '#ECFDF5',

  text:             '#1A1A2E',       // bold headings
  textSecondary:    '#52526E',       // body / labels
  textMuted:        '#A0A3B1',       // placeholders, helper text

  border:           '#E8E9F0',       // card border
  borderLight:      '#F2F3F8',       // very subtle dividers
  cardBg:           '#FFFFFF',
  mapOverlay:       'rgba(245,246,250,0.88)',

  // Gradient endpoints for the AI orb
  orbStart:         '#C77DFF',
  orbMid:           '#7B9FF9',
  orbEnd:           '#5EEAD4',

  tabBar:           '#FFFFFF',
  tabBarBorder:     '#E8E9F0',
  tabActive:        '#1A1A2E',
  tabInactive:      '#A0A3B1',
  tabAIBtn:         '#1A1A2E',       // center AI tab — dark pill
};

// ─── Dark Palette (kept intact) ──────────────────────────────────────────────
export const DARK_COLORS = {
  background:       '#0A0E1A',
  surface:          '#111827',
  surfaceElevated:  '#1A2235',
  surfaceGlass:     'rgba(17,24,39,0.88)',

  primary:          '#3B82F6',
  primaryDark:      '#2563EB',
  accent:           '#10B981',
  accentSoft:       '#052e16',
  danger:           '#EF4444',
  dangerSoft:       '#450a0a',
  warning:          '#F59E0B',
  warningSoft:      '#451a03',
  info:             '#6366F1',
  infoSoft:         '#1e1b4b',
  success:          '#10B981',
  successSoft:      '#052e16',

  text:             '#F9FAFB',
  textSecondary:    '#9CA3AF',
  textMuted:        '#6B7280',

  border:           '#1F2937',
  borderLight:      '#374151',
  cardBg:           '#131C2E',
  mapOverlay:       'rgba(10,14,26,0.85)',

  orbStart:         '#C77DFF',
  orbMid:           '#7B9FF9',
  orbEnd:           '#5EEAD4',

  tabBar:           '#111827',
  tabBarBorder:     '#1F2937',
  tabActive:        '#3B82F6',
  tabInactive:      '#6B7280',
  tabAIBtn:         '#3B82F6',
};

// ─── Backward compat ─────────────────────────────────────────────────────────
export const COLORS = DARK_COLORS;

export function getColors(theme: 'dark' | 'light') {
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONTS = {
  family: {
    regular: 'System',
    mono:    'monospace',
  },
  sizes: {
    xs:   11,
    sm:   13,
    md:   15,
    lg:   17,
    xl:   20,
    xxl:  26,
    xxxl: 34,
    hero: 42,
  },
  weights: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
    black:     '900',
  } as const,
};

// ─── Spacing & Radius ─────────────────────────────────────────────────────────
export const RADIUS = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   20,
  xl:   28,
  xxl:  36,
  full: 999,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOW = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#4F7FFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 14,
  },
};
