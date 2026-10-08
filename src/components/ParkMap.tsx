import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Spot } from '../types';
import { colors, fonts, radius, shadows, spacing } from '../theme';
import type { SpotVisualState } from '../utils/availability';

interface Props {
  spots: Spot[];
  states: Record<string, SpotVisualState>;
  selectedId?: string | null;
  onSpotPress?: (spot: Spot) => void;
  /** se true, apenas lugares "livre" podem ser tocados (escolha de lugar pelo utente) */
  onlyFreeSelectable?: boolean;
  /** informação extra por lugar (ex.: "sai 14:30") */
  captions?: Record<string, string>;
}

const STATE_COLOR: Record<SpotVisualState, string> = {
  livre: colors.spotFree,
  ocupado: colors.spotOccupied,
  reservado: colors.spotReserved,
  desativado: colors.spotDisabled,
};

const STATE_LABEL: Record<SpotVisualState, string> = {
  livre: 'Livre',
  ocupado: 'Ocupado',
  reservado: 'Reservado',
  desativado: 'Desativado',
};

const STATE_ICON: Record<SpotVisualState, keyof typeof Ionicons.glyphMap> = {
  livre: 'checkmark',
  ocupado: 'car-sport',
  reservado: 'time',
  desativado: 'close',
};

const SpotCell = memo(function SpotCell({
  spot,
  state,
  selected,
  disabled,
  caption,
  onPress,
  width,
}: {
  spot: Spot;
  state: SpotVisualState;
  selected: boolean;
  disabled: boolean;
  caption?: string;
  onPress?: (s: Spot) => void;
  width: `${number}%`;
}) {
  const tone = selected ? colors.spotSelected : STATE_COLOR[state];
  return (
    <Pressable
      accessibilityLabel={`Lugar ${spot.code}, ${STATE_LABEL[state]}`}
      disabled={disabled || !onPress}
      onPress={() => onPress?.(spot)}
      style={({ pressed }) => [styles.bay, { width }, disabled && onPress && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <View style={[styles.spot, { backgroundColor: tone + (selected ? '' : '26'), borderColor: tone }, selected && styles.selected]}>
        <Ionicons name={selected ? 'navigate' : STATE_ICON[state]} size={state === 'ocupado' && !selected ? 22 : 16} color={selected ? '#fff' : tone} />
        <Text style={styles.code}>{spot.code}</Text>
        {!!caption && <Text style={styles.caption} numberOfLines={1}>{caption}</Text>}
      </View>
    </Pressable>
  );
});

/**
 * RFC4 / RFG4: visualização virtual do parque. Os lugares são agrupados por zona
 * e desenhados como uma fila de estacionamento com uma faixa de circulação.
 */
export function ParkMap({ spots, states, selectedId, onSpotPress, onlyFreeSelectable, captions }: Props) {
  const zones = useMemo(() => {
    const map = new Map<string, Spot[]>();
    for (const s of spots) map.set(s.zone, [...(map.get(s.zone) ?? []), s]);
    return [...map.entries()];
  }, [spots]);

  const counts = useMemo(() => {
    const c: Record<SpotVisualState, number> = { livre: 0, ocupado: 0, reservado: 0, desativado: 0 };
    for (const s of spots) c[states[s.id] ?? 'livre']++;
    return c;
  }, [spots, states]);

  const total = spots.length || 1;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.summary}>
        {(Object.keys(STATE_LABEL) as SpotVisualState[]).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={styles.legendHead}>
              <View style={[styles.dot, { backgroundColor: STATE_COLOR[k] }]} />
              <Text style={styles.legendText}>{STATE_LABEL[k]}</Text>
            </View>
            <Text style={styles.legendCount}>{counts[k]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.stack}>
        {(Object.keys(STATE_LABEL) as SpotVisualState[]).map((k) =>
          counts[k] ? <View key={k} style={{ flex: counts[k] / total, backgroundColor: STATE_COLOR[k] }} /> : null,
        )}
      </View>
      {zones.map(([zone, list]) => {
        const half = Math.ceil(list.length / 2);
        const rows = [list.slice(0, half), list.slice(half)];
        return (
          <View key={zone} style={styles.zone}>
            <View style={styles.zoneHead}>
              <View style={styles.zoneBadge}>
                <Text style={styles.zoneBadgeText}>{zone}</Text>
              </View>
              <Text style={styles.zoneTitle}>Zona {zone}</Text>
              <Text style={styles.zoneCount}>
                {list.filter((s) => (states[s.id] ?? 'livre') === 'livre').length} livres
              </Text>
            </View>
            {rows.map((row, i) => (
              <View key={i}>
                <View style={[styles.row, i === 1 && styles.rowBottom]}>
                  {row.map((s) => {
                    const state = states[s.id] ?? 'livre';
                    return (
                      <SpotCell
                        width={`${100 / Math.min(Math.max(row.length, 5), 6)}%`}
                        key={s.id}
                        spot={s}
                        state={state}
                        selected={selectedId === s.id}
                        disabled={!!onlyFreeSelectable && state !== 'livre'}
                        caption={captions?.[s.id]}
                        onPress={onSpotPress}
                      />
                    );
                  })}
                </View>
                {i === 0 && rows[1].length > 0 && (
                  <View style={styles.lane}>
                    <View style={styles.laneDash} />
                    <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.45)" />
                    <View style={styles.laneDash} />
                  </View>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  legendItem: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm + 2, gap: 2, ...shadows.sm },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted, fontFamily: fonts.semibold },
  legendCount: { fontSize: 20, color: colors.text, fontFamily: fonts.extrabold, letterSpacing: -0.5 },
  stack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceAlt, gap: 2 },
  zone: { backgroundColor: colors.asphalt, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadows.md },
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  zoneBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  zoneBadgeText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 13 },
  zoneTitle: { flex: 1, color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  zoneCount: { color: colors.spotFree, fontFamily: fonts.semibold, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 2, borderColor: colors.asphaltLine },
  rowBottom: { borderTopWidth: 0, borderBottomWidth: 2 },
  bay: { height: 82, padding: 4, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.asphaltLine },
  spot: { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  selected: { ...shadows.glow, shadowColor: colors.primary },
  code: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
  caption: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontFamily: fonts.medium },
  lane: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 30, paddingHorizontal: spacing.sm },
  laneDash: { flex: 1, borderTopWidth: 2, borderColor: 'rgba(255,214,10,0.55)', borderStyle: 'dashed' },
});
