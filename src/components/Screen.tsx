import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** conteúdo de largura total antes do corpo (ex.: HeroHeader) */
  header?: ReactNode;
}

/** Contentor base dos ecrãs (fundo, margens e scroll opcional). */
export function Screen({ children, scroll = true, style, refreshing, onRefresh, header }: Props) {
  if (!scroll)
    return (
      <View style={styles.fill}>
        {header}
        <View style={[styles.fill, styles.content, style]}>{children}</View>
      </View>
    );
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={header ? undefined : [styles.content, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
    >
      {header ? (
        <>
          {header}
          <View style={[styles.content, styles.overlap, style]}>{children}</View>
        </>
      ) : (
        children
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl + spacing.lg },
  overlap: { marginTop: -spacing.xxl },
});
