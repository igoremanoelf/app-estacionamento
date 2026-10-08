import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Loading } from '../../components/Misc';
import { ParkMap } from '../../components/ParkMap';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useNow, useSpots } from '../../hooks/data';
import { colors, fonts } from '../../theme';
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
      <View style={styles.head}>
        <Text style={styles.title}>{park?.name}</Text>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Tempo real</Text>
        </View>
      </View>
      <ParkMap spots={spots} states={states} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 18, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.3 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.successLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.success },
});
