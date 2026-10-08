import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, gradients, radius, shadows, spacing } from '../theme';
import { LogoMark } from './Logo';

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <LogoMark size={56} />
      <ActivityIndicator color={colors.primary} />
      {!!label && <Text style={styles.muted}>{label}</Text>}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: { icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyHalo}>
        <View style={styles.emptyIcon}>
          <Ionicons name={icon} size={30} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={[styles.muted, { textAlign: 'center', lineHeight: 19 }]}>{subtitle}</Text>}
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.value, strong && styles.valueStrong]}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: size / 2.6 }}>{initials || '?'}</Text>
    </LinearGradient>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, value === o.value && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Banner({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' | 'danger' | 'success' }) {
  const map = {
    info: [colors.primaryLight, colors.primaryDark, 'information-circle'],
    warning: [colors.warningLight, colors.warningDark, 'warning'],
    danger: [colors.dangerLight, colors.danger, 'alert-circle'],
    success: [colors.successLight, colors.success, 'checkmark-circle'],
  } as const;
  const [bg, fg, icon] = map[tone];
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderLeftColor: fg }]}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={[styles.bannerText, { color: fg }]}>{text}</Text>
    </View>
  );
}

/** Ícone num quadrado arredondado colorido (listas, tiles). */
export function IconChip({ name, color = colors.primary, background = colors.primaryLight, size = 40 }: { name: keyof typeof Ionicons.glyphMap; color?: string; background?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  icon,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.item, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
      {icon && <IconChip name={icon} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.background },
  muted: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.regular },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyHalo: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  emptyTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  section: { fontSize: 12, fontFamily: fonts.bold, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1.1 },
  sectionAction: { fontSize: 13, fontFamily: fonts.semibold, color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, minHeight: 24 },
  rowLabel: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular, flexShrink: 1 },
  value: { color: colors.text, fontSize: 14, fontFamily: fonts.semibold, flexShrink: 1, textAlign: 'right' },
  valueStrong: { fontFamily: fonts.extrabold, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm + 2 },
  segmentActive: { backgroundColor: colors.surface, ...shadows.sm },
  segmentText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 13 },
  segmentTextActive: { color: colors.primary },
  banner: { flexDirection: 'row', gap: spacing.sm + 2, padding: spacing.md + 2, borderRadius: radius.md, alignItems: 'center', borderLeftWidth: 4 },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(228,232,241,0.7)',
    ...shadows.sm,
  },
  itemTitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
});
