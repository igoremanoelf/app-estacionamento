import { useMemo, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { DateTimeField } from '../../components/DateTimeField';
import { Banner, InfoRow } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { useParkReservations } from '../../hooks/data';
import { errorMessage } from '../../services/auth';
import { resetHistory } from '../../services/reservations';
import { colors } from '../../theme';
import { addDays, formatDate, startOfDay } from '../../utils/dates';

/** RFA5: gerir o histórico de reservas (reset). */
export function ResetHistoryScreen() {
  const { parkId } = useCurrentPark();
  const { data } = useParkReservations(parkId);
  const [useDate, setUseDate] = useState(true);
  const [before, setBefore] = useState(() => startOfDay(addDays(new Date(), -30)));
  const [busy, setBusy] = useState(false);

  const finished = useMemo(() => data.filter((r) => r.status === 'concluida' || r.status === 'cancelada'), [data]);
  const affected = useMemo(() => finished.filter((r) => !useDate || r.createdAt.toDate() < before), [finished, useDate, before]);

  const reset = () =>
    Alert.alert(
      'Reset do histórico',
      `Apagar definitivamente ${affected.length} reserva(s) terminada(s)${useDate ? ` criadas antes de ${formatDate(before)}` : ''}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const n = await resetHistory(parkId, useDate ? before : undefined);
              Alert.alert('Concluído', `${n} reserva(s) apagada(s).`);
            } catch (e) {
              Alert.alert('Erro', errorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <Card title="Histórico">
        <InfoRow label="Reservas no total" value={String(data.length)} />
        <InfoRow label="Ativas (nunca apagadas)" value={String(data.length - finished.length)} />
        <InfoRow label="Concluídas / canceladas" value={String(finished.length)} />
      </Card>
      <Card title="Reset">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Apenas anteriores a uma data</Text>
          <Switch value={useDate} onValueChange={setUseDate} />
        </View>
        {useDate && <DateTimeField label="Apagar reservas criadas antes de" mode="date" value={before} onChange={(d) => setBefore(startOfDay(d))} />}
        <Banner tone="warning" text={`Serão apagadas ${affected.length} reserva(s). O registo de veículos mantém-se.`} />
        <AppButton title="Apagar histórico" variant="danger" icon="trash-outline" onPress={reset} loading={busy} disabled={affected.length === 0} />
      </Card>
    </Screen>
  );
}
