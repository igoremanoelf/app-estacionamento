import { Platform, type ViewStyle } from 'react-native';

/**
 * Sistema de design do ParkSmart.
 * Paleta: índigo elétrico (marca), azul-noite (superfícies escuras) e menta (disponível).
 */
export const colors = {
  primary: '#3B5BFD',
  primaryDark: '#2335C9',
  primaryLight: '#EEF1FF',
  primarySoft: '#DCE3FF',
  accent: '#12C29B',
  ink: '#0B1533',
  inkSoft: '#1C2A5C',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3FA',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  border: '#E4E8F1',
  danger: '#EF4452',
  dangerLight: '#FDECEE',
  warning: '#F59F0B',
  warningDark: '#B45309',
  warningLight: '#FEF4E2',
  success: '#0FA97F',
  successLight: '#E3F7F0',
  spotFree: '#12C29B',
  spotOccupied: '#EF4452',
  spotReserved: '#F5A524',
  spotDisabled: '#5B6478',
  spotSelected: '#3B5BFD',
  asphalt: '#1A2238',
  asphaltLine: 'rgba(255,255,255,0.18)',
};

/** Degradês usados com expo-linear-gradient. */
export const gradients = {
  brand: ['#5B7CFF', '#2335C9'] as const,
  hero: ['#0B1533', '#22337A'] as const,
  mint: ['#2BD9AE', '#0FA97F'] as const,
  sunset: ['#FFB547', '#F5762B'] as const,
  danger: ['#FF6B76', '#E02D3C'] as const,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 };

/** Famílias da Inter carregadas no App.tsx (uma por peso, necessário no Android). */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

export const font = { small: 12, body: 15, title: 17, h1: 28, h2: 22 };

/** Escala tipográfica pronta a usar em estilos de texto. */
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: -0.8, color: colors.text },
  h1: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  h2: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3, color: colors.text },
  title: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.2, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  caption: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  overline: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: colors.textSubtle },
};

const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: { shadowColor: '#1B2559', shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
    default: { elevation, shadowColor: '#1B2559' },
  });

export const shadows = {
  sm: shadow(2, 6, 0.06, 1),
  md: shadow(8, 18, 0.08, 3),
  lg: shadow(14, 28, 0.14, 8),
  glow: shadow(10, 20, 0.35, 6),
};
