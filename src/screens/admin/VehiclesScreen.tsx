import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { EmptyState, ListItem, Loading, Segmented } from '../../components/Misc';
import { TextField } from '../../components/TextField';
import { useCurrentPark } from '../../context/ParkContext';
import { useParkReservations, useParkVehicles } from '../../hooks/data';
import { VEHICLE_TYPES } from '../../types';
import { colors, spacing } from '../../theme';
import { formatDateTime } from '../../utils/dates';

/** RFA3: informação dos veículos estacionados e de todos os que alguma vez usaram o parque. */
export function VehiclesScreen() {
  const navigation = useNavigation();
  const { parkId } = useCurrentPark();
  const { data: vehicles, loading } = useParkVehicles(parkId);
  const { data: reservations } = useParkReservations(parkId);
  const [filter, setFilter] = useState<'todos' | 'estacionados'>('estacionados');
  const [search, setSearch] = useState('');

  const insidePlates = useMemo(() => new Set(reservations.filter((r) => r.status === 'no_parque').map((r) => r.plate)), [reservations]);
  const list = useMemo(() => {
    const q = search.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return vehicles.filter((v) => (filter === 'todos' || insidePlates.has(v.plate)) && (!q || v.plate.replace(/-/g, '').includes(q)));
  }, [vehicles, filter, search, insidePlates]);

  if (loading) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={list}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'estacionados', label: `Estacionados (${insidePlates.size})` },
              { value: 'todos', label: `Todos (${vehicles.length})` },
            ]}
          />
          <TextField label="Pesquisar matrícula" value={search} onChangeText={setSearch} autoCapitalize="characters" icon="search-outline" />
        </View>
      }
      renderItem={({ item }) => (
        <ListItem
          icon={VEHICLE_TYPES.find((t) => t.value === item.vehicleType)?.icon as keyof typeof Ionicons.glyphMap}
          title={`${item.plate}${insidePlates.has(item.plate) ? ' · no parque' : ''}`}
          subtitle={`${item.lastUserName} · ${item.visits} entrada(s) · última ${formatDateTime(item.lastSeen.toDate())}`}
          onPress={() => navigation.navigate('VehicleHistory', { plate: item.plate })}
        />
      )}
      ListEmptyComponent={<EmptyState icon="car-outline" title="Sem veículos" subtitle="Os veículos são registados quando entram no parque." />}
    />
  );
}
