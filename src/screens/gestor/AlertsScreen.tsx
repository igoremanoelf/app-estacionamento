import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/Misc';
import { useCurrentPark } from '../../context/ParkContext';
import { useNow, useParkReservations } from '../../hooks/data';
import type { AlertKind } from '../../types';
import { colors, fonts, spacing } from '../../theme';
import { computeAlerts } from '../../utils/alerts';
import { formatDateTime } from '../../utils/dates';

const KIND: Record<AlertKind, { label: string; color: string; background: string }> = {
  nao_comparencia: { label: 'Não comparência', color: '#8a5700', background: colors.warningLight },
  excesso_tempo: { label: 'Tempo excedido', color: colors.danger, background: colors.dangerLight },
  pagamento_pendente: { label: 'Pagamento em falta', color: colors.primaryDark, background: colors.primaryLight },
};

/** RFG6: alertas de incumprimento; cada alerta abre a reserva para a alterar ou emitir pagamentos extra. */
export function AlertsScreen() {
  const navigation = useNavigation();
  const { parkId } = useCurrentPark();
  const { data } = useParkReservations(parkId);
  const now = useNow(30_000);
  const alerts = useMemo(() => computeAlerts(data, now), [data, now]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={alerts}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => (
        <Card onPress={() => navigation.navigate('ManageReservation', { id: item.reservation.id })}>
          <View style={styles.row}>
            <Badge {...KIND[item.kind]} />
            <Text style={styles.muted}>{formatDateTime(item.since)}</Text>
          </View>
          <Text style={styles.text}>{item.message}</Text>
          <Text style={styles.muted}>{item.reservation.userName} · toque para gerir</Text>
        </Card>
      )}
      ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="Sem incumprimentos" subtitle="Os alertas aparecem aqui automaticamente." />}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text: { color: colors.text, fontFamily: fonts.semibold },
  muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
});
