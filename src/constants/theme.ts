/**
 * CALE design system — "Nori & Saffron"
 * Warm food tones without generic fitness-green or diet-red.
 */

export const colors = {
  /** Brand primary — from app icon (#317F36) */
  primary: '#317F36',
  primaryLight: '#3D9A44',
  primaryDark: '#27662C',
  nori: '#317F36',

  /** Accent — spice gold */
  saffron: '#D9A21B',
  warning: '#D9A21B',

  /** Surfaces */
  background: '#F3F2EF',
  steam: '#F3F2EF',
  surface: '#FFFFFF',
  porcelain: '#FFFFFF',

  /** Text */
  text: '#1C1B19',
  ink: '#1C1B19',
  textSecondary: '#8A8680',
  stone: '#8A8680',

  /** Lines */
  border: '#E5E3DE',
  line: '#E5E3DE',

  /** Semantic — over / destructive (chili oil, not alarm red) */
  error: '#C2512A',
  chili: '#C2512A',
  overMaintenance: '#C2512A',

  /** Semantic — on track */
  success: '#317F36',
  underMaintenance: '#317F36',

  /** Progress mute tints */
  chipBg: '#E8F3E9',
  noriMute: '#E8F3E9',
  saffronMute: '#F8F0D8',
  chiliMute: '#F8E8E0',
  chipSelected: '#317F36',

  /** Near-target progress (~90–100%) */
  nearTarget: '#D9A21B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
  full: 9999,
};

/** Linked font family names (see assets/fonts + react-native.config.js) */
export const fonts = {
  display: 'SourceSerif4-Regular',
  displayMedium: 'SourceSerif4-Semibold',
  displayBold: 'SourceSerif4-Bold',
  body: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodySemiBold: 'DMSans-SemiBold',
  bodyBold: 'DMSans-Bold',
};

export const typography = {
  hero: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 28,
  },
  heading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  overline: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
};

/** Progress state from consumed vs target */
export type ProgressTone = 'under' | 'near' | 'over';

export function getProgressTone(consumed: number, target: number): ProgressTone {
  if (target <= 0) {
    return 'under';
  }
  if (consumed > target) {
    return 'over';
  }
  if (consumed / target >= 0.9) {
    return 'near';
  }
  return 'under';
}

export function progressColor(tone: ProgressTone): string {
  switch (tone) {
    case 'over':
      return colors.chili;
    case 'near':
      return colors.saffron;
    default:
      return colors.nori;
  }
}

export function progressMute(tone: ProgressTone): string {
  switch (tone) {
    case 'over':
      return colors.chiliMute;
    case 'near':
      return colors.saffronMute;
    default:
      return colors.noriMute;
  }
}
