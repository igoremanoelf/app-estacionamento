import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function StatTile({ label, value, hint, color = colors.primary }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {!!hint && <Text style={styles.tileHint}>{hint}</Text>}
    </View>
  );
}

/** Gráfico de barras simples desenhado com Views (sem dependências externas). */
export function BarChart({
  data,
  height = 120,
  color = colors.primary,
  format = (v: number) => String(v),
  showEveryLabel = 1,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  showEveryLabel?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => (
          <View key={i} style={styles.barCol}>
            {d.value > 0 && data.length <= 12 && <Text style={styles.barValue}>{format(d.value)}</Text>}
            <View style={[styles.bar, { height: Math.max(2, (d.value / max) * (height - 18)), backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.barLabel} numberOfLines={1}>
            {i % showEveryLabel === 0 ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Barra de progresso horizontal (ex.: taxa de ocupação). */
export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileValue: { fontSize: 24, fontWeight: '800' },
  tileLabel: { color: colors.text, fontWeight: '600', marginTop: 2 },
  tileHint: { color: colors.textMuted, fontSize: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barValue: { fontSize: 9, color: colors.textMuted, marginBottom: 2 },
  labels: { flexDirection: 'row', gap: 3, marginTop: 4 },
  barLabel: { flex: 1, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  track: { height: 10, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
