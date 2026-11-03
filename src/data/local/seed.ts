import { Timestamp } from 'firebase/firestore';
import type { Park, Payment, PaymentKind, Reservation, ReservationKind, ReservationStatus, Spot, UserProfile, VehicleType } from '../../types';
import { computeHourlyAmount, DEFAULT_PRICES } from '../../utils/pricing';
import { HOUR, MINUTE, DAY, monthBounds } from '../../utils/dates';
import type { DocData } from './store';

/**
 * Dados de demonstração do modo local. São gerados em relação à hora atual,
 * para que a app tenha sempre veículos no parque, reservas futuras, alertas
 * de incumprimento e histórico para as estatísticas.
 */

export const DEMO_PASSWORD = 'demo1234';

/** Contas de demonstração mostradas no ecrã de entrada. */
export const DEMO_ACCOUNTS = [
  { label: 'Utente', email: 'utente@parque.pt', password: DEMO_PASSWORD, icon: 'person-outline' },
  { label: 'Gestor', email: 'gestor@parque.pt', password: DEMO_PASSWORD, icon: 'shield-checkmark-outline' },
  { label: 'Admin', email: 'admin@parque.pt', password: 'admin123', icon: 'settings-outline' },
] as const;

export const PARK_CENTRAL = 'parque-central';
export const PARK_ESTACAO = 'parque-estacao';

type State = Record<string, Record<string, DocData>>;

const ts = (d: Date | number) => Timestamp.fromDate(typeof d === 'number' ? new Date(d) : d);
const strip = <T extends { id: string }>(x: T): DocData => {
  const { id: _id, ...rest } = x;
  return rest as DocData;
};

let tokenSeq = 0;
function token(n: number): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  let x = (++tokenSeq * 7919 + n * 104729) >>> 0;
  for (let i = 0; i < 20; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += A[x % A.length];
  }
  return s;
}

