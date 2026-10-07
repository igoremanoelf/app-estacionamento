import {
  Timestamp,
  arrayUnion,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Park, Payment, PaymentKind, PaymentStatus, Reservation, ReservationKind, Spot, UserProfile, VehicleType } from '../types';
import { busySpotIds, type SpotInterval } from '../utils/availability';
import { isWithinOpeningHours, monthBounds } from '../utils/dates';
import { normalizePlate } from '../utils/plate';
import { computeHourlyAmount, monthlyAmount, totalPaid } from '../utils/pricing';
import { randomToken } from '../utils/token';
import { refs } from './firestore';

export function makePayment(kind: PaymentKind, amount: number, status: PaymentStatus, note?: string): Payment {
  const now = Timestamp.now();
  return {
    id: randomToken(8),
    kind,
    amount: Math.round(amount * 100) / 100,
    status,
    ...(note ? { note } : {}),
    createdAt: now,
    paidAt: status === 'pago' ? now : null,
  };
}

/** Mantém o espelho público da reserva (parks/{parkId}/bookings) sincronizado. */
function writeBooking(batch: WriteBatch, r: Pick<Reservation, 'id' | 'parkId' | 'spotId' | 'start' | 'end' | 'status'>) {
  batch.set(refs.booking(r.parkId, r.id), { spotId: r.spotId, start: r.start, end: r.end, status: r.status });
}

export async function fetchIntervals(parkId: string): Promise<SpotInterval[]> {
  const snap = await getDocs(query(refs.bookings(parkId), where('status', 'in', ['reservada', 'no_parque'])));
  return snap.docs.map((d) => {
    const b = d.data();
    return { id: d.id, spotId: b.spotId, start: b.start.toDate(), end: b.end ? b.end.toDate() : null, status: b.status };
  });
}

export function validateOpeningHours(park: Park, start: Date, end: Date | null): string | null {
  if (park.open24h) return null;
  if (!isWithinOpeningHours(start, park)) return `A entrada tem de ser dentro do horário (${park.openTime} - ${park.closeTime}).`;
  if (end && !isWithinOpeningHours(end, park)) return `A saída tem de ser dentro do horário (${park.openTime} - ${park.closeTime}).`;
  return null;
}

export interface NewReservationInput {
  park: Park;
  user: UserProfile;
  kind: ReservationKind;
  spot: Spot;
  plate: string;
  vehicleType: VehicleType;
  start: Date;
  end: Date | null;
}

export function quote(input: Pick<NewReservationInput, 'park' | 'kind' | 'vehicleType' | 'start' | 'end'>): number {
  if (input.kind === 'avenca') return monthlyAmount(input.vehicleType, input.park.prices);
  if (input.kind === 'antecipada' && input.end) return computeHourlyAmount(input.start, input.end, input.vehicleType, input.park.prices);
  return 0; // imediata: o valor é calculado à saída
}

/**
 * RFC1 / RFC2 / RFC3: cria uma marcação antecipada, um pedido imediato ou uma avença.
 * O pagamento online é simulado (marcado como pago) para marcações antecipadas e avenças.
 */
