import { useState } from 'react';
import { Alert } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Banner, InfoRow } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { VehiclePicker } from '../../components/VehiclePicker';
import { useProfile } from '../../context/AuthContext';
import { useCurrentPark } from '../../context/ParkContext';
import { useIntervals, useNow, useSpots } from '../../hooks/data';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage } from '../../services/auth';
import { createReservation } from '../../services/reservations';
import type { VehicleType } from '../../types';
import { pickSpotForWalkIn } from '../../utils/availability';
import { formatMoney, isWithinOpeningHours, openingHoursLabel } from '../../utils/dates';
import { isValidPlate } from '../../utils/plate';

/** RFC2: pedido de lugar no momento da entrada. O lugar é atribuído pelo sistema. */
export function WalkInScreen({ navigation }: RootScreenProps<'WalkIn'>) {
  const profile = useProfile();
  const { park, parkId } = useCurrentPark();
  const { data: spots } = useSpots(parkId);
  const { data: intervals } = useIntervals(parkId);
  const now = useNow();
  const [vehicle, setVehicle] = useState<{ plate: string; type: VehicleType }>(() => ({
    plate: profile.vehicles?.[0]?.plate ?? '',
    type: profile.vehicles?.[0]?.type ?? 'carro',
  }));
  const [busy, setBusy] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);

  const open = park ? isWithinOpeningHours(now, park) : false;
  const candidate = pickSpotForWalkIn(spots, intervals, now);

  const request = async () => {
    if (!park) return;
    if (!isValidPlate(vehicle.plate)) return setPlateError('Matrícula inválida.');
    setPlateError(null);
    setBusy(true);
    try {
      const spot = pickSpotForWalkIn(spots, intervals, new Date());
      if (!spot) throw new Error('O parque está lotado neste momento.');
      const id = await createReservation({
        park,
        user: profile,
        kind: 'imediata',
        spot,
        plate: vehicle.plate,
        vehicleType: vehicle.type,
        start: new Date(),
        end: null,
      });
      navigation.replace('ReservationDetail', { id });
      Alert.alert('Lugar atribuído', `Dirija-se ao lugar ${spot.code}. Mostre o QR Code na cancela.`);
    } catch (e) {
      Alert.alert('Não foi possível atribuir lugar', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {park && (
        <Card title={park.name} icon="location-outline">
          <InfoRow label="Horário" value={openingHoursLabel(park)} />
          <InfoRow label="Lugares disponíveis" value={candidate ? 'Sim' : 'Parque lotado'} />
          <InfoRow label="Preço" value={`${formatMoney(park.prices.hourly[vehicle.type])}/hora`} />
        </Card>
      )}
      {!open && <Banner tone="danger" text="O parque está fechado neste momento." />}
      <Card title="Veículo" icon="car-outline">
        <VehiclePicker saved={profile.vehicles ?? []} plate={vehicle.plate} type={vehicle.type} onChange={setVehicle} error={plateError} />
      </Card>
      <Banner tone="warning" text="O lugar é atribuído automaticamente e não pode ser alterado. O valor é calculado e notificado quando sair." />
      <AppButton title="Pedir lugar" icon="flash-outline" onPress={request} loading={busy} disabled={!open || !candidate} />
    </Screen>
  );
}
