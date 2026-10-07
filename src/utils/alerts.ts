import type { ParkAlert, Reservation } from '../types';
import { formatDuration, MINUTE } from './dates';
import { totalPending } from './pricing';

/** Tolerância antes de uma reserva antecipada ser considerada "não comparência". */
export const NO_SHOW_TOLERANCE = 30 * MINUTE;
/** Tolerância de saída após o fim da reserva. */
export const EXIT_TOLERANCE = 10 * MINUTE;

/**
 * Situações de incumprimento detetadas pelo sistema a partir das reservas do parque.
 */
export function computeAlerts(reservations: Reservation[], now: Date): ParkAlert[] {
  const alerts: ParkAlert[] = [];
  for (const r of reservations) {
    const start = r.start.toDate();
    const end = r.end?.toDate() ?? null;
    if (r.status === 'reservada' && r.kind === 'antecipada' && now.getTime() > start.getTime() + NO_SHOW_TOLERANCE) {
      alerts.push({
        id: `ns-${r.id}`,
        kind: 'nao_comparencia',
        reservation: r,
        since: start,
        message: `${r.plate} não entrou no lugar ${r.spotCode} (reserva começou há ${formatDuration(now.getTime() - start.getTime())}).`,
      });
    }
    if (r.status === 'no_parque' && end && now.getTime() > end.getTime() + EXIT_TOLERANCE) {
      alerts.push({
        id: `ex-${r.id}`,
        kind: 'excesso_tempo',
        reservation: r,
        since: end,
        message: `${r.plate} excedeu o tempo no lugar ${r.spotCode} em ${formatDuration(now.getTime() - end.getTime())}.`,
      });
    }
    const pending = totalPending(r.payments);
    if (pending > 0 && (r.status === 'concluida' || r.status === 'cancelada')) {
      const last = r.payments.filter((p) => p.status === 'pendente').at(-1);
      alerts.push({
        id: `pp-${r.id}`,
        kind: 'pagamento_pendente',
        reservation: r,
        since: last?.createdAt.toDate() ?? now,
        message: `${r.plate} tem ${pending.toFixed(2)} € por pagar.`,
      });
    }
  }
  return alerts.sort((a, b) => a.since.getTime() - b.since.getTime());
}
