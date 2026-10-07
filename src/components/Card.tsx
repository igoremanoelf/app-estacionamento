import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, title, right, onPress, style }: Props) {
  const content = (
    <>
      {(title || right) && (
        <View style={styles.header}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {right}
        </View>
      )}
      {children}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
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
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
});
