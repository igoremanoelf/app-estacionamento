import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { Banner, EmptyState, InfoRow, SectionTitle } from '../../components/Misc';
import { ParkSelector } from '../../components/ParkSelector';
import { ReservationCard } from '../../components/ReservationCard';
import { Screen } from '../../components/Screen';
import { useProfile } from '../../context/AuthContext';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useNow, useSpots, useUserReservations } from '../../hooks/data';
import { colors, radius, spacing } from '../../theme';
import { spotStates } from '../../utils/availability';
import { formatMoney, isWithinOpeningHours, openingHoursLabel } from '../../utils/dates';
import { totalPending } from '../../utils/pricing';

export function HomeScreen() {
  const navigation = useNavigation();
  const profile = useProfile();
  const { parkId, park, parks, setParkId } = useCurrentPark();
  const { data: spots } = useSpots(parkId);
  const { data: intervals } = useIntervals(parkId);
  const { data: reservations } = useUserReservations(profile.id);
  const now = useNow();

  const freeNow = useMemo(() => {
    const states = spotStates(spots, intervals, undefined, now);
    return Object.values(states).filter((s) => s === 'livre').length;
  }, [spots, intervals, now]);

  const active = reservations.filter((r) => r.status === 'reservada' || r.status === 'no_parque');
  const pending = reservations.reduce((s, r) => s + totalPending(r.payments), 0);
  const open = park ? isWithinOpeningHours(now, park) : false;

  const actions = [
    { icon: 'calendar' as const, label: 'Reservar', hint: 'Marcação antecipada', onPress: () => navigation.navigate('Reserve', { kind: 'antecipada' }) },
    { icon: 'flash' as const, label: 'Lugar agora', hint: 'Pedido à entrada', onPress: () => navigation.navigate('WalkIn') },
    { icon: 'ribbon' as const, label: 'Avença', hint: 'Mensal', onPress: () => navigation.navigate('Reserve', { kind: 'avenca' }) },
  ];

  return (
    <Screen>
      <Text style={styles.hello}>Olá, {profile.name.split(' ')[0]} 👋</Text>
      <ParkSelector parks={parks} value={parkId} onChange={setParkId} />
      {park && (
        <Card>
          <InfoRow label="Horário" value={openingHoursLabel(park)} />
          <InfoRow label="Estado" value={open ? 'Aberto' : 'Fechado'} />
          <InfoRow label="Lugares livres agora" value={`${freeNow} de ${spots.filter((s) => s.active).length}`} strong />
        </Card>
      )}
      {pending > 0 && <Banner tone="danger" text={`Tem ${formatMoney(pending)} por pagar. Abra o bilhete para pagar.`} />}

      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable key={a.label} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]} onPress={a.onPress}>
            <Ionicons name={a.icon} size={26} color={colors.primary} />
            <Text style={styles.actionLabel}>{a.label}</Text>
            <Text style={styles.actionHint}>{a.hint}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Bilhetes ativos</SectionTitle>
      {active.length === 0 ? (
        <EmptyState icon="ticket-outline" title="Sem reservas ativas" subtitle="Faça uma reserva ou peça um lugar quando chegar ao parque." />
      ) : (
        active.map((r) => <ReservationCard key={r.id} reservation={r} showPark onPress={() => navigation.navigate('ReservationDetail', { id: r.id })} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 22, fontWeight: '800', color: '#1B2430' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: { fontWeight: '700', color: colors.text },
  actionHint: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