export async function createReservation(input: NewReservationInput): Promise<string> {
  const { park, user, kind, spot, start, end } = input;
  const plate = normalizePlate(input.plate);
  if (kind !== 'imediata' && (!end || end <= start)) throw new Error('A data de saída tem de ser posterior à de entrada.');
  if (kind === 'antecipada') {
    const err = validateOpeningHours(park, start, end);
    if (err) throw new Error(err);
  }
  if (kind === 'imediata' && !isWithinOpeningHours(start, park)) throw new Error('O parque está fechado neste momento.');
  if (!spot.active) throw new Error('O lugar escolhido está desativado.');

  const intervals = await fetchIntervals(park.id);
  if (busySpotIds(intervals, start, end).has(spot.id) || (kind === 'imediata' && spot.occupied)) {
    throw new Error(`O lugar ${spot.code} já não está livre para esse período. Escolha outro.`);
  }

  const mine = await getDocs(query(refs.reservations(), where('userId', '==', user.id)));
  const clash = mine.docs
    .map((d) => d.data() as Reservation)
    .find(
      (r) =>
        r.parkId === park.id &&
        r.plate === plate &&
        (r.status === 'reservada' || r.status === 'no_parque') &&
        (r.end === null || r.end.toDate() > start) &&
        r.start.toDate() < (end ?? new Date(8.64e15)),
    );
  if (clash) throw new Error(`O veículo ${plate} já tem uma reserva neste parque para esse período (lugar ${clash.spotCode}).`);

  const amount = quote(input);
  const payments: Payment[] = [];
  if (kind === 'antecipada') payments.push(makePayment('reserva', amount, 'pago'));
  if (kind === 'avenca') payments.push(makePayment('avenca', amount, 'pago'));

  const ref = doc(refs.reservations());
  const now = Timestamp.now();
  const data: Omit<Reservation, 'id'> = {
    parkId: park.id,
    parkName: park.name,
    userId: user.id,
    userName: user.name,
    kind,
    spotId: spot.id,
    spotCode: spot.code,
    plate,
    vehicleType: input.vehicleType,
    start: Timestamp.fromDate(start),
    end: end ? Timestamp.fromDate(end) : null,
    status: 'reservada',
    qrToken: randomToken(20),
    payments,
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
  const batch = writeBatch(db);
  batch.set(ref, data);
  writeBooking(batch, { id: ref.id, ...data });
  if (!(user.vehicles ?? []).some((v) => v.plate === plate)) {
    batch.update(refs.user(user.id), { vehicles: arrayUnion({ plate, type: input.vehicleType }) });
  }
  await batch.commit();
  return ref.id;
}

/**
 * RFC1: o utente altera uma marcação antecipada até à data de saída, desde que
 * o lugar (novo ou atual) continue vago. A diferença de preço é cobrada/reembolsada.
 */
export async function editReservation(r: Reservation, park: Park, change: { start: Date; end: Date; spot: Spot }): Promise<number> {
  if (r.kind !== 'antecipada') throw new Error('Só as marcações antecipadas podem ser alteradas.');
  if (r.status !== 'reservada' && r.status !== 'no_parque') throw new Error('Esta reserva já não pode ser alterada.');
  const now = new Date();
  if (r.end && r.end.toDate() <= now) throw new Error('A data de saída já passou.');
  const inside = r.status === 'no_parque';
  const start = inside ? r.start.toDate() : change.start;
  if (inside && change.spot.id !== r.spotId) throw new Error('Não é possível mudar de lugar com o veículo dentro do parque.');
  if (change.end <= start) throw new Error('A data de saída tem de ser posterior à de entrada.');
  if (change.end <= now) throw new Error('A data de saída tem de ser no futuro.');
  const err = validateOpeningHours(park, start, change.end);
  if (err) throw new Error(err);

  const intervals = await fetchIntervals(park.id);
  if (!change.spot.active || busySpotIds(intervals, start, change.end, r.id).has(change.spot.id)) {
    throw new Error(`O lugar ${change.spot.code} não está vago para o novo período.`);
  }

  const newAmount = computeHourlyAmount(start, change.end, r.vehicleType, park.prices);
  const alreadyPaid = totalPaid(r.payments.filter((p) => ['reserva', 'alteracao', 'reembolso'].includes(p.kind)));
  const diff = Math.round((newAmount - alreadyPaid) * 100) / 100;
  const payments = [...r.payments];
  if (diff > 0) payments.push(makePayment('alteracao', diff, 'pago', 'Diferença pela alteração da reserva'));
  if (diff < 0) payments.push(makePayment('reembolso', diff, 'pago', 'Reembolso pela alteração da reserva'));

  const updated = {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(change.end),
    spotId: change.spot.id,
    spotCode: change.spot.code,
    payments,
    updatedAt: Timestamp.now(),
  };
  const batch = writeBatch(db);
  batch.update(refs.reservation(r.id), updated);
  writeBooking(batch, { ...r, ...updated });
  await batch.commit();
  return diff;
}

/** Cancelamento pelo utente (antes de entrar). Reembolsa se for antes do início. */
export async function cancelReservation(r: Reservation, byStaff = false): Promise<void> {
  if (r.status !== 'reservada') throw new Error('Só é possível cancelar reservas em que o veículo ainda não entrou.');
  if (r.kind === 'avenca' && !byStaff) throw new Error('As avenças não podem ser canceladas pelo utente.');
  const payments = [...r.payments];
  const paid = totalPaid(payments);
  if (paid > 0 && r.start.toDate() > new Date()) payments.push(makePayment('reembolso', -paid, 'pago', 'Reembolso por cancelamento'));
  const updated = { status: 'cancelada' as const, payments, updatedAt: Timestamp.now() };
  const batch = writeBatch(db);
  batch.update(refs.reservation(r.id), updated);
  writeBooking(batch, { ...r, ...updated });
  await batch.commit();
}

/** Pagamento (simulado) dos valores pendentes de uma reserva. */
export async function payPending(r: Reservation): Promise<void> {
  const now = Timestamp.now();
  const payments = r.payments.map((p) => (p.status === 'pendente' ? { ...p, status: 'pago' as const, paidAt: now } : p));
  await updateDoc(refs.reservation(r.id), { payments, updatedAt: now });
}

/** Próximo período de vigência fixo (mês civil) de uma avença. */
export function nextMonthlyPeriod(r: Pick<Reservation, 'end'>, now = new Date()): { start: Date; end: Date } {
  const currentEnd = r.end?.toDate() ?? now;
  const base = currentEnd < now ? now : new Date(currentEnd.getTime() + 1);
  return monthBounds(base.getFullYear(), base.getMonth());
}

/** RFC3: renova a avença para o mês seguinte, mantendo o mesmo QR Code e o mesmo lugar. */
export async function renewMonthly(r: Reservation, park: Park): Promise<{ start: Date; end: Date }> {
  if (r.kind !== 'avenca') throw new Error('Esta reserva não é uma avença.');
  if (r.status === 'cancelada') throw new Error('A avença foi cancelada.');
  const period = nextMonthlyPeriod(r);
  const intervals = await fetchIntervals(park.id);
  if (busySpotIds(intervals, period.start, period.end, r.id).has(r.spotId)) {
    throw new Error(`O lugar ${r.spotCode} já está reservado para esse mês. Compre uma nova avença noutro lugar.`);
  }
  const expired = r.end ? r.end.toDate() < new Date() : false;
  const updated = {
    ...(expired ? { start: Timestamp.fromDate(period.start) } : {}),
    end: Timestamp.fromDate(period.end),
    status: r.status === 'concluida' ? ('reservada' as const) : r.status,
    payments: [...r.payments, makePayment('renovacao', monthlyAmount(r.vehicleType, park.prices), 'pago')],
    updatedAt: Timestamp.now(),
  };
  const batch = writeBatch(db);
  batch.update(refs.reservation(r.id), updated);
  writeBooking(batch, { ...r, ...updated });
  await batch.commit();
  return period;
}

/** RFG6: o gestor altera uma reserva (prolonga, muda de lugar) sem recalcular o preço. */
export async function staffUpdateReservation(
  r: Reservation,
  change: { start?: Date; end?: Date | null; spot?: Spot },
): Promise<void> {
  const start = change.start ?? r.start.toDate();
  const end = change.end === undefined ? r.end?.toDate() ?? null : change.end;
  const spot = change.spot;
  if (end && end <= start) throw new Error('A saída tem de ser posterior à entrada.');
  const intervals = await fetchIntervals(r.parkId);
  const spotId = spot?.id ?? r.spotId;
  if (busySpotIds(intervals, start, end, r.id).has(spotId)) throw new Error('O lugar não está livre para esse período.');
  const updated = {
    start: Timestamp.fromDate(start),
    end: end ? Timestamp.fromDate(end) : null,
    spotId,
    spotCode: spot?.code ?? r.spotCode,
    updatedAt: Timestamp.now(),
  };
  const batch = writeBatch(db);
  batch.update(refs.reservation(r.id), updated);
  writeBooking(batch, { ...r, ...updated });
  if (spot && spot.id !== r.spotId && r.status === 'no_parque') {
    batch.update(refs.spot(r.parkId, r.spotId), { occupied: false });
    batch.update(refs.spot(r.parkId, spot.id), { occupied: true });
  }
  await batch.commit();
}

/** RFG6: emissão de um pagamento extra (fica pendente até o utente pagar). */
export async function addExtraCharge(r: Reservation, amount: number, note: string): Promise<void> {
  if (!(amount > 0)) throw new Error('Indique um valor positivo.');
  await updateDoc(refs.reservation(r.id), {
    payments: [...r.payments, makePayment('extra', amount, 'pendente', note || 'Pagamento extra')],
    updatedAt: Timestamp.now(),
  });
}

/** RFG6: o gestor marca um pagamento pendente como recebido (ex.: pago na caixa). */
export async function markPaidByStaff(r: Reservation): Promise<void> {
  await payPending(r);
}

/**
 * RFA5: reset do histórico. Apaga reservas concluídas/canceladas (opcionalmente
 * só as anteriores a uma data). As reservas ativas nunca são apagadas.
 */
export async function resetHistory(parkId: string, before?: Date): Promise<number> {
  const snap = await getDocs(query(refs.reservations(), where('parkId', '==', parkId)));
  const toDelete = snap.docs.filter((d) => {
    const r = d.data() as Reservation;
    if (r.status !== 'concluida' && r.status !== 'cancelada') return false;
    return !before || r.createdAt.toDate() < before;
  });
  for (let i = 0; i < toDelete.length; i += 200) {
    const batch = writeBatch(db);
    for (const d of toDelete.slice(i, i + 200)) {
      batch.delete(d.ref);
      batch.delete(refs.booking(parkId, d.id));
    }
    await batch.commit();
  }
  return toDelete.length;
}
