import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { ProgressBar, StatTile } from '../../components/Charts';
import { Banner, InfoRow, Loading } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useNow, useParkReservations, useSpots } from '../../hooks/data';
import { colors, spacing } from '../../theme';
import { computeAlerts } from '../../utils/alerts';
import { formatDuration, formatTime, HOUR, openingHoursLabel } from '../../utils/dates';

/** RFG1b: ocupação do parque com previsão de desocupação dos lugares. */
export function DashboardScreen() {
  const navigation = useNavigation();
  const { parkId, park } = useCurrentPark();
  const { data: spots, loading } = useSpots(parkId);
  const { data: reservations } = useParkReservations(parkId);
  const now = useNow();

  const inside = useMemo(
    () =>
      reservations
        .filter((r) => r.status === 'no_parque')
        .sort((a, b) => (a.end?.toMillis() ?? Infinity) - (b.end?.toMillis() ?? Infinity)),
    [reservations],
  );
  const alerts = useMemo(() => computeAlerts(reservations, now), [reservations, now]);

  if (loading || !park) return <Loading />;

  const active = spots.filter((s) => s.active).length;
  const occupied = spots.filter((s) => s.active && s.occupied).length;
  const upcoming = reservations.filter((r) => r.status === 'reservada' && r.start.toDate() > now && r.start.toMillis() - now.getTime() < 3 * HOUR);
  const freeingIn = (h: number) => inside.filter((r) => r.end && r.end.toMillis() - now.getTime() <= h * HOUR).length;

  return (
    <Screen>
      <Text style={styles.title}>{park.name}</Text>
      <Text style={styles.muted}>{openingHoursLabel(park)}</Text>
      {alerts.length > 0 && <Banner tone="danger" text={`${alerts.length} alerta(s) de incumprimento. Toque em "Alertas".`} />}

      <View style={styles.tiles}>
        <StatTile label="Ocupados" value={`${occupied}/${active}`} hint="lugares ativos" color={colors.spotOccupied} />
        <StatTile label="Livres" value={String(active - occupied)} hint="neste momento" color={colors.spotFree} />
      </View>
      <View style={styles.tiles}>
        <StatTile label="A chegar" value={String(upcoming.length)} hint="próximas 3h" color={colors.warning} />
        <StatTile label="Alertas" value={String(alerts.length)} hint="incumprimentos" color={colors.danger} />
      </View>

      <Card title="Ocupação">
        <ProgressBar value={active ? occupied / active : 0} color={occupied / Math.max(1, active) > 0.85 ? colors.danger : colors.primary} />
        <Text style={styles.muted}>{Math.round((occupied / Math.max(1, active)) * 100)}% ocupado</Text>
      </Card>

      <Card title="Previsão de desocupação">
        <InfoRow label="Na próxima hora" value={`${freeingIn(1)} lugar(es)`} />
        <InfoRow label="Nas próximas 3 horas" value={`${freeingIn(3)} lugar(es)`} />
        <InfoRow label="Sem hora de saída prevista" value={`${inside.filter((r) => !r.end || r.kind === 'avenca').length}`} />
        {inside.slice(0, 8).map((r) => {
          const end = r.end?.toDate();
          const late = end && end < now;
          return (
            <InfoRow
              key={r.id}
              label={`${r.spotCode} · ${r.plate}`}
              value={!end || r.kind === 'imediata' ? 'indeterminado' : late ? `atrasado ${formatDuration(now.getTime() - end.getTime())}` : `${formatTime(end)} (em ${formatDuration(end.getTime() - now.getTime())})`}
            />
          );
        })}
      </Card>

      <View style={styles.tiles}>
        <AppButton title="Alertas" icon="warning-outline" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('Alerts')} />
        <AppButton title="Estatísticas" icon="stats-chart-outline" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('Stats')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted },
  tiles: { flexDirection: 'row', gap: spacing.sm },
});
