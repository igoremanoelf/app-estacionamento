import type { Timestamp } from 'firebase/firestore';

export type Role = 'utente' | 'gestor' | 'admin';
export type AccountStatus = 'pendente' | 'ativo' | 'bloqueado';
export type VehicleType = 'carro' | 'mota' | 'carrinha';
export type ReservationKind = 'antecipada' | 'imediata' | 'avenca';
/**
 * reservada  -> válida, veículo fora do parque
 * no_parque  -> veículo dentro do parque
 * concluida  -> terminada (saída registada / avença expirada)
 * cancelada  -> anulada pelo utente ou pelo gestor
 */
export type ReservationStatus = 'reservada' | 'no_parque' | 'concluida' | 'cancelada';
export type PaymentKind = 'reserva' | 'alteracao' | 'saida' | 'excesso' | 'extra' | 'avenca' | 'renovacao' | 'reembolso';
export type PaymentStatus = 'pago' | 'pendente';

export const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'carro', label: 'Carro', icon: 'car-sport' },
  { value: 'mota', label: 'Mota', icon: 'bicycle' },
  { value: 'carrinha', label: 'Carrinha', icon: 'bus' },
];

export type PriceTable = Record<VehicleType, number>;

export interface Prices {
  hourly: PriceTable;
  /** teto diário (por cada 24h) para marcações à hora */
  daily: PriceTable;
  monthly: PriceTable;
}

export interface Park {
  id: string;
  name: string;
  address?: string;
  open24h: boolean;
  /** "HH:MM" */
  openTime: string;
  closeTime: string;
  prices: Prices;
  createdAt?: Timestamp;
}

export interface Spot {
  id: string;
  code: string;
  zone: string;
  order: number;
  active: boolean;
  occupied: boolean;
}

export interface UserVehicle {
  plate: string;
  type: VehicleType;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string | null;
  role: Role;
  status: AccountStatus;
  /** parque a que o gestor/admin pertence; para o utente é o parque onde se registou */
  parkId: string;
  vehicles?: UserVehicle[];
  pushToken?: string | null;
  createdAt?: Timestamp;
}

export interface Payment {
  id: string;
  kind: PaymentKind;
  amount: number;
  status: PaymentStatus;
  note?: string;
  createdAt: Timestamp;
  paidAt?: Timestamp | null;
}

export interface StayEntry {
  in: Timestamp;
  out?: Timestamp | null;
}

export interface Reservation {
  id: string;
  parkId: string;
  parkName: string;
  userId: string;
  userName: string;
  kind: ReservationKind;
  spotId: string;
  spotCode: string;
  plate: string;
  vehicleType: VehicleType;
  start: Timestamp;
  /** null = sem hora de saída prevista (lugar pedido à entrada) */
  end: Timestamp | null;
  status: ReservationStatus;
  qrToken: string;
  payments: Payment[];
  entries: StayEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Espelho público (sem dados pessoais) de uma reserva, guardado em
 * parks/{parkId}/bookings/{reservationId}. Permite a qualquer utente
 * calcular os lugares livres sem ler as reservas de outros utentes.
 */
export interface Booking {
  id: string;
  spotId: string;
  start: Timestamp;
  end: Timestamp | null;
  status: ReservationStatus;
}

export interface ParkVehicle {
  id: string; // matrícula
  plate: string;
  vehicleType: VehicleType;
  lastUserId: string;
  lastUserName: string;
  visits: number;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
}

export type AlertKind = 'nao_comparencia' | 'excesso_tempo' | 'pagamento_pendente';

export interface ParkAlert {
  id: string;
  kind: AlertKind;
  reservation: Reservation;
  message: string;
  since: Date;
}
