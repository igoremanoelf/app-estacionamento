import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { EmptyState, Loading, Segmented } from '../../components/Misc';
import { ReservationCard } from '../../components/ReservationCard';
import { TextField } from '../../components/TextField';
import { useCurrentPark } from '../../context/ParkContext';
import { useParkReservations } from '../../hooks/data';
import { colors, spacing } from '../../theme';

type Filter = 'no_parque' | 'reservada' | 'todas';

/** RFG3: todos os lugares reservados e todas as viaturas no parque num dado momento. */
export function ReservationsScreen() {
  const navigation = useNavigation();
  const { parkId } = useCurrentPark();
  const { data, loading } = useParkReservations(parkId);
  const [filter, setFilter] = useState<Filter>('no_parque');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const q = search.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    return data.filter((r) => {
      if (filter !== 'todas' && r.status !== filter) return false;
      if (!q) return true;
      return r.plate.replace(/-/g, '').includes(q.replace(/ /g, '')) || r.userName.toUpperCase().includes(q) || r.spotCode.includes(q);
    });
  }, [data, filter, search]);

  if (loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={list}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'no_parque', label: `No parque (${data.filter((r) => r.status === 'no_parque').length})` },
              { value: 'reservada', label: `Reservas (${data.filter((r) => r.status === 'reservada').length})` },
              { value: 'todas', label: 'Todas' },
            ]}
          />
          <TextField label="Pesquisar" placeholder="Matrícula, nome ou lugar" value={search} onChangeText={setSearch} />
        </View>
      }
      renderItem={({ item }) => <ReservationCard reservation={item} showUser onPress={() => navigation.navigate('ManageReservation', { id: item.id })} />}
      ListEmptyComponent={<EmptyState title="Nada para mostrar" />}
      initialNumToRender={10}
      windowSize={7}
    />
  );
}
