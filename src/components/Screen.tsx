import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/** Contentor base dos ecrãs (fundo, margens e scroll opcional). */
export function Screen({ children, scroll = true, style, refreshing, onRefresh }: Props) {
  if (!scroll) return <View style={[styles.fill, styles.content, style]}>{children}</View>;
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});
