import { query, where } from '../data/db';
import { useEffect, useMemo, useRef } from 'react';
import { refs } from '../services/firestore';
import { cancelScheduled, configureNotifications, ensurePermission, notifyLocal, scheduleAt } from '../services/notifications';
import type { Reservation, UserProfile } from '../types';
import { computeAlerts } from '../utils/alerts';
import { formatMoney, formatTime, MINUTE } from '../utils/dates';
import { totalPending } from '../utils/pricing';
import { useNow, useParkReservations, useUserReservations } from './data';
import { useQueryData } from './useFirestore';

/**
 * Notificações do utente geradas a partir das alterações em tempo real das suas
 * reservas (entrada/saída registadas, valor a pagar, alterações do gestor) e
 * lembretes agendados para o fim das reservas.
 */
export function useUtenteNotifications(uid: string) {
  const { data, loading } = useUserReservations(uid);
  const previous = useRef<Map<string, Reservation> | null>(null);

  useEffect(() => {
    configureNotifications();
    ensurePermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    const prev = previous.current;
    const current = new Map(data.map((r) => [r.id, r]));
    previous.current = current;

    for (const r of data) {
      // lembrete 15 min antes do fim de reservas com hora de saída
      const reminderId = `fim-${r.id}`;
      if ((r.status === 'reservada' || r.status === 'no_parque') && r.end && r.kind !== 'avenca') {
        const end = r.end.toDate();
        const old = prev?.get(r.id);
        if (!old || old.end?.toMillis() !== r.end.toMillis() || old.status !== r.status) {
          cancelScheduled(reminderId).then(() =>
            scheduleAt(reminderId, new Date(end.getTime() - 15 * MINUTE), 'A sua reserva está a terminar', `${r.plate} no lugar ${r.spotCode} até às ${formatTime(end)}.`),
          );
        }
      } else if (prev?.get(r.id)?.status !== r.status) {
        cancelScheduled(reminderId);
      }

      if (!prev) continue; // primeira leitura: não notifica o que já existia
      const old = prev.get(r.id);
      if (!old) continue;
      if (old.status !== r.status) {
        if (r.status === 'no_parque') notifyLocal('Entrada registada', `${r.plate} entrou no lugar ${r.spotCode}.`);
        if (old.status === 'no_parque' && r.status !== 'no_parque') notifyLocal('Saída registada', `${r.plate} saiu do parque ${r.parkName}.`);
        if (r.status === 'cancelada') notifyLocal('Reserva cancelada', `A reserva do lugar ${r.spotCode} foi cancelada.`);
      }
      const pendingNow = totalPending(r.payments);
      if (pendingNow > totalPending(old.payments)) {
        notifyLocal('Valor a pagar', `Tem ${formatMoney(pendingNow)} por pagar (${r.plate}).`, { reservationId: r.id });
      }
      if (old.spotId !== r.spotId) notifyLocal('Lugar alterado', `A sua reserva passou para o lugar ${r.spotCode}.`);
      else if (old.end?.toMillis() !== r.end?.toMillis() && r.end && old.status === r.status && r.kind !== 'imediata') {
        notifyLocal('Reserva alterada', `Nova hora de saída: ${formatTime(r.end.toDate())}.`);
      }
    }
  }, [data, loading]);
}

/**
 * RFG6: o gestor/administrador recebe alertas do sistema (incumprimentos) e
 * avisos de novos registos de utentes por validar.
 */
export function useStaffNotifications(parkId: string) {
  const { data: reservations } = useParkReservations(parkId);
  const pendingUsers = useQueryData<UserProfile>(
    () => query(refs.users(), where('status', '==', 'pendente')),
    [],
  );
  const now = useNow(60_000);
  const alerts = useMemo(() => computeAlerts(reservations, now), [reservations, now]);
  const seenAlerts = useRef<Set<string> | null>(null);
  const seenUsers = useRef<Set<string> | null>(null);

  useEffect(() => {
    configureNotifications();
    ensurePermission().catch(() => {});
  }, []);

  useEffect(() => {
    const ids = new Set(alerts.map((a) => a.id));
    if (seenAlerts.current) {
      for (const a of alerts) if (!seenAlerts.current.has(a.id)) notifyLocal('Alerta do parque', a.message);
    }
    seenAlerts.current = ids;
  }, [alerts]);

  useEffect(() => {
    if (pendingUsers.loading) return;
    const mine = pendingUsers.data.filter((u) => u.parkId === parkId && u.role === 'utente');
    if (seenUsers.current) {
      for (const u of mine) if (!seenUsers.current.has(u.id)) notifyLocal('Novo registo', `${u.name} aguarda validação da conta.`);
    }
    seenUsers.current = new Set(mine.map((u) => u.id));
  }, [pendingUsers.data, pendingUsers.loading, parkId]);

  return { alertCount: alerts.length, alerts, pendingUsers: pendingUsers.data.filter((u) => u.parkId === parkId && u.role === 'utente').length };
}
