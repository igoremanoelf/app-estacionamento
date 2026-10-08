import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, fonts, radius, shadows, spacing } from '../theme';

export function StatTile({
  label,
  value,
  hint,
  color = colors.primary,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel}>{label}</Text>
        {icon && (
          <View style={[styles.tileIcon, { backgroundColor: color + '1F' }]}>
            <Ionicons name={icon} size={15} color={color} />
          </View>
        )}
      </View>
      <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
      {!!hint && (
        <View style={styles.tileHintRow}>
          <View style={[styles.tileDot, { backgroundColor: color }]} />
          <Text style={styles.tileHint}>{hint}</Text>
        </View>
      )}
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
  const peak = data.findIndex((d) => d.value === max && max > 0);
  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => (
          <View key={i} style={styles.barCol}>
            {d.value > 0 && data.length <= 12 && <Text style={styles.barValue}>{format(d.value)}</Text>}
            <View style={[styles.barTrack, { height: height - 18 }]}>
              <View style={[styles.bar, { height: Math.max(3, (d.value / max) * (height - 18)), backgroundColor: color, opacity: i === peak ? 1 : 0.55 }]} />
            </View>
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

/** Anel de progresso (ocupação em %), com o valor ao centro. */
export function ProgressRing({
  value,
  size = 112,
  stroke = 12,
  colors: [from, to] = ['#5B7CFF', '#2335C9'],
  track = colors.surfaceAlt,
  label,
  textColor = colors.text,
}: {
  value: number;
  size?: number;
  stroke?: number;
  colors?: readonly [string, string];
  track?: string;
  label?: string;
  textColor?: string;
}) {
  const v = Math.min(1, Math.max(0, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v)}
        />
      </Svg>
      <Text style={[styles.ringValue, { color: textColor, fontSize: size * 0.22 }]}>{Math.round(v * 100)}%</Text>
      {!!label && <Text style={[styles.ringLabel, { color: textColor }]}>{label}</Text>}
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
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(228,232,241,0.7)',
    ...shadows.md,
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 28, fontFamily: fonts.extrabold, letterSpacing: -0.8 },
  tileLabel: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 13 },
  tileHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileDot: { width: 6, height: 6, borderRadius: 3 },
  tileHint: { color: colors.textSubtle, fontSize: 12, fontFamily: fonts.medium },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '78%', justifyContent: 'flex-end', backgroundColor: colors.surfaceAlt, borderRadius: 6, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 6 },
  barValue: { fontSize: 9, color: colors.textMuted, marginBottom: 3, fontFamily: fonts.semibold },
  labels: { flexDirection: 'row', gap: 4, marginTop: 6 },
  barLabel: { flex: 1, fontSize: 9, color: colors.textSubtle, textAlign: 'center', fontFamily: fonts.medium },
  track: { height: 10, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  ringValue: { fontFamily: fonts.extrabold, letterSpacing: -0.6 },
  ringLabel: { fontFamily: fonts.medium, fontSize: 11, opacity: 0.7, marginTop: -2 },
});
