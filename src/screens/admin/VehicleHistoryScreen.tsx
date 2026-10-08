import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { FlatList } from 'react-native';
import { Card } from '../../components/Card';
import { EmptyState, InfoRow } from '../../components/Misc';
import { ReservationCard } from '../../components/ReservationCard';
import { useCurrentPark } from '../../context/ParkContext';
import { useParkReservations } from '../../hooks/data';
import type { RootScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { formatMoney } from '../../utils/dates';
import { totalPaid } from '../../utils/pricing';

export function VehicleHistoryScreen({ route }: RootScreenProps<'VehicleHistory'>) {
  const navigation = useNavigation();
  const { parkId } = useCurrentPark();
  const { data } = useParkReservations(parkId);
  const list = useMemo(() => data.filter((r) => r.plate === route.params.plate), [data, route.params.plate]);
  const entries = list.reduce((s, r) => s + r.entries.length, 0);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={list}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <Card title="Resumo" icon="receipt-outline">
          <InfoRow label="Reservas" value={String(list.length)} />
          <InfoRow label="Entradas" value={String(entries)} />
          <InfoRow label="Total pago" value={formatMoney(list.reduce((s, r) => s + totalPaid(r.payments), 0))} />
        </Card>
      }
      renderItem={({ item }) => <ReservationCard reservation={item} showUser onPress={() => navigation.navigate('ManageReservation', { id: item.id })} />}
      ListEmptyComponent={<EmptyState title="Sem reservas no histórico" />}
    />
  );
}
