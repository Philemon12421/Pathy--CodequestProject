// ─── Pathy Green Palette (Stitch design system) ──────────────────────────
// Replaces the old navy/blue palette. Every key name below already existed
// in the original theme.ts EXCEPT primaryContainer / onSurface / secondary,
// which are new additions needed by SplashScreen.tsx and OnboardingScreen.tsx.
// No existing call site (HomeScreen, App.tsx, etc.) breaks — old keys are
// all still present, just repointed to green values.
export const LIGHT_COLORS = {
  background:       '#e7fff1',       // soft mint page bg (was #F5F6FA)
  surface:          '#FFFFFF',       // card / panel white — unchanged
  surfaceElevated:  '#f0fbf5',       // slightly dimmer surface (was #F0F2F8)
  surfaceGlass:     'rgba(255,255,255,0.82)', // unchanged

  primary:          '#006c44',       // deep forest green (was #1A1A2E navy) — main CTA text/icons
  primaryDark:      '#00482d',       // pressed state
  primaryContainer: '#4caf7d',       // sage green — buttons, active pills, FAB (NEW)
  onSurface:        '#0b1f17',       // near-black green-tinted text on white (NEW, replaces old `text`)
  secondary:        '#55615c',       // muted green-grey for secondary text (NEW, alias of textSecondary)

  accent:           '#006c44',       // was #4F7FFA blue — now matches primary
  accentSoft:       '#e1f9eb',       // light green tint backgrounds (was light blue)
  danger:           '#b3272a',
  dangerSoft:       '#ffdad6',
  warning:          '#F59E0B',
  warningSoft:      '#FFFBEB',
  info:             '#6366F1',
  infoSoft:         '#EEF2FF',
  success:          '#4caf7d',
  successSoft:      '#e1f9eb',

  text:             '#0b1f17',       // bold headings — green-tinted near-black (was #1A1A2E)
  textSecondary:    '#55615c',       // body / labels (was #52526E)
  textMuted:        '#869a8d',       // placeholders, helper text (was #A0A3B1)

  border:           '#d9ece1',       // card border (was #E8E9F0)
  borderLight:      '#eef8f1',       // subtle dividers
  cardBg:           '#FFFFFF',
  mapOverlay:       'rgba(231,255,241,0.88)',

  // Gradient endpoints for the AI orb — kept as-is, unrelated to brand green
  orbStart:         '#C77DFF',
  orbMid:           '#7B9FF9',
  orbEnd:           '#5EEAD4',

  tabBar:           '#FFFFFF',
  tabBarBorder:     '#d9ece1',
  tabActive:        '#006c44',       // was #1A1A2E
  tabInactive:      '#869a8d',       // was #A0A3B1
  tabAIBtn:         '#006c44',       // was #1A1A2E — raised center AI button
};

// ─── Dark Palette ─────────────────────────────────────────────────────────
// Kept structurally intact — only the accent/tab colors shift to green so
// the brand stays consistent when a user toggles dark mode.
export const DARK_COLORS = {
  background:       '#0A0E1A',
  surface:          '#111827',
  surfaceElevated:  '#1A2235',
  surfaceGlass:     'rgba(17,24,39,0.88)',

  primary:          '#4caf7d',       // sage green reads well on dark bg (was #3B82F6 blue)
  primaryDark:      '#3a8c63',
  primaryContainer: '#1a3a2a',       // dark green container (NEW)
  onSurface:        '#F9FAFB',       // (NEW)
  secondary:        '#9CA3AF',       // (NEW)

  accent:           '#4caf7d',       // was #10B981
  accentSoft:       '#0d2818',
  danger:           '#EF4444',
  dangerSoft:       '#450a0a',
  warning:          '#F59E0B',
  warningSoft:      '#451a03',
  info:             '#6366F1',
  infoSoft:         '#1e1b4b',
  success:          '#4caf7d',
  successSoft:      '#0d2818',

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
  tabActive:        '#4caf7d',       // was #3B82F6
  tabInactive:      '#6B7280',
  tabAIBtn:         '#4caf7d',       // was #3B82F6
};

// ─── Backward compat ─────────────────────────────────────────────────────────
export const COLORS = DARK_COLORS;

export function getColors(theme: 'dark' | 'light') {
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

// ─── Typography — UNCHANGED ──────────────────────────────────────────────
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

// ─── Spacing & Radius — UNCHANGED ────────────────────────────────────────
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

// ─── Shadows — UNCHANGED except `lg` glow now matches green, not blue ──────
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
    shadowColor: '#4caf7d',          // was #4F7FFA
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
