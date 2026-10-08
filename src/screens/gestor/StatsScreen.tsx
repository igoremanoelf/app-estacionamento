import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { KIND_LABEL } from '../../components/Badge';
import { Card } from '../../components/Card';
import { BarChart, ProgressBar, StatTile } from '../../components/Charts';
import { InfoRow, Loading } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useNow, useParkReservations, useSpots } from '../../hooks/data';
import type { ReservationKind } from '../../types';
import { colors, spacing } from '../../theme';
import { formatDuration, formatMoney } from '../../utils/dates';
import { computeStats } from '../../utils/stats';

/** RFG1c / RFG5: estatísticas sobre a ocupação e o funcionamento do parque. */
export function StatsScreen() {
  const { parkId } = useCurrentPark();
  const { data: spots, loading } = useSpots(parkId);
  const { data: reservations } = useParkReservations(parkId);
  const now = useNow(60_000);
  const s = useMemo(() => computeStats(spots, reservations, now), [spots, reservations, now]);

  if (loading) return <Loading />;
  const totalKinds = Math.max(1, s.byKind.antecipada + s.byKind.imediata + s.byKind.avenca);

  return (
    <Screen>
      <View style={styles.row}>
        <StatTile label="Taxa de ocupação" value={`${Math.round(s.occupancyRate * 100)}%`} hint={`${s.occupiedNow}/${s.activeSpots} lugares`} />
        <StatTile label="Receita total" value={formatMoney(s.revenueTotal)} color={colors.success} />
      </View>
      <View style={styles.row}>
        <StatTile label="Veículos no parque" value={String(s.vehiclesInside)} color={colors.spotOccupied} />
        <StatTile label="Permanência média" value={s.avgStayMinutes ? formatDuration(s.avgStayMinutes * 60_000) : '—'} color={colors.warning} />
      </View>

      <Card title="Receita dos últimos 7 dias" icon="cash-outline">
        <BarChart data={s.revenueLast7} color={colors.success} format={(v) => `${Math.round(v)}€`} />
      </Card>

      <Card title="Entradas por hora do dia" icon="bar-chart-outline">
        <BarChart data={s.entriesByHour.map((v, h) => ({ label: `${h}h`, value: v }))} showEveryLabel={3} />
      </Card>

      <Card title="Reservas por tipo" icon="pie-chart-outline">
        {(Object.keys(s.byKind) as ReservationKind[]).map((k) => (
          <View key={k} style={{ gap: 4 }}>
            <InfoRow label={KIND_LABEL[k]} value={String(s.byKind[k])} />
            <ProgressBar value={s.byKind[k] / totalKinds} />
          </View>
        ))}
      </Card>

      <Card title="Lugares mais usados" icon="trophy-outline">
        {s.topSpots.length === 0 && <InfoRow label="Sem dados" value="—" />}
        {s.topSpots.map((t) => (
          <InfoRow key={t.code} label={t.code} value={`${t.count} reserva(s)`} />
        ))}
      </Card>

      <Card title="Lugares" icon="grid-outline">
        <InfoRow label="Total" value={String(s.totalSpots)} />
        <InfoRow label="Ativos" value={String(s.activeSpots)} />
        <InfoRow label="Desativados" value={String(s.totalSpots - s.activeSpots)} />
        <InfoRow label="Reservas futuras" value={String(s.reservedUpcoming)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
});
