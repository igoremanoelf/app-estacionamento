import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Spot } from '../../types';
import { busySpotIds, overlaps, pickSpotForWalkIn, spotStates, type SpotInterval } from '../availability';
import { isWithinOpeningHours, monthBounds } from '../dates';
import { normalizePlate } from '../plate';
import { computeHourlyAmount, DEFAULT_PRICES } from '../pricing';
import { buildQrPayload, parseQrPayload } from '../token';

const d = (s: string) => new Date(s);
const spot = (id: string, extra: Partial<Spot> = {}): Spot => ({ id, code: id, zone: 'A', order: Number(id.slice(1)), active: true, occupied: false, ...extra });

describe('preços', () => {
  it('cobra cada hora iniciada', () => {
    assert.equal(computeHourlyAmount(d('2026-10-07T10:00'), d('2026-10-07T11:10'), 'carro', DEFAULT_PRICES), 2.4);
  });
  it('aplica o teto diário', () => {
    assert.equal(computeHourlyAmount(d('2026-10-07T08:00'), d('2026-10-07T23:00'), 'carro', DEFAULT_PRICES), 12);
    assert.equal(computeHourlyAmount(d('2026-10-07T08:00'), d('2026-10-09T09:00'), 'carro', DEFAULT_PRICES), 25.2);
  });
});

describe('disponibilidade', () => {
  const intervals: SpotInterval[] = [
    { id: 'r1', spotId: 'A1', start: d('2026-10-07T10:00'), end: d('2026-10-07T12:00'), status: 'reservada' },
    { id: 'r2', spotId: 'A2', start: d('2026-10-07T09:00'), end: null, status: 'no_parque' },
    { id: 'r3', spotId: 'A3', start: d('2026-10-07T10:00'), end: d('2026-10-07T12:00'), status: 'cancelada' },
  ];
  it('deteta sobreposição, incluindo intervalos sem fim', () => {
    assert.ok(overlaps(d('2026-10-07T11:00'), d('2026-10-07T13:00'), d('2026-10-07T10:00'), d('2026-10-07T12:00')));
    assert.ok(!overlaps(d('2026-10-07T12:00'), d('2026-10-07T13:00'), d('2026-10-07T10:00'), d('2026-10-07T12:00')));
    assert.ok(overlaps(d('2030-01-01T00:00'), d('2030-01-02T00:00'), d('2026-10-07T09:00'), null));
  });
  it('ignora reservas canceladas e a própria reserva', () => {
    const busy = busySpotIds(intervals, d('2026-10-07T11:00'), d('2026-10-07T11:30'), 'r1');
    assert.deepEqual([...busy].sort(), ['A2']);
  });
  it('mostra estado para um período', () => {
    const s = spotStates([spot('A1'), spot('A2'), spot('A3'), spot('A4', { active: false })], intervals, { start: d('2026-10-07T11:00'), end: d('2026-10-07T11:30') });
    assert.deepEqual(s, { A1: 'reservado', A2: 'reservado', A3: 'livre', A4: 'desativado' });
  });
  it('atribui ao pedido imediato o lugar livre mais tempo', () => {
    const now = d('2026-10-07T08:00');
    const picked = pickSpotForWalkIn([spot('A1'), spot('A2'), spot('A3', { occupied: true }), spot('A4')], intervals, now);
    assert.equal(picked?.id, 'A4');
  });
});

describe('outros', () => {
  it('período fixo da avença é o mês civil', () => {
    const { start, end } = monthBounds(2026, 1);
    assert.equal(start.getDate(), 1);
    assert.equal(end.getDate(), 28);
  });
  it('horário de funcionamento', () => {
    const h = { open24h: false, openTime: '08:00', closeTime: '20:00' };
    assert.ok(isWithinOpeningHours(d('2026-10-07T09:00'), h));
    assert.ok(!isWithinOpeningHours(d('2026-10-07T21:00'), h));
    assert.ok(isWithinOpeningHours(d('2026-10-07T01:00'), { open24h: false, openTime: '18:00', closeTime: '02:00' }));
  });
  it('matrículas e QR', () => {
    assert.equal(normalizePlate('aa 12bb'), 'AA-12-BB');
    assert.deepEqual(parseQrPayload(buildQrPayload('abc', 'TOK')), { reservationId: 'abc', token: 'TOK' });
    assert.equal(parseQrPayload('outro:qr'), null);
  });
});
