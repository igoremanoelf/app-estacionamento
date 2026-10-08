import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { ProgressRing, StatTile } from '../../components/Charts';
import { HeroHeader, HeroPill } from '../../components/Hero';
import { Banner, Divider, InfoRow, Loading } from '../../components/Misc';
import { ProfileHeaderButton } from '../../navigation/tabIcon';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useNow, useParkReservations, useSpots } from '../../hooks/data';
import { colors, fonts, gradients, radius, spacing } from '../../theme';
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

  const ratio = occupied / Math.max(1, active);
  const header = (
    <HeroHeader overline="Painel do parque" title={park.name} right={<ProfileHeaderButton light />}>
      <View style={styles.glass}>
        <ProgressRing
          value={ratio}
          size={96}
          stroke={10}
          colors={ratio > 0.85 ? gradients.danger : gradients.brand}
          track="rgba(255,255,255,0.12)"
          textColor="#fff"
          label="ocupado"
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.big}>
            {occupied}
            <Text style={styles.of}> / {active} ocupados</Text>
          </Text>
          <Text style={styles.heroMuted}>{active - occupied} lugares livres agora</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <HeroPill>{openingHoursLabel(park)}</HeroPill>
            {alerts.length > 0 && <HeroPill tone="danger">{`${alerts.length} alerta(s)`}</HeroPill>}
          </View>
        </View>
      </View>
    </HeroHeader>
  );

  return (
    <Screen header={header}>
      <View style={styles.tiles}>
        <StatTile label="Livres" value={String(active - occupied)} hint="neste momento" color={colors.spotFree} icon="checkmark-circle" />
        <StatTile label="A chegar" value={String(upcoming.length)} hint="próximas 3h" color={colors.primary} icon="enter" />
      </View>
      <View style={styles.tiles}>
        <StatTile label="A sair" value={String(freeingIn(1))} hint="na próxima hora" color={colors.warning} icon="exit" />
        <StatTile label="Alertas" value={String(alerts.length)} hint="incumprimentos" color={colors.danger} icon="warning" />
      </View>
      {alerts.length > 0 && <Banner tone="danger" text={`${alerts.length} alerta(s) de incumprimento. Toque em "Alertas".`} />}

      <Card title="Previsão de desocupação" icon="hourglass-outline">
        <InfoRow label="Na próxima hora" value={`${freeingIn(1)} lugar(es)`} />
        <InfoRow label="Nas próximas 3 horas" value={`${freeingIn(3)} lugar(es)`} />
        <InfoRow label="Sem hora de saída prevista" value={`${inside.filter((r) => !r.end || r.kind === 'avenca').length}`} />
        {inside.length > 0 && <Divider />}
        {inside.slice(0, 8).map((r) => {
          const end = r.end?.toDate();
          const late = end && end < now;
          return (
            <View key={r.id} style={styles.leaving}>
              <View style={styles.spotChip}>
                <Text style={styles.spotChipText}>{r.spotCode}</Text>
              </View>
              <Text style={styles.plate}>{r.plate}</Text>
              <Text style={[styles.when, late && { color: colors.danger }]}>
                {!end || r.kind === 'imediata' ? 'indeterminado' : late ? `atrasado ${formatDuration(now.getTime() - end.getTime())}` : `${formatTime(end)} · em ${formatDuration(end.getTime() - now.getTime())}`}
              </Text>
            </View>
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
  glass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  big: { fontFamily: fonts.extrabold, fontSize: 30, color: '#fff', letterSpacing: -1 },
  of: { fontFamily: fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.6)', letterSpacing: 0 },
  heroMuted: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: -4 },
  tiles: { flexDirection: 'row', gap: spacing.sm + 2 },
  leaving: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  spotChip: { minWidth: 44, paddingHorizontal: 6, height: 30, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  spotChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  plate: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, letterSpacing: 0.5, flex: 1 },
  when: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
});
