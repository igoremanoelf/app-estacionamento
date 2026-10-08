import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, gradients, spacing } from '../theme';

interface Props {
  overline?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  /** true quando o ecrã não tem cabeçalho de navegação (respeita a status bar) */
  safeTop?: boolean;
}

/** Cabeçalho em degradê azul-noite usado nos ecrãs principais; o conteúdo seguinte sobrepõe-se-lhe. */
export function HeroHeader({ overline, title, subtitle, right, children, safeTop = true }: Props) {
  const insets = useSafeAreaInsets();
  useLightStatusBar();
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: (safeTop ? insets.top : 0) + spacing.lg }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Circle cx="92%" cy="8%" r="120" fill="#3B5BFD" opacity={0.25} />
        <Circle cx="8%" cy="105%" r="90" fill="#2BD9AE" opacity={0.09} />
      </Svg>
      {(!!title || !!overline || !!right) && (
        <View style={styles.top}>
          <View style={{ flex: 1, gap: 2 }}>
            {!!overline && <Text style={styles.overline}>{overline}</Text>}
            {!!title && (
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            )}
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      {children}
    </LinearGradient>
  );
}

/** Status bar clara enquanto o ecrã com fundo escuro está em foco. */
export function useLightStatusBar() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
}

/** Pílula translúcida para usar dentro do HeroHeader. */
export function HeroPill({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'success' | 'danger' }) {
  const dot = tone === 'success' ? colors.spotFree : tone === 'danger' ? colors.spotOccupied : '#8EA2FF';
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: dot }]} />
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xxl + spacing.xl, gap: spacing.lg, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  overline: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, color: '#fff', letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, color: '#fff' },
});
