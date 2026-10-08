import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { KIND_LABEL, StatusBadge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Banner, EmptyState, InfoRow, Loading } from '../../components/Misc';
import { PaymentList } from '../../components/PaymentList';
import { QRTicket } from '../../components/QRTicket';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useNow, useReservation } from '../../hooks/data';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage } from '../../services/auth';
import { cancelReservation, nextMonthlyPeriod, payPending, renewMonthly } from '../../services/reservations';
import { colors, spacing } from '../../theme';
import { formatDate, formatDateTime, formatDuration, formatMoney } from '../../utils/dates';
import { computeHourlyAmount, monthlyAmount, totalPaid, totalPending } from '../../utils/pricing';

export function ReservationDetailScreen({ route, navigation }: RootScreenProps<'ReservationDetail'>) {
  const { data: r, loading } = useReservation(route.params.id);
  const { parks } = useCurrentPark();
  const now = useNow(15_000);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!r) return <EmptyState title="Reserva não encontrada" />;
  const park = parks.find((p) => p.id === r.parkId);

  const pending = totalPending(r.payments);
  const end = r.end?.toDate() ?? null;
  const lastEntry = r.entries.at(-1);
  const canEdit = r.kind === 'antecipada' && (r.status === 'reservada' || r.status === 'no_parque') && !!end && end > now;
  const canCancel = r.status === 'reservada' && r.kind !== 'avenca';
  const canRenew = r.kind === 'avenca' && r.status !== 'cancelada';
  const runningCost =
    r.kind === 'imediata' && r.status === 'no_parque' && park && lastEntry
      ? computeHourlyAmount(lastEntry.in.toDate(), now, r.vehicleType, park.prices)
      : null;

  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await fn();
      if (done) Alert.alert('Concluído', done);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmRenew = () => {
    if (!park) return;
    const p = nextMonthlyPeriod(r);
    Alert.alert('Renovar avença', `Renovar de ${formatDate(p.start)} a ${formatDate(p.end)} por ${formatMoney(monthlyAmount(r.vehicleType, park.prices))}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Renovar e pagar', onPress: () => run('renew', () => renewMonthly(r, park), 'Avença renovada. O QR Code mantém-se.') },
    ]);
  };

  const confirmCancel = () =>
    Alert.alert('Cancelar reserva', 'Tem a certeza? Se cancelar antes da hora de entrada, o valor é reembolsado.', [
      { text: 'Não', style: 'cancel' },
      { text: 'Cancelar reserva', style: 'destructive', onPress: () => run('cancel', () => cancelReservation(r), 'Reserva cancelada.') },
    ]);

  return (
    <Screen>
      <QRTicket reservation={r} />
      {pending > 0 && (
        <Card>
          <Banner tone="danger" text={`Valor por pagar: ${formatMoney(pending)}`} />
          <AppButton title="Pagar agora" icon="card-outline" variant="success" loading={busy === 'pay'} onPress={() => run('pay', () => payPending(r), 'Pagamento efetuado.')} />
        </Card>
      )}
      <Card title="Detalhes" icon="information-circle-outline" right={<StatusBadge status={r.status} />}>
        <InfoRow label="Tipo" value={KIND_LABEL[r.kind]} />
        <InfoRow label="Parque" value={r.parkName} />
        <InfoRow label="Lugar" value={r.spotCode} strong />
        <InfoRow label={r.kind === 'avenca' ? 'Válida desde' : 'Entrada'} value={formatDateTime(r.start.toDate())} />
        <InfoRow label={r.kind === 'avenca' ? 'Válida até' : 'Saída'} value={end ? formatDateTime(end) : 'Livre (pago à saída)'} />
        {r.status === 'no_parque' && lastEntry && <InfoRow label="No parque há" value={formatDuration(now.getTime() - lastEntry.in.toMillis())} />}
        {r.status === 'reservada' && end && r.kind === 'antecipada' && r.start.toDate() > now && (
          <InfoRow label="Começa em" value={formatDuration(r.start.toMillis() - now.getTime())} />
        )}
        {runningCost !== null && <InfoRow label="Custo até agora" value={formatMoney(runningCost)} strong />}
        <InfoRow label="Total pago" value={formatMoney(totalPaid(r.payments))} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        {canEdit && (
          <AppButton title="Alterar reserva" icon="create-outline" variant="secondary" onPress={() => navigation.navigate('Reserve', { kind: 'antecipada', reservationId: r.id })} />
        )}
        {canRenew && <AppButton title="Renovar avença" icon="refresh-outline" variant="secondary" loading={busy === 'renew'} onPress={confirmRenew} />}
        {canCancel && <AppButton title="Cancelar reserva" icon="close-circle-outline" variant="danger" loading={busy === 'cancel'} onPress={confirmCancel} />}
        {r.kind === 'imediata' && r.status !== 'concluida' && (
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Os lugares pedidos na hora não podem ser alterados.</Text>
        )}
      </View>

      <Card title="Pagamentos" icon="wallet-outline">
        <PaymentList payments={r.payments} />
      </Card>
      {r.entries.length > 0 && (
        <Card title="Entradas e saídas" icon="swap-horizontal-outline">
          {r.entries
            .slice()
            .reverse()
            .map((e, i) => (
              <InfoRow key={i} label={formatDateTime(e.in.toDate())} value={e.out ? `saiu ${formatDateTime(e.out.toDate())}` : 'no parque'} />
            ))}
        </Card>
      )}
    </Screen>
  );
}
