import type { Spot } from '../types';

/** Ocupação de um lugar num intervalo; end === null significa "sem fim previsto". */
export interface SpotInterval {
  id: string;
  spotId: string;
  start: Date;
  end: Date | null;
  status: string;
}

const BLOCKING = new Set(['reservada', 'no_parque']);

export function overlaps(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aE = aEnd ? aEnd.getTime() : Infinity;
  const bE = bEnd ? bEnd.getTime() : Infinity;
  return aStart.getTime() < bE && bStart.getTime() < aE;
}

export function blockingIntervals(intervals: SpotInterval[], excludeId?: string): SpotInterval[] {
  return intervals.filter((i) => BLOCKING.has(i.status) && i.id !== excludeId);
}

/** IDs dos lugares que têm alguma reserva ativa a sobrepor-se ao período pedido. */
export function busySpotIds(intervals: SpotInterval[], start: Date, end: Date | null, excludeId?: string): Set<string> {
  const busy = new Set<string>();
  for (const i of blockingIntervals(intervals, excludeId)) {
    if (overlaps(start, end, i.start, i.end)) busy.add(i.spotId);
  }
  return busy;
}

export function isSpotFree(
  spot: Spot,
  intervals: SpotInterval[],
  start: Date,
  end: Date | null,
  excludeId?: string,
): boolean {
  if (!spot.active) return false;
  return !busySpotIds(intervals, start, end, excludeId).has(spot.id);
}

/**
 * Escolhe um lugar para um pedido imediato (sem hora de saída): entre os lugares
 * ativos, desocupados e sem reserva a decorrer, prefere aquele cuja próxima
 * reserva futura começa mais tarde, para minimizar conflitos.
 */
export function pickSpotForWalkIn(spots: Spot[], intervals: SpotInterval[], now: Date): Spot | null {
  const active = blockingIntervals(intervals);
  let best: { spot: Spot; nextStart: number } | null = null;
  for (const spot of spots) {
    if (!spot.active || spot.occupied) continue;
    const mine = active.filter((i) => i.spotId === spot.id);
    if (mine.some((i) => overlaps(now, new Date(now.getTime() + 1), i.start, i.end))) continue;
    const nextStart = Math.min(...mine.filter((i) => i.start > now).map((i) => i.start.getTime()), Infinity);
    if (!best || nextStart > best.nextStart || (nextStart === best.nextStart && spot.order < best.spot.order)) {
      best = { spot, nextStart };
    }
  }
  return best?.spot ?? null;
}

export type SpotVisualState = 'livre' | 'ocupado' | 'reservado' | 'desativado';

/**
 * Estado de cada lugar para a vista virtual. Sem período, mostra o estado atual;
 * com período, mostra se está livre para esse período.
 */
export function spotStates(
  spots: Spot[],
  intervals: SpotInterval[],
  period?: { start: Date; end: Date | null; excludeId?: string },
  now: Date = new Date(),
): Record<string, SpotVisualState> {
  const result: Record<string, SpotVisualState> = {};
  const busy = period
    ? busySpotIds(intervals, period.start, period.end, period.excludeId)
    : busySpotIds(intervals, now, new Date(now.getTime() + 1));
  const inside = new Set(intervals.filter((i) => i.status === 'no_parque').map((i) => i.spotId));
  for (const s of spots) {
    if (!s.active) result[s.id] = 'desativado';
    else if (period) result[s.id] = busy.has(s.id) ? 'reservado' : 'livre';
    else if (s.occupied || inside.has(s.id)) result[s.id] = 'ocupado';
    else if (busy.has(s.id)) result[s.id] = 'reservado';
    else result[s.id] = 'livre';
  }
  return result;
}
