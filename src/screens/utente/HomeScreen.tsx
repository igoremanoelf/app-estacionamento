import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProgressRing } from '../../components/Charts';
import { HeroHeader, HeroPill } from '../../components/Hero';
import { Avatar, Banner, EmptyState, SectionTitle } from '../../components/Misc';
import { ParkSelector } from '../../components/ParkSelector';
import { ReservationCard } from '../../components/ReservationCard';
import { Screen } from '../../components/Screen';
import { useProfile } from '../../context/AuthContext';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useNow, useSpots, useUserReservations } from '../../hooks/data';
import { colors, fonts, gradients, radius, shadows, spacing } from '../../theme';
import { spotStates } from '../../utils/availability';
import { formatMoney, isWithinOpeningHours, openingHoursLabel } from '../../utils/dates';
import { totalPending } from '../../utils/pricing';

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite';
}

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

  const total = spots.filter((s) => s.active).length;
  const active = reservations.filter((r) => r.status === 'reservada' || r.status === 'no_parque');
  const pending = reservations.reduce((s, r) => s + totalPending(r.payments), 0);
  const open = park ? isWithinOpeningHours(now, park) : false;

  const actions = [
    { icon: 'calendar' as const, label: 'Reservar', hint: 'Marcação antecipada', colors: gradients.brand, onPress: () => navigation.navigate('Reserve', { kind: 'antecipada' }) },
    { icon: 'flash' as const, label: 'Lugar agora', hint: 'Pedido à entrada', colors: gradients.mint, onPress: () => navigation.navigate('WalkIn') },
    { icon: 'ribbon' as const, label: 'Avença', hint: 'Plano mensal', colors: gradients.sunset, onPress: () => navigation.navigate('Reserve', { kind: 'avenca' }) },
  ];

  const header = (
    <HeroHeader
      overline={`${greeting(now)},`}
      title={`${profile.name.split(' ')[0]} 👋`}
      right={
        <Pressable onPress={() => navigation.navigate('UtenteMain', { screen: 'Profile' })} style={styles.avatarRing}>
          <Avatar uri={profile.photoURL} name={profile.name} size={44} />
        </Pressable>
      }
    >
      <ParkSelector parks={parks} value={parkId} onChange={setParkId} dark />
      {park && (
        <View style={styles.glass}>
          <ProgressRing
            value={total ? freeNow / total : 0}
            size={92}
            stroke={10}
            colors={gradients.mint}
            track="rgba(255,255,255,0.12)"
            textColor="#fff"
            label="livres"
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.freeBig}>
              {freeNow}
              <Text style={styles.freeOf}> / {total} lugares</Text>
            </Text>
            <Text style={styles.freeLabel}>disponíveis neste momento</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <HeroPill tone={open ? 'success' : 'danger'}>{open ? 'Aberto' : 'Fechado'}</HeroPill>
              <HeroPill>{openingHoursLabel(park)}</HeroPill>
            </View>
          </View>
        </View>
      )}
    </HeroHeader>
  );

  return (
    <Screen header={header}>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable key={a.label} style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.96 }] }]} onPress={a.onPress}>
            <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionIcon}>
              <Ionicons name={a.icon} size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>{a.label}</Text>
            <Text style={styles.actionHint}>{a.hint}</Text>
          </Pressable>
        ))}
      </View>

      {pending > 0 && <Banner tone="danger" text={`Tem ${formatMoney(pending)} por pagar. Abra o bilhete para pagar.`} />}

      <SectionTitle action={active.length ? 'Histórico' : undefined} onAction={() => navigation.navigate('UtenteMain', { screen: 'History' })}>
        Bilhetes ativos
      </SectionTitle>
      {active.length === 0 ? (
        <EmptyState icon="ticket-outline" title="Sem reservas ativas" subtitle="Faça uma reserva ou peça um lugar quando chegar ao parque." />
      ) : (
        active.map((r) => <ReservationCard key={r.id} reservation={r} showPark onPress={() => navigation.navigate('ReservationDetail', { id: r.id })} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarRing: { borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', padding: 2 },
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
  freeBig: { fontFamily: fonts.extrabold, fontSize: 30, color: '#fff', letterSpacing: -1 },
  freeOf: { fontFamily: fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.6)', letterSpacing: 0 },
  freeLabel: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: -4 },
  actions: { flexDirection: 'row', gap: spacing.sm + 2 },
  action: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
  },
  actionIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actionLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  actionHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
