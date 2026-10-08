import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Reservation } from '../types';
import { colors, fonts, gradients, radius, shadows, spacing } from '../theme';
import { formatDateTime, formatMoney } from '../utils/dates';
import { totalPaid, totalPending } from '../utils/pricing';
import { KIND_LABEL, StatusBadge } from './Badge';

interface Props {
  reservation: Reservation;
  onPress?: () => void;
  showUser?: boolean;
  showPark?: boolean;
}

const SPOT_GRADIENT = {
  reservada: gradients.brand,
  no_parque: gradients.mint,
  concluida: ['#A3ADC2', '#7A859C'] as const,
  cancelada: ['#C7CEDB', '#A3ADC2'] as const,
};

/** Cartão em forma de bilhete: lugar à esquerda, destacado, e detalhes à direita. */
function ReservationCardBase({ reservation: r, onPress, showUser, showPark }: Props) {
  const pending = totalPending(r.payments);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }] }]}>
      <LinearGradient colors={SPOT_GRADIENT[r.status]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stub}>
        <Text style={styles.stubLabel}>LUGAR</Text>
        <Text style={styles.stubSpot} numberOfLines={1} adjustsFontSizeToFit>
          {r.spotCode}
        </Text>
      </LinearGradient>
      <View style={styles.notches}>
        <View style={[styles.notch, { top: -9 }]} />
        <View style={styles.perforation} />
        <View style={[styles.notch, { bottom: -9 }]} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.plate}>
            <View style={styles.plateEu} />
            <Text style={styles.plateText}>{r.plate}</Text>
          </View>
          <StatusBadge status={r.status} />
        </View>
        <Text style={styles.kind} numberOfLines={1}>
          {KIND_LABEL[r.kind]}
          {showPark ? ` · ${r.parkName}` : ''}
        </Text>
        {showUser && (
          <View style={styles.line}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <Text style={styles.muted}>{r.userName}</Text>
          </View>
        )}
        <View style={styles.line}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.muted} numberOfLines={1}>
            {formatDateTime(r.start.toDate())} → {r.end ? formatDateTime(r.end.toDate()) : 'saída livre'}
          </Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="wallet-outline" size={13} color={colors.textMuted} />
          <Text style={styles.muted}>Pago {formatMoney(totalPaid(r.payments))}</Text>
          {pending > 0 && <Text style={styles.pending}>· por pagar {formatMoney(pending)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

export const ReservationCard = memo(ReservationCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.md },
  stub: { width: 78, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 2 },
  stubLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 },
  stubSpot: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.5 },
  notches: { width: 0, alignItems: 'center' },
  notch: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: colors.background, left: -9 },
  perforation: { position: 'absolute', top: 14, bottom: 14, left: 0, borderLeftWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  body: { flex: 1, padding: spacing.md + 2, paddingLeft: spacing.lg, gap: 5 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  plate: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderColor: colors.text, borderRadius: 6, overflow: 'hidden' },
  plateEu: { width: 7, backgroundColor: '#1D4ED8' },
  plateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, letterSpacing: 1, paddingHorizontal: 7, paddingVertical: 2 },
  kind: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginTop: 2 },
  muted: { color: colors.textMuted, fontSize: 12.5, fontFamily: fonts.regular, flexShrink: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pending: { color: colors.danger, fontFamily: fonts.bold, fontSize: 12.5 },
});
