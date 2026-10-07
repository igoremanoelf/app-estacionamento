import { Timestamp, increment, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Park, Payment, Reservation, StayEntry } from '../types';
import { EXIT_TOLERANCE } from '../utils/alerts';
import { formatDateTime, formatMoney, isWithinOpeningHours, MINUTE } from '../utils/dates';
import { computeHourlyAmount } from '../utils/pricing';
import { parseQrPayload } from '../utils/token';
import { refs } from './firestore';
import { makePayment } from './reservations';
import { sendPushToUser } from './notifications';

/** Antecedência máxima com que um veículo pode entrar numa marcação antecipada. */
export const EARLY_ENTRY = 15 * MINUTE;

export interface GateResult {
  action: 'entrada' | 'saida';
  reservationId: string;
  plate: string;
  spotCode: string;
  message: string;
  charge: number;
}

export class GateError extends Error {}

/**
 * Processa a leitura de um QR Code na cancela (feita pelo segurança/gestor).
 * Num único transaction: valida a reserva, regista entrada/saída, atualiza o
 * estado do lugar, o registo de veículos do parque e calcula valores a pagar.
 */
export async function processGateScan(data: string, park: Park, now = new Date()): Promise<GateResult> {
  const parsed = parseQrPayload(data);
  if (!parsed) throw new GateError('QR Code inválido: não pertence a este sistema.');

  const result = await runTransaction(db, async (tx) => {
    const resSnap = await tx.get(refs.reservation(parsed.reservationId));
    if (!resSnap.exists()) throw new GateError('Reserva não encontrada.');
    const r = { id: resSnap.id, ...resSnap.data() } as Reservation;
    if (r.qrToken !== parsed.token) throw new GateError('QR Code inválido ou adulterado.');
    if (r.parkId !== park.id) throw new GateError(`Esta reserva é do parque "${r.parkName}".`);
    if (r.status === 'cancelada') throw new GateError('Reserva cancelada.');
    if (r.status === 'concluida') throw new GateError('Reserva já terminada. O QR Code já não é válido.');

    const spotRef = refs.spot(park.id, r.spotId);
    const spotSnap = await tx.get(spotRef);
    const vehicleRef = refs.vehicle(park.id, r.plate);
    const vehicleSnap = await tx.get(vehicleRef);
    const nowTs = Timestamp.fromDate(now);
    const start = r.start.toDate();
    const end = r.end?.toDate() ?? null;

    if (r.status === 'reservada') {
      // ---------- ENTRADA ----------
      if (!isWithinOpeningHours(now, park)) throw new GateError(`Parque fechado (${park.openTime} - ${park.closeTime}).`);
      if (!spotSnap.exists() || !spotSnap.data().active) throw new GateError(`O lugar ${r.spotCode} está desativado. Contacte o gestor.`);
      if (r.kind === 'antecipada' && now.getTime() < start.getTime() - EARLY_ENTRY) {
        throw new GateError(`Ainda é cedo: a reserva começa a ${formatDateTime(start)}.`);
      }
      if (r.kind === 'avenca' && now < start) throw new GateError(`A avença só é válida a partir de ${formatDateTime(start)}.`);
      if (end && now > end) throw new GateError('O período da reserva já terminou.');

      const entries: StayEntry[] = [...r.entries, { in: nowTs, out: null }];
      tx.update(refs.reservation(r.id), { status: 'no_parque', entries, updatedAt: nowTs });
      tx.set(refs.booking(park.id, r.id), { spotId: r.spotId, start: r.start, end: r.end, status: 'no_parque' });
      tx.update(spotRef, { occupied: true });
      if (vehicleSnap.exists()) {
        tx.update(vehicleRef, { lastSeen: nowTs, visits: increment(1), lastUserId: r.userId, lastUserName: r.userName, vehicleType: r.vehicleType });
      } else {
        tx.set(vehicleRef, {
          plate: r.plate,
          vehicleType: r.vehicleType,
          lastUserId: r.userId,
          lastUserName: r.userName,
          visits: 1,
          firstSeen: nowTs,
          lastSeen: nowTs,
        });
      }
      return { r, result: { action: 'entrada', reservationId: r.id, plate: r.plate, spotCode: r.spotCode, charge: 0, message: `Entrada registada. Dirija-se ao lugar ${r.spotCode}.` } as GateResult };
    }

    // ---------- SAÍDA ----------
    const entries = [...r.entries];
    const last = entries[entries.length - 1];
    const entryTime = last?.in.toDate() ?? start;
    if (last) entries[entries.length - 1] = { ...last, out: nowTs };
    const payments: Payment[] = [...r.payments];
    let charge = 0;
    let newEnd = r.end;
    let status: Reservation['status'] = 'concluida';

    if (r.kind === 'imediata') {
      charge = computeHourlyAmount(entryTime, now, r.vehicleType, park.prices);
      payments.push(makePayment('saida', charge, 'pendente', 'Estacionamento'));
      newEnd = nowTs;
    } else if (end && now.getTime() > end.getTime() + (r.kind === 'antecipada' ? EXIT_TOLERANCE : 0)) {
      charge = computeHourlyAmount(end, now, r.vehicleType, park.prices);
      payments.push(makePayment('excesso', charge, 'pendente', 'Tempo excedido'));
    }
    if (r.kind === 'avenca' && end && now < end) status = 'reservada';

    tx.update(refs.reservation(r.id), { status, entries, payments, end: newEnd, updatedAt: nowTs });
    tx.set(refs.booking(park.id, r.id), { spotId: r.spotId, start: r.start, end: newEnd, status });
    if (spotSnap.exists()) tx.update(spotRef, { occupied: false });
    if (vehicleSnap.exists()) tx.update(vehicleRef, { lastSeen: nowTs });
    const message = charge > 0 ? `Saída registada. Valor a pagar: ${formatMoney(charge)}.` : 'Saída registada. Boa viagem!';
    return { r, result: { action: 'saida', reservationId: r.id, plate: r.plate, spotCode: r.spotCode, charge, message } as GateResult };
  });

  // RFC2: o utente é notificado do valor a pagar quando sai.
  const { r, result: res } = result;
  const body = res.action === 'entrada' ? `Entrada registada no lugar ${res.spotCode} (${res.plate}).` : res.message;
  sendPushToUser(r.userId, res.action === 'entrada' ? 'Bem-vindo ao parque' : 'Saída do parque', body, { reservationId: r.id }).catch(() => {});
  return res;
}
