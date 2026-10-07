import { useMemo } from 'react';
import { Text } from 'react-native';
import { Loading } from '../../components/Misc';
import { ParkMap } from '../../components/ParkMap';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useNow, useSpots } from '../../hooks/data';
import { colors } from '../../theme';
import { spotStates } from '../../utils/availability';

/** Vista virtual do parque em tempo real (lugares livres, ocupados, reservados). */
export function ParkViewScreen() {
  const { parkId, park } = useCurrentPark();
  const { data: spots, loading } = useSpots(parkId);
  const { data: intervals } = useIntervals(parkId);
  const now = useNow();
  const states = useMemo(() => spotStates(spots, intervals, undefined, now), [spots, intervals, now]);
  if (loading) return <Loading />;
  return (
    <Screen>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{park?.name}</Text>
      <ParkMap spots={spots} states={states} />
    </Screen>
  );
}
