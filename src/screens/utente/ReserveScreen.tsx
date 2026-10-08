import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { DateTimeField } from '../../components/DateTimeField';
import { Banner, InfoRow, Loading, Segmented } from '../../components/Misc';
import { ParkMap } from '../../components/ParkMap';
import { Screen } from '../../components/Screen';
import { VehiclePicker } from '../../components/VehiclePicker';
import { useProfile } from '../../context/AuthContext';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useReservation, useSpots } from '../../hooks/data';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage } from '../../services/auth';
import { createReservation, editReservation, quote, validateOpeningHours } from '../../services/reservations';
import type { VehicleType } from '../../types';
import { colors, fonts, spacing } from '../../theme';
import { spotStates } from '../../utils/availability';
import { formatDateTime, formatDuration, formatMoney, HOUR, monthBounds, monthLabel, openingHoursLabel } from '../../utils/dates';
import { isValidPlate } from '../../utils/plate';
import { totalPaid } from '../../utils/pricing';

function defaultStart(): Date {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

/**
 * RFC1 + RFC4: marcação antecipada com escolha do lugar na vista virtual do parque
 * (também usado para alterar uma marcação). RFC3: compra de avença mensal.
 */
export function ReserveScreen({ route, navigation }: RootScreenProps<'Reserve'>) {
  const { kind, reservationId } = route.params;
  const profile = useProfile();
  const editing = useReservation(reservationId);
  const existing = editing.data;
  const parkCtx = useCurrentPark();
  const parkId = existing?.parkId ?? parkCtx.parkId;
  const park = parkCtx.parks.find((p) => p.id === parkId) ?? parkCtx.park;
  const { data: spots, loading } = useSpots(parkId);
  const { data: intervals } = useIntervals(parkId);

  const [vehicle, setVehicle] = useState<{ plate: string; type: VehicleType }>(() => {
    const v = profile.vehicles?.[0];
    return { plate: v?.plate ?? '', type: v?.type ?? 'carro' };
  });
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(() => new Date(defaultStart().getTime() + 2 * HOUR));
  const [month, setMonth] = useState<'atual' | 'seguinte'>('atual');
  const [spotId, setSpotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);

  // pré-preenche no modo de alteração
  useEffect(() => {
    if (!existing) return;
    setVehicle({ plate: existing.plate, type: existing.vehicleType });
    setStart(existing.start.toDate());
    if (existing.end) setEnd(existing.end.toDate());
    setSpotId(existing.spotId);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const period = useMemo(() => {
    if (kind === 'avenca') {
      const now = new Date();
      const m = month === 'atual' ? now.getMonth() : now.getMonth() + 1;
      return monthBounds(now.getFullYear(), m);
    }
    return { start, end };
  }, [kind, month, start, end]);

  const states = useMemo(
    () => spotStates(spots, intervals, { start: period.start, end: period.end, excludeId: existing?.id }),
    [spots, intervals, period, existing?.id],
  );

  // se o lugar escolhido deixar de estar livre (outro utente reservou), limpa a escolha
  useEffect(() => {
    if (spotId && states[spotId] && states[spotId] !== 'livre') setSpotId(null);
  }, [states, spotId]);

  if (loading || !park || (reservationId && editing.loading)) return <Loading />;

  const inside = existing?.status === 'no_parque';
  const spot = spots.find((s) => s.id === spotId) ?? null;
  const price = quote({ park, kind, vehicleType: vehicle.type, start: period.start, end: period.end });
  const paidBefore = existing ? totalPaid(existing.payments.filter((p) => ['reserva', 'alteracao', 'reembolso'].includes(p.kind))) : 0;
  const hoursError = kind === 'antecipada' ? validateOpeningHours(park, period.start, period.end) : null;
  const periodError =
    kind === 'antecipada' && period.end <= period.start
      ? 'A saída tem de ser depois da entrada.'
      : kind === 'antecipada' && !inside && period.start < new Date(Date.now() - 5 * 60_000)
        ? 'A entrada tem de ser no futuro.'
        : hoursError;
  const freeCount = Object.values(states).filter((s) => s === 'livre').length;

  const confirm = async () => {
    if (!isValidPlate(vehicle.plate)) return setPlateError('Matrícula inválida.');
    setPlateError(null);
    if (periodError) return Alert.alert('Período inválido', periodError);
    if (!spot) return Alert.alert('Lugar', 'Escolha um lugar livre no mapa.');
    setBusy(true);
    try {
      if (existing) {
        const diff = await editReservation(existing, park, { start: period.start, end: period.end, spot });
        Alert.alert(
          'Reserva alterada',
          diff > 0 ? `Foi cobrada a diferença de ${formatMoney(diff)}.` : diff < 0 ? `Foi reembolsado ${formatMoney(-diff)}.` : 'Sem alteração de preço.',
        );
        navigation.goBack();
      } else {
        const id = await createReservation({
          park,
          user: profile,
          kind,
          spot,
          plate: vehicle.plate,
          vehicleType: vehicle.type,
          start: period.start,
          end: period.end,
        });
        navigation.replace('ReservationDetail', { id });
        Alert.alert('Reserva confirmada', `Lugar ${spot.code}. Valor pago: ${formatMoney(price)}.`);
      }
    } catch (e) {
      Alert.alert('Não foi possível concluir', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card title="Veículo" icon="car-outline">
        {existing ? (
          <InfoRow label="Matrícula" value={existing.plate} strong />
        ) : (
          <VehiclePicker saved={profile.vehicles ?? []} plate={vehicle.plate} type={vehicle.type} onChange={setVehicle} error={plateError} />
        )}
      </Card>

      <Card title={kind === 'avenca' ? 'Período de vigência' : 'Período'} icon="calendar-outline">
        <Text style={styles.muted}>
          {park.name} · {openingHoursLabel(park)}
        </Text>
        {kind === 'avenca' ? (
          <>
            <Segmented
              value={month}
              onChange={setMonth}
              options={[
                { value: 'atual', label: monthLabel(monthBounds(new Date().getFullYear(), new Date().getMonth()).start) },
                { value: 'seguinte', label: monthLabel(monthBounds(new Date().getFullYear(), new Date().getMonth() + 1).start) },
              ]}
            />
            <Text style={styles.muted}>
              Válida de {formatDateTime(period.start)} a {formatDateTime(period.end)}. Pode entrar e sair as vezes que quiser com o mesmo QR Code.
            </Text>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <DateTimeField
                label="Entrada"
                value={start}
                disabled={inside}
                minimumDate={new Date()}
                onChange={(d) => {
                  setStart(d);
                  if (end <= d) setEnd(new Date(d.getTime() + 2 * HOUR));
                }}
              />
              <DateTimeField label="Saída" value={end} minimumDate={start} onChange={setEnd} />
            </View>
            <Text style={styles.muted}>Duração: {formatDuration(end.getTime() - start.getTime())}</Text>
          </>
        )}
        {!!periodError && <Banner tone="warning" text={periodError} />}
      </Card>

      <Card title="Escolha o lugar" icon="grid-outline" right={<Text style={styles.muted}>{freeCount} livres</Text>}>
        {inside && <Banner text="O veículo está no parque: só pode prolongar a hora de saída." />}
        <ParkMap
          spots={spots}
          states={states}
          selectedId={spotId}
          onlyFreeSelectable
          onSpotPress={inside ? undefined : (s) => setSpotId(s.id)}
        />
      </Card>

      <Card title="Resumo" icon="receipt-outline">
        <InfoRow label="Lugar" value={spot?.code ?? '—'} />
        <InfoRow label={kind === 'avenca' ? 'Preço da avença' : 'Preço'} value={formatMoney(price)} strong />
        {existing && <InfoRow label="Diferença a pagar" value={formatMoney(price - paidBefore)} />}
        <Text style={styles.muted}>
          {kind === 'avenca'
            ? 'Preço fixo mensal.'
            : `${formatMoney(park.prices.hourly[vehicle.type])}/hora, máximo ${formatMoney(park.prices.daily[vehicle.type])} por dia.`}
        </Text>
        <AppButton
          title={existing ? 'Guardar alteração' : 'Confirmar e pagar'}
          icon="checkmark-circle-outline"
          onPress={confirm}
          loading={busy}
          disabled={!spot || !!periodError}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
});
