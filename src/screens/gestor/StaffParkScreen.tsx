import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ActionSheet } from '../../components/ActionSheet';
import { Loading } from '../../components/Misc';
import { ParkMap } from '../../components/ParkMap';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useNow, useParkReservations, useSpots } from '../../hooks/data';
import { errorMessage } from '../../services/auth';
import { updateSpot } from '../../services/parks';
import type { Spot } from '../../types';
import { spotStates } from '../../utils/availability';
import { formatTime } from '../../utils/dates';

/**
 * RFG4: vista virtual dos lugares (ocupados, vazios, desativados) com a hora
 * prevista de saída. RFG1a: tocar num lugar permite editar o seu estado.
 */
export function StaffParkScreen() {
  const navigation = useNavigation();
  const { parkId } = useCurrentPark();
  const { data: spots, loading } = useSpots(parkId);
  const { data: intervals } = useIntervals(parkId);
  const { data: reservations } = useParkReservations(parkId);
  const now = useNow();
  const states = useMemo(() => spotStates(spots, intervals, undefined, now), [spots, intervals, now]);

  const current = useMemo(() => {
    const map: Record<string, (typeof reservations)[number]> = {};
    for (const r of reservations) if (r.status === 'no_parque') map[r.spotId] = r;
    for (const r of reservations) {
      if (r.status === 'reservada' && !map[r.spotId] && r.start.toDate() <= now && (!r.end || r.end.toDate() > now)) map[r.spotId] = r;
    }
    return map;
  }, [reservations, now]);

  const captions = useMemo(() => {
    const c: Record<string, string> = {};
    for (const [spotId, r] of Object.entries(current)) {
      if (r.status === 'no_parque') c[spotId] = r.end && r.kind !== 'imediata' ? `sai ${formatTime(r.end.toDate())}` : r.plate;
      else c[spotId] = 'reservado';
    }
    return c;
  }, [current]);

  const [selected, setSelected] = useState<Spot | null>(null);
  const spot = selected ? (spots.find((s) => s.id === selected.id) ?? selected) : null;
  const r = spot ? current[spot.id] : undefined;
  const set = (data: Partial<Pick<Spot, 'active' | 'occupied'>>) =>
    spot && updateSpot(parkId, spot.id, data).catch((e) => Alert.alert('Erro', errorMessage(e)));

  if (loading) return <Loading />;
  return (
    <Screen>
      <ParkMap spots={spots} states={states} captions={captions} onSpotPress={setSelected} />
      <ActionSheet
        visible={!!spot}
        onClose={() => setSelected(null)}
        title={spot ? `Lugar ${spot.code}` : ''}
        message={spot ? `${spot.active ? 'Ativo' : 'Desativado'} · ${spot.occupied ? 'Ocupado' : 'Desocupado'}${r ? ` · ${r.plate} (${r.userName})` : ''}` : ''}
        actions={
          spot
            ? [
                ...(r ? [{ label: 'Ver reserva', onPress: () => navigation.navigate('ManageReservation', { id: r.id }) }] : []),
                { label: spot.occupied ? 'Marcar como desocupado' : 'Marcar como ocupado', onPress: () => set({ occupied: !spot.occupied }) },
                { label: spot.active ? 'Desativar lugar' : 'Ativar lugar', destructive: spot.active, onPress: () => set({ active: !spot.active }) },
              ]
            : []
        }
      />
    </Screen>
  );
}
