import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Reservation } from '../types';
import { colors, spacing } from '../theme';
import { formatDateTime, formatMoney } from '../utils/dates';
import { totalPaid, totalPending } from '../utils/pricing';
import { KIND_LABEL, StatusBadge } from './Badge';
import { Card } from './Card';

interface Props {
  reservation: Reservation;
  onPress?: () => void;
  showUser?: boolean;
  showPark?: boolean;
}

function ReservationCardBase({ reservation: r, onPress, showUser, showPark }: Props) {
  const pending = totalPending(r.payments);
  return (
    <Card onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.spot}>
          <Text style={styles.spotText}>{r.spotCode}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.plate}>{r.plate}</Text>
          <Text style={styles.muted}>{KIND_LABEL[r.kind]}{showPark ? ` · ${r.parkName}` : ''}</Text>
          {showUser && <Text style={styles.muted}>{r.userName}</Text>}
        </View>
        <StatusBadge status={r.status} />
      </View>
      <View style={styles.line}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={styles.muted}>
          {formatDateTime(r.start.toDate())} → {r.end ? formatDateTime(r.end.toDate()) : 'saída livre'}
        </Text>
      </View>
      <View style={styles.line}>
        <Ionicons name="card-outline" size={14} color={colors.textMuted} />
        <Text style={styles.muted}>Pago: {formatMoney(totalPaid(r.payments))}</Text>
        {pending > 0 && <Text style={styles.pending}>· Por pagar: {formatMoney(pending)}</Text>}
      </View>
    </Card>
  );
}

export const ReservationCard = memo(ReservationCardBase);

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spot: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  spotText: { color: '#fff', fontWeight: '800' },
  plate: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 1 },
  muted: { color: colors.textMuted, fontSize: 13 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pending: { color: colors.danger, fontWeight: '700', fontSize: 13 },
});
