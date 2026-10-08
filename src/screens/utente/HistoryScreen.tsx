import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, IconChip, Loading, Segmented } from '../../components/Misc';
import { ReservationCard } from '../../components/ReservationCard';
import { useProfile } from '../../context/AuthContext';
import { useUserReservations } from '../../hooks/data';
import { colors, fonts, spacing } from '../../theme';
import { formatMoney } from '../../utils/dates';
import { totalPaid } from '../../utils/pricing';

type Filter = 'todas' | 'ativas' | 'terminadas';

/** RFC0: histórico de marcações por veículo, com os valores pagos. */
export function HistoryScreen() {
  const navigation = useNavigation();
  const profile = useProfile();
  const { data, loading } = useUserReservations(profile.id);
  const [filter, setFilter] = useState<Filter>('todas');

  const sections = useMemo(() => {
    const filtered = data.filter((r) =>
      filter === 'todas' ? true : filter === 'ativas' ? r.status === 'reservada' || r.status === 'no_parque' : r.status === 'concluida' || r.status === 'cancelada',
    );
    const byPlate = new Map<string, typeof filtered>();
    for (const r of filtered) byPlate.set(r.plate, [...(byPlate.get(r.plate) ?? []), r]);
    return [...byPlate.entries()].map(([plate, list]) => ({
      plate,
      total: list.reduce((s, r) => s + totalPaid(r.payments), 0),
      data: list,
    }));
  }, [data, filter]);

  if (loading) return <Loading />;

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
      sections={sections}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todas', label: 'Todas' },
            { value: 'ativas', label: 'Ativas' },
            { value: 'terminadas', label: 'Terminadas' },
          ]}
        />
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.header}>
          <IconChip name="car-sport" size={36} />
          <Text style={styles.plate}>{section.plate}</Text>
          <View style={styles.totalPill}>
            <Text style={styles.total}>{formatMoney(section.total)} pagos</Text>
          </View>
        </View>
      )}
      renderItem={({ item }) => <ReservationCard reservation={item} showPark onPress={() => navigation.navigate('ReservationDetail', { id: item.id })} />}
      ListEmptyComponent={<EmptyState icon="time-outline" title="Sem histórico" subtitle="As suas reservas aparecem aqui agrupadas por veículo." />}
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginTop: spacing.lg },
  plate: { flex: 1, fontSize: 17, fontFamily: fonts.extrabold, color: colors.text, letterSpacing: 1 },
  totalPill: { backgroundColor: colors.successLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  total: { color: colors.success, fontFamily: fonts.semibold, fontSize: 12 },
});