export function buildSeed(now = new Date()): State {
  tokenSeq = 0;
  const state: State = {};
  const put = (path: string, id: string, data: DocData) => {
    (state[path] ??= {})[id] = data;
  };
  const t = now.getTime();
  const created = ts(t - 60 * DAY);

  // ------------------------------------------------------------ parques
  const parks: Park[] = [
    {
      id: PARK_CENTRAL,
      name: 'Parque Central UPB',
      address: 'Av. da Universidade, 1',
      open24h: true,
      openTime: '00:00',
      closeTime: '23:59',
      prices: DEFAULT_PRICES,
      createdAt: created,
    },
    {
      id: PARK_ESTACAO,
      name: 'Parque da Estação',
      address: 'Largo da Estação, 5',
      open24h: false,
      openTime: '07:00',
      closeTime: '23:00',
      prices: {
        hourly: { carro: 1, mota: 0.5, carrinha: 1.5 },
        daily: { carro: 10, mota: 5, carrinha: 15 },
        monthly: { carro: 45, mota: 25, carrinha: 70 },
      },
      createdAt: created,
    },
  ];
  for (const p of parks) put('parks', p.id, strip(p));

  const spots: Record<string, Spot[]> = { [PARK_CENTRAL]: [], [PARK_ESTACAO]: [] };
  const addZone = (parkId: string, zone: string, count: number, inactive: number[] = []) => {
    const list = spots[parkId];
    for (let i = 1; i <= count; i++) {
      const code = `${zone}${String(i).padStart(2, '0')}`;
      const spot: Spot = { id: `${zone}-${code}`, code, zone, order: list.length + 1, active: !inactive.includes(i), occupied: false };
      list.push(spot);
    }
  };
  addZone(PARK_CENTRAL, 'A', 12, [12]);
  addZone(PARK_CENTRAL, 'B', 12, [11]);
  addZone(PARK_ESTACAO, 'P', 10);

  // ------------------------------------------------------------ utilizadores
  const users: (UserProfile & { password: string })[] = [
    { id: 'u-admin', name: 'Administrador', email: 'admin@parque.pt', phone: '910000000', role: 'admin', status: 'ativo', parkId: PARK_CENTRAL, password: 'admin123' },
    { id: 'u-admin-estacao', name: 'Admin Estação', email: 'admin.estacao@parque.pt', phone: '910000009', role: 'admin', status: 'ativo', parkId: PARK_ESTACAO, password: 'admin123' },
    { id: 'u-gestor', name: 'Marta Silva', email: 'gestor@parque.pt', phone: '910000001', role: 'gestor', status: 'ativo', parkId: PARK_CENTRAL, password: DEMO_PASSWORD },
    { id: 'u-gestor2', name: 'Rui Fernandes', email: 'rui@parque.pt', phone: '910000003', role: 'gestor', status: 'ativo', parkId: PARK_CENTRAL, password: DEMO_PASSWORD },
    {
      id: 'u-ana', name: 'Ana Costa', email: 'utente@parque.pt', phone: '912345678', role: 'utente', status: 'ativo', parkId: PARK_CENTRAL, password: DEMO_PASSWORD,
      vehicles: [{ plate: 'AA-00-AA', type: 'carro' }, { plate: '12-AB-34', type: 'mota' }],
    },
    {
      id: 'u-joao', name: 'João Pereira', email: 'joao@parque.pt', phone: '913456789', role: 'utente', status: 'ativo', parkId: PARK_CENTRAL, password: DEMO_PASSWORD,
      vehicles: [{ plate: '45-CD-67', type: 'carro' }],
    },
    {
      id: 'u-sofia', name: 'Sofia Martins', email: 'sofia@parque.pt', phone: '914567890', role: 'utente', status: 'ativo', parkId: PARK_CENTRAL, password: DEMO_PASSWORD,
      vehicles: [{ plate: 'BX-21-ZZ', type: 'carrinha' }],
    },
    {
      id: 'u-tiago', name: 'Tiago Almeida', email: 'tiago@parque.pt', phone: '915678901', role: 'utente', status: 'ativo', parkId: PARK_ESTACAO, password: DEMO_PASSWORD,
      vehicles: [{ plate: '88-TT-88', type: 'carro' }],
    },
    { id: 'u-carlos', name: 'Carlos Ramos', email: 'carlos@parque.pt', phone: '916789012', role: 'utente', status: 'pendente', parkId: PARK_CENTRAL, password: DEMO_PASSWORD, vehicles: [] },
    { id: 'u-beatriz', name: 'Beatriz Lopes', email: 'beatriz@parque.pt', phone: '917890123', role: 'utente', status: 'pendente', parkId: PARK_CENTRAL, password: DEMO_PASSWORD, vehicles: [] },
    { id: 'u-miguel', name: 'Miguel Santos', email: 'miguel@parque.pt', phone: '918901234', role: 'utente', status: 'bloqueado', parkId: PARK_CENTRAL, password: DEMO_PASSWORD, vehicles: [] },
  ];
  for (const { password, ...u } of users) {
    put('users', u.id, strip({ photoURL: null, vehicles: [], pushToken: null, createdAt: created, ...u }));
    put('_accounts', u.id, { email: u.email, password });
  }
  const userById = new Map(users.map((u) => [u.id, u]));

  // ------------------------------------------------------------ reservas
  let paySeq = 0;
  const pay = (kind: PaymentKind, amount: number, at: number, pending = false, note?: string): Payment => ({
    id: `PG${String(++paySeq).padStart(5, '0')}`,
    kind,
    amount: Math.round(amount * 100) / 100,
    status: pending ? 'pendente' : 'pago',
    ...(note ? { note } : {}),
    createdAt: ts(at),
    paidAt: pending ? null : ts(at),
  });

  let resSeq = 0;
  const vehiclesSeen = new Map<string, { parkId: string; plate: string; type: VehicleType; userId: string; first: number; last: number; visits: number }>();

  function reservation(o: {
    parkId?: string;
    userId: string;
    plate: string;
    type: VehicleType;
    kind: ReservationKind;
    spot: string;
    start: number;
    end: number | null;
    status: ReservationStatus;
    entries?: [number, number | null][];
    payments?: Payment[];
  }) {
    const parkId = o.parkId ?? PARK_CENTRAL;
    const park = parks.find((p) => p.id === parkId)!;
    const spot = spots[parkId].find((s) => s.code === o.spot)!;
    const u = userById.get(o.userId)!;
    const id = `R${String(++resSeq).padStart(4, '0')}`;
    const entries = (o.entries ?? []).map(([i, out]) => ({ in: ts(i), out: out === null ? null : ts(out) }));
    const r: Omit<Reservation, 'id'> = {
      parkId,
      parkName: park.name,
      userId: u.id,
      userName: u.name,
      kind: o.kind,
      spotId: spot.id,
      spotCode: spot.code,
      plate: o.plate,
      vehicleType: o.type,
      start: ts(o.start),
      end: o.end === null ? null : ts(o.end),
      status: o.status,
      qrToken: token(resSeq),
      payments: o.payments ?? [],
      entries,
      createdAt: ts(Math.min(o.start, t) - 2 * HOUR),
      updatedAt: ts(Math.min(t, (o.entries?.at(-1)?.[1] ?? o.start) as number)),
    };
    put('reservations', id, r as unknown as DocData);
    put(`parks/${parkId}/bookings`, id, { spotId: r.spotId, start: r.start, end: r.end, status: r.status });
    if (o.status === 'no_parque') spot.occupied = true;
    for (const [i, out] of o.entries ?? []) {
      const key = `${parkId}|${o.plate}`;
      const v = vehiclesSeen.get(key) ?? { parkId, plate: o.plate, type: o.type, userId: u.id, first: i, last: i, visits: 0 };
      v.visits++;
      v.first = Math.min(v.first, i);
      v.last = Math.max(v.last, out ?? i);
      if (i >= v.last || out === null) v.userId = u.id;
      vehiclesSeen.set(key, v);
    }
    return id;
  }

  const P = DEFAULT_PRICES;
  const hourly = (s: number, e: number, type: VehicleType) => computeHourlyAmount(new Date(s), new Date(e), type, P);

  // Ana: marcação antecipada a decorrer (veículo dentro do parque)
  {
    const s = t - 2 * HOUR, e = t + 3 * HOUR;
    reservation({ userId: 'u-ana', plate: 'AA-00-AA', type: 'carro', kind: 'antecipada', spot: 'A03', start: s, end: e, status: 'no_parque', entries: [[s + 5 * MINUTE, null]], payments: [pay('reserva', hourly(s, e, 'carro'), s - 3 * HOUR)] });
  }
  // Ana: avença do mês atual (lugar fixo B01)
  {
    const m = monthBounds(now.getFullYear(), now.getMonth());
    reservation({
      userId: 'u-ana', plate: 'AA-00-AA', type: 'carro', kind: 'avenca', spot: 'B01', start: m.start.getTime(), end: m.end.getTime(), status: 'reservada',
      entries: [[t - 3 * DAY, t - 3 * DAY + 8 * HOUR], [t - 2 * DAY, t - 2 * DAY + 9 * HOUR]],
      payments: [pay('avenca', P.monthly.carro, m.start.getTime())],
    });
  }
  // Ana: mota com reserva para amanhã de manhã
  {
    const d = new Date(t + DAY);
    d.setHours(9, 0, 0, 0);
    const s = d.getTime(), e = s + 3 * HOUR;
    reservation({ userId: 'u-ana', plate: '12-AB-34', type: 'mota', kind: 'antecipada', spot: 'A08', start: s, end: e, status: 'reservada', payments: [pay('reserva', hourly(s, e, 'mota'), t - HOUR)] });
  }
  // João: lugar pedido à entrada, ainda no parque
  {
    const s = t - 75 * MINUTE;
    reservation({ userId: 'u-joao', plate: '45-CD-67', type: 'carro', kind: 'imediata', spot: 'A01', start: s, end: null, status: 'no_parque', entries: [[s, null]] });
  }
  // Sofia: excedeu o tempo (alerta "excesso de tempo")
  {
    const s = t - 4 * HOUR, e = t - 40 * MINUTE;
    reservation({ userId: 'u-sofia', plate: 'BX-21-ZZ', type: 'carrinha', kind: 'antecipada', spot: 'B04', start: s, end: e, status: 'no_parque', entries: [[s + 10 * MINUTE, null]], payments: [pay('reserva', hourly(s, e, 'carrinha'), s - DAY)] });
  }
  // João: reserva que começou há mais de 30 min e o carro não entrou (alerta "não comparência")
  {
    const s = t - 70 * MINUTE, e = t + 2 * HOUR;
    reservation({ userId: 'u-joao', plate: '45-CD-67', type: 'carro', kind: 'antecipada', spot: 'A02', start: s, end: e, status: 'reservada', payments: [pay('reserva', hourly(s, e, 'carro'), s - DAY)] });
  }
  // Sofia: saiu com pagamento extra por pagar (alerta "pagamento pendente")
  {
    const s = t - 2 * DAY - 5 * HOUR, e = s + 3 * HOUR, out = e + 50 * MINUTE;
    reservation({
      userId: 'u-sofia', plate: 'BX-21-ZZ', type: 'carrinha', kind: 'antecipada', spot: 'B05', start: s, end: e, status: 'concluida', entries: [[s, out]],
      payments: [pay('reserva', hourly(s, e, 'carrinha'), s - DAY), pay('excesso', hourly(e, out, 'carrinha'), out, true, 'Tempo excedido')],
    });
  }
  // Reservas futuras de outros utentes (ocupam lugares no mapa de disponibilidade)
  {
    const s = t + 3 * HOUR, e = s + 4 * HOUR;
    reservation({ userId: 'u-sofia', plate: 'BX-21-ZZ', type: 'carrinha', kind: 'antecipada', spot: 'B06', start: s, end: e, status: 'reservada', payments: [pay('reserva', hourly(s, e, 'carrinha'), t - 2 * HOUR)] });
  }
  {
    const s = t + 30 * MINUTE, e = s + 6 * HOUR;
    reservation({ userId: 'u-joao', plate: '45-CD-67', type: 'carro', kind: 'antecipada', spot: 'A05', start: s + DAY, end: e + DAY, status: 'reservada', payments: [pay('reserva', hourly(s, e, 'carro'), t - 30 * MINUTE)] });
  }
  // Cancelada (com reembolso)
  {
    const s = t - 5 * DAY, e = s + 2 * HOUR, paid = hourly(s, e, 'carro');
    reservation({ userId: 'u-joao', plate: '45-CD-67', type: 'carro', kind: 'antecipada', spot: 'A06', start: s, end: e, status: 'cancelada', payments: [pay('reserva', paid, s - 2 * DAY), pay('reembolso', -paid, s - DAY, false, 'Reembolso por cancelamento')] });
  }

  // Histórico dos últimos 14 dias (estatísticas, receita, veículos)
  const history: { userId: string; plate: string; type: VehicleType }[] = [
    { userId: 'u-ana', plate: 'AA-00-AA', type: 'carro' },
    { userId: 'u-joao', plate: '45-CD-67', type: 'carro' },
    { userId: 'u-sofia', plate: 'BX-21-ZZ', type: 'carrinha' },
    { userId: 'u-ana', plate: '12-AB-34', type: 'mota' },
  ];
  const codes = ['A01', 'A04', 'A07', 'A09', 'A10', 'B02', 'B03', 'B07', 'B08', 'B09'];
  for (let i = 0; i < 22; i++) {
    const who = history[i % history.length];
    const day = new Date(t - (1 + (i % 13)) * DAY);
    day.setHours(7 + ((i * 5) % 12), (i * 17) % 60, 0, 0);
    const s = day.getTime();
    const dur = (1 + (i % 5)) * HOUR + (i % 3) * 20 * MINUTE;
    const spot = codes[i % codes.length];
    if (i % 3 === 0) {
      // lugar pedido à entrada: valor calculado e pago à saída
      const amount = hourly(s, s + dur, who.type);
      reservation({ ...who, kind: 'imediata', spot, start: s, end: s + dur, status: 'concluida', entries: [[s, s + dur]], payments: [pay('saida', amount, s + dur, false, 'Estacionamento')] });
    } else {
      const e = s + dur;
      reservation({ ...who, kind: 'antecipada', spot, start: s, end: e, status: 'concluida', entries: [[s + 5 * MINUTE, e - 10 * MINUTE]], payments: [pay('reserva', hourly(s, e, who.type), s - DAY)] });
    }
  }

  // Parque da Estação (RNF0: vários parques)
  {
    const s = t - 3 * DAY, e = s + 5 * HOUR;
    reservation({ parkId: PARK_ESTACAO, userId: 'u-tiago', plate: '88-TT-88', type: 'carro', kind: 'antecipada', spot: 'P03', start: s, end: e, status: 'concluida', entries: [[s, e - 15 * MINUTE]], payments: [pay('reserva', 5, s - DAY)] });
  }

  // ------------------------------------------------------------ lugares e veículos
  for (const [parkId, list] of Object.entries(spots)) for (const s of list) put(`parks/${parkId}/spots`, s.id, strip(s));
  for (const v of vehiclesSeen.values()) {
    const u = userById.get(v.userId)!;
    put(`parks/${v.parkId}/vehicles`, v.plate, {
      plate: v.plate,
      vehicleType: v.type,
      lastUserId: u.id,
      lastUserName: u.name,
      visits: v.visits,
      firstSeen: ts(v.first),
      lastSeen: ts(v.last),
    });
  }
  return state;
}
