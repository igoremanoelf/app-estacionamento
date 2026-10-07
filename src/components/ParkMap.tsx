import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Spot } from '../types';
import { colors, radius, spacing } from '../theme';
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

const SpotCell = memo(function SpotCell({
  spot,
  state,
  selected,
  disabled,
  caption,
  onPress,
}: {
  spot: Spot;
  state: SpotVisualState;
  selected: boolean;
  disabled: boolean;
  caption?: string;
  onPress?: (s: Spot) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Lugar ${spot.code}, ${STATE_LABEL[state]}`}
      disabled={disabled || !onPress}
      onPress={() => onPress?.(spot)}
      style={[
        styles.spot,
        { backgroundColor: STATE_COLOR[state] },
        selected && styles.selected,
        disabled && onPress && { opacity: 0.45 },
      ]}
    >
      <Text style={styles.code}>{spot.code}</Text>
      {!!caption && <Text style={styles.caption} numberOfLines={1}>{caption}</Text>}
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

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.legend}>
        {(Object.keys(STATE_LABEL) as SpotVisualState[]).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: STATE_COLOR[k] }]} />
            <Text style={styles.legendText}>
              {STATE_LABEL[k]} ({counts[k]})
            </Text>
          </View>
        ))}
      </View>
      {zones.map(([zone, list]) => {
        const half = Math.ceil(list.length / 2);
        const rows = [list.slice(0, half), list.slice(half)];
        return (
          <View key={zone} style={styles.zone}>
            <Text style={styles.zoneTitle}>Zona {zone}</Text>
            {rows.map((row, i) => (
              <View key={i}>
                <View style={styles.row}>
                  {row.map((s) => {
                    const state = states[s.id] ?? 'livre';
                    return (
                      <SpotCell
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
                    <Text style={styles.laneText}>→ circulação →</Text>
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.textMuted },
  zone: { backgroundColor: '#2F3640', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  zoneTitle: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  spot: {
    width: 58,
    height: 72,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 2,
  },
  selected: { borderColor: '#fff', transform: [{ scale: 1.07 }], backgroundColor: colors.spotSelected },
  code: { color: '#fff', fontWeight: '800', fontSize: 14 },
  caption: { color: '#fff', fontSize: 10, marginTop: 2 },
  lane: { height: 28, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#7f8c8d', marginVertical: 6 },
  laneText: { color: '#bdc3c7', fontSize: 11 },
});
