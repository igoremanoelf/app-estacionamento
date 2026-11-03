import { query, where } from '../data/db';
import { useEffect, useMemo, useState } from 'react';
import { refs } from '../services/firestore';
import type { Booking, Park, ParkVehicle, Reservation, Role, Spot, UserProfile } from '../types';
import type { SpotInterval } from '../utils/availability';
import { useDocData, useQueryData } from './useFirestore';

const byStartDesc = (a: Reservation, b: Reservation) => b.start.toMillis() - a.start.toMillis();

export function useParks() {
  return useQueryData<Park>(() => refs.parks(), []);
}

export function usePark(parkId: string | null | undefined) {
  return useDocData<Park>(() => (parkId ? refs.park(parkId) : null), [parkId]);
}

export function useSpots(parkId: string | null | undefined) {
  const res = useQueryData<Spot>(() => (parkId ? refs.spots(parkId) : null), [parkId]);
  const data = useMemo(
    () => [...res.data].sort((a, b) => a.zone.localeCompare(b.zone) || a.order - b.order || a.code.localeCompare(b.code)),
    [res.data],
  );
  return { ...res, data };
}

/** Ocupação pública (sem dados pessoais) usada para calcular disponibilidade. */
export function useIntervals(parkId: string | null | undefined) {
  const res = useQueryData<Booking>(
    () => (parkId ? query(refs.bookings(parkId), where('status', 'in', ['reservada', 'no_parque'])) : null),
    [parkId],
  );
  const data = useMemo<SpotInterval[]>(
    () => res.data.map((b) => ({ id: b.id, spotId: b.spotId, start: b.start.toDate(), end: b.end ? b.end.toDate() : null, status: b.status })),
    [res.data],
  );
  return { ...res, data };
}

export function useParkReservations(parkId: string | null | undefined) {
  const res = useQueryData<Reservation>(() => (parkId ? query(refs.reservations(), where('parkId', '==', parkId)) : null), [parkId]);
  const data = useMemo(() => [...res.data].sort(byStartDesc), [res.data]);
  return { ...res, data };
}

export function useUserReservations(uid: string | null | undefined) {
  const res = useQueryData<Reservation>(() => (uid ? query(refs.reservations(), where('userId', '==', uid)) : null), [uid]);
  const data = useMemo(() => [...res.data].sort(byStartDesc), [res.data]);
  return { ...res, data };
}

export function useReservation(id: string | null | undefined) {
  return useDocData<Reservation>(() => (id ? refs.reservation(id) : null), [id]);
}

export function useUsers(role: Role) {
  const res = useQueryData<UserProfile>(() => query(refs.users(), where('role', '==', role)), [role]);
  const data = useMemo(() => [...res.data].sort((a, b) => a.name.localeCompare(b.name)), [res.data]);
  return { ...res, data };
}

export function useUser(uid: string | null | undefined) {
  return useDocData<UserProfile>(() => (uid ? refs.user(uid) : null), [uid]);
}

export function useParkVehicles(parkId: string | null | undefined) {
  const res = useQueryData<ParkVehicle>(() => (parkId ? refs.vehicles(parkId) : null), [parkId]);
  const data = useMemo(() => [...res.data].sort((a, b) => b.lastSeen.toMillis() - a.lastSeen.toMillis()), [res.data]);
  return { ...res, data };
}

/** Relógio que atualiza periodicamente (contagens decrescentes, alertas, previsões). */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
