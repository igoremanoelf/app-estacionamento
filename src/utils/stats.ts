import type { Reservation, ReservationKind, Spot } from '../types';
import { addDays, formatDate, startOfDay } from './dates';

export interface ParkStats {
  totalSpots: number;
  activeSpots: number;
  occupiedNow: number;
  occupancyRate: number;
  reservedUpcoming: number;
  byKind: Record<ReservationKind, number>;
  revenueTotal: number;
  revenueLast7: { label: string; value: number }[];
  entriesByHour: number[];
  avgStayMinutes: number;
  topSpots: { code: string; count: number }[];
  vehiclesInside: number;
}

export function computeStats(spots: Spot[], reservations: Reservation[], now: Date): ParkStats {
  const activeSpots = spots.filter((s) => s.active).length;
  const occupiedNow = spots.filter((s) => s.active && s.occupied).length;
  const byKind: Record<ReservationKind, number> = { antecipada: 0, imediata: 0, avenca: 0 };
  const entriesByHour = new Array(24).fill(0) as number[];
  const spotCount = new Map<string, number>();
  let revenueTotal = 0;
  let stayTotal = 0;
  let stayCount = 0;

  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const revenueByDay = new Array(7).fill(0) as number[];

  for (const r of reservations) {
    if (r.status !== 'cancelada') byKind[r.kind]++;
    spotCount.set(r.spotCode, (spotCount.get(r.spotCode) ?? 0) + 1);
    for (const p of r.payments) {
      if (p.status !== 'pago') continue;
      revenueTotal += p.amount;
      const paid = (p.paidAt ?? p.createdAt).toDate();
      const idx = Math.floor((startOfDay(paid).getTime() - days[0].getTime()) / 86_400_000);
      if (idx >= 0 && idx < 7) revenueByDay[idx] += p.amount;
    }
    for (const e of r.entries) {
      entriesByHour[e.in.toDate().getHours()]++;
      if (e.out) {
        stayTotal += e.out.toMillis() - e.in.toMillis();
        stayCount++;
      }
    }
  }

  const reservedUpcoming = reservations.filter((r) => r.status === 'reservada' && r.start.toDate() > now).length;
  const vehiclesInside = reservations.filter((r) => r.status === 'no_parque').length;

  return {
    totalSpots: spots.length,
    activeSpots,
    occupiedNow,
    occupancyRate: activeSpots ? occupiedNow / activeSpots : 0,
    reservedUpcoming,
    byKind,
    revenueTotal: Math.round(revenueTotal * 100) / 100,
    revenueLast7: days.map((d, i) => ({ label: formatDate(d).slice(0, 5), value: Math.round(revenueByDay[i] * 100) / 100 })),
    entriesByHour,
    avgStayMinutes: stayCount ? Math.round(stayTotal / stayCount / 60_000) : 0,
    topSpots: [...spotCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, count]) => ({ code, count })),
    vehiclesInside,
  };
}
