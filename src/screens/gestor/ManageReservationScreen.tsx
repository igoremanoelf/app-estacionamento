import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { KIND_LABEL, StatusBadge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { DateTimeField } from '../../components/DateTimeField';
import { EmptyState, InfoRow, Loading } from '../../components/Misc';
import { PaymentList } from '../../components/PaymentList';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useReservation, useSpots, useUser } from '../../hooks/data';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage } from '../../services/auth';
import { processGateScan } from '../../services/gate';
import { sendPushToUser } from '../../services/notifications';
import { addExtraCharge, cancelReservation, markPaidByStaff, staffUpdateReservation } from '../../services/reservations';
import { colors, radius, spacing } from '../../theme';
import { busySpotIds } from '../../utils/availability';
import { formatDateTime, formatMoney, HOUR } from '../../utils/dates';
import { totalPaid, totalPending } from '../../utils/pricing';
import { buildQrPayload } from '../../utils/token';

/** RFG6: gerir uma reserva — alterar período/lugar, emitir pagamentos extra, registar entrada/saída. */
export function ManageReservationScreen({ route }: RootScreenProps<'ManageReservation'>) {
  const { park, parkId } = useCurrentPark();
  const { data: r, loading } = useReservation(route.params.id);
  const { data: owner } = useUser(r?.userId);
  const { data: spots } = useSpots(parkId);
  const { data: intervals } = useIntervals(parkId);
  const [end, setEnd] = useState<Date>(new Date());
  const [spotId, setSpotId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!r) return;
    setEnd(r.end?.toDate() ?? new Date(Date.now() + HOUR));
    setSpotId(r.spotId);
  }, [r?.id, r?.end?.toMillis(), r?.spotId]); // eslint-disable-line react-hooks/exhaustive-deps

  const freeSpots = useMemo(() => {
    if (!r) return [];
    const busy = busySpotIds(intervals, r.start.toDate(), end, r.id);
    return spots.filter((s) => s.active && (!busy.has(s.id) || s.id === r.spotId));
  }, [spots, intervals, r, end]);

  if (loading) return <Loading />;
  if (!r) return <EmptyState title="Reserva não encontrada" />;

  const active = r.status === 'reservada' || r.status === 'no_parque';
  const pending = totalPending(r.payments);

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      Alert.alert('Concluído', done);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const saveChange = () =>
    run(
      'save',
      async () => {
        const spot = spots.find((s) => s.id === spotId);
        await staffUpdateReservation(r, { end: r.kind === 'imediata' ? undefined : end, spot: spot && spot.id !== r.spotId ? spot : undefined });
        sendPushToUser(r.userId, 'Reserva alterada', `A sua reserva (${r.plate}) foi alterada pelo gestor do parque.`).catch(() => {});
      },
      'Reserva alterada.',
    );

  const charge = () =>
    run(
      'charge',
      async () => {
        const value = Number(amount.replace(',', '.'));
        await addExtraCharge(r, value, note.trim());
        sendPushToUser(r.userId, 'Pagamento extra', `Foi emitido um pagamento de ${formatMoney(value)} (${note.trim() || r.plate}).`).catch(() => {});
        setAmount('');
        setNote('');
      },
      'Pagamento extra emitido. O utente foi notificado.',
    );

  const gate = () =>
    park &&
    run('gate', async () => {
      const res = await processGateScan(buildQrPayload(r.id, r.qrToken), park);
      Alert.alert(res.action === 'entrada' ? 'Entrada' : 'Saída', res.message);
    }, r.status === 'no_parque' ? 'Saída registada.' : 'Entrada registada.');

  return (
    <Screen>
      <Card title={`${r.plate} · ${r.spotCode}`} right={<StatusBadge status={r.status} />}>
        <InfoRow label="Tipo" value={KIND_LABEL[r.kind]} />
        <InfoRow label="Utente" value={r.userName} />
        {owner?.phone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${owner.phone}`)}>
            <InfoRow label="Telemóvel" value={owner.phone} />
          </Pressable>
        ) : null}
        <InfoRow label="Entrada" value={formatDateTime(r.start.toDate())} />
        <InfoRow label="Saída" value={r.end ? formatDateTime(r.end.toDate()) : 'Livre'} />
        <InfoRow label="Pago" value={formatMoney(totalPaid(r.payments))} />
        {pending > 0 && <InfoRow label="Por pagar" value={formatMoney(pending)} strong />}
      </Card>

      {active && (
        <AppButton
          title={r.status === 'no_parque' ? 'Registar saída manualmente' : 'Registar entrada manualmente'}
          icon="swap-horizontal-outline"
          loading={busy === 'gate'}
          onPress={gate}
        />
      )}

      {active && (
        <Card title="Alterar reserva">
          {r.kind !== 'imediata' && <DateTimeField label="Nova hora de saída" value={end} minimumDate={r.start.toDate()} onChange={setEnd} />}
          <Text style={styles.label}>Lugar ({freeSpots.length} disponíveis para o período)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {freeSpots.map((s) => (
              <Pressable key={s.id} onPress={() => setSpotId(s.id)} style={[styles.spot, spotId === s.id && styles.spotActive]}>
                <Text style={[styles.spotText, spotId === s.id && { color: '#fff' }]}>{s.code}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <AppButton title="Guardar alterações" icon="save-outline" variant="secondary" loading={busy === 'save'} onPress={saveChange} />
        </Card>
      )}

      <Card title="Emitir pagamento extra">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField label="Valor (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
          </View>
          <View style={{ flex: 2 }}>
            <TextField label="Motivo" value={note} onChangeText={setNote} placeholder="Ex.: ocupação de lugar alheio" />
          </View>
        </View>
        <AppButton title="Emitir" icon="receipt-outline" variant="secondary" loading={busy === 'charge'} onPress={charge} disabled={!amount} />
      </Card>

      <Card title="Pagamentos">
        <PaymentList payments={r.payments} />
        {pending > 0 && (
          <AppButton title="Marcar como pago (recebido na caixa)" variant="success" icon="cash-outline" loading={busy === 'paid'} onPress={() => run('paid', () => markPaidByStaff(r), 'Pagamentos registados.')} />
        )}
      </Card>

      {r.status === 'reservada' && (
        <AppButton
          title="Cancelar reserva"
          variant="danger"
          icon="close-circle-outline"
          loading={busy === 'cancel'}
          onPress={() =>
            Alert.alert('Cancelar reserva', 'Cancelar esta reserva e libertar o lugar?', [
              { text: 'Não', style: 'cancel' },
              {
                text: 'Cancelar',
                style: 'destructive',
                onPress: () =>
                  run(
                    'cancel',
                    async () => {
                      await cancelReservation(r, true);
                      sendPushToUser(r.userId, 'Reserva cancelada', `A reserva do lugar ${r.spotCode} foi cancelada pelo parque.`).catch(() => {});
                    },
                    'Reserva cancelada.',
                  ),
              },
            ])
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  spot: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  spotActive: { backgroundColor: colors.primary },
  spotText: { fontWeight: '700', color: colors.primary },
});
