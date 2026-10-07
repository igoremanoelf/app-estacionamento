import type { Payment, Prices, VehicleType } from '../types';
import { HOUR } from './dates';

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Preço de uma marcação à hora: cada hora iniciada é cobrada ao preço/hora,
 * com um teto diário por cada bloco de 24h.
 */
export function computeHourlyAmount(start: Date, end: Date, type: VehicleType, prices: Prices): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  const hourly = prices.hourly[type];
  const daily = prices.daily[type];
  const hours = ms / HOUR;
  const fullDays = Math.floor(hours / 24);
  const remainingHours = Math.ceil(hours - fullDays * 24);
  return round2(fullDays * daily + Math.min(remainingHours * hourly, daily));
}

export function monthlyAmount(type: VehicleType, prices: Prices): number {
  return round2(prices.monthly[type]);
}

export function totalPaid(payments: Payment[]): number {
  return round2(payments.filter((p) => p.status === 'pago').reduce((s, p) => s + p.amount, 0));
}

export function totalPending(payments: Payment[]): number {
  return round2(payments.filter((p) => p.status === 'pendente').reduce((s, p) => s + p.amount, 0));
}

export const DEFAULT_PRICES: Prices = {
  hourly: { carro: 1.2, mota: 0.6, carrinha: 1.8 },
  daily: { carro: 12, mota: 6, carrinha: 18 },
  monthly: { carro: 60, mota: 30, carrinha: 90 },
};
