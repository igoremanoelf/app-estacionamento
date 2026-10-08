import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, gradients, radius, shadows, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}

const filled: Partial<Record<Variant, { colors: readonly [string, string]; glow: string }>> = {
  primary: { colors: gradients.brand, glow: colors.primary },
  danger: { colors: gradients.danger, glow: colors.danger },
  success: { colors: gradients.mint, glow: colors.success },
};

const flat: Record<'secondary' | 'ghost', { bg: string; fg: string }> = {
  secondary: { bg: colors.primaryLight, fg: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primary },
};

/** Botão da app: degradê com brilho nas ações principais, tonal nas secundárias. */
export function AppButton({ title, onPress, variant = 'primary', icon, loading, disabled, style, compact }: Props) {
  const inactive = disabled || loading;
  const grad = filled[variant];
  const fg = grad ? '#fff' : flat[variant as 'secondary' | 'ghost'].fg;

  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <>
      {icon && <Ionicons name={icon} size={compact ? 16 : 19} color={fg} />}
      <Text style={[styles.text, compact && styles.textCompact, { color: fg }]} numberOfLines={1}>
        {title}
      </Text>
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.outer,
        grad && !inactive && { ...shadows.glow, shadowColor: grad.glow },
        { opacity: inactive ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {grad ? (
        <LinearGradient colors={grad.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, compact && styles.compact]}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.base, compact && styles.compact, { backgroundColor: flat[variant as 'secondary' | 'ghost'].bg }]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radius.md },
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  compact: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm + 2 },
  text: { fontSize: 15.5, fontFamily: fonts.semibold, letterSpacing: -0.1 },
  textCompact: { fontSize: 13.5 },
});
