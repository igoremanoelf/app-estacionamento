import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../theme';

interface Props {
  children: ReactNode;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Cartão elevado com cabeçalho opcional (ícone + título + ação à direita). */
export function Card({ children, title, icon, right, onPress, style }: Props) {
  const content = (
    <>
      {(title || right) && (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {icon && (
              <View style={styles.iconChip}>
                <Ionicons name={icon} size={16} color={colors.primary} />
              </View>
            )}
            {!!title && <Text style={styles.title}>{title}</Text>}
          </View>
          {right}
        </View>
      )}
      {children}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(228,232,241,0.7)',
    ...shadows.md,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.95 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  iconChip: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.2 },
});
