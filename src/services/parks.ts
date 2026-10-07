import { getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Park, Prices, Spot } from '../types';
import { refs } from './firestore';

export async function updateParkSettings(
  parkId: string,
  data: Pick<Park, 'name' | 'address' | 'open24h' | 'openTime' | 'closeTime'>,
): Promise<void> {
  await updateDoc(refs.park(parkId), data);
}

export async function updatePrices(parkId: string, prices: Prices): Promise<void> {
  await updateDoc(refs.park(parkId), { prices });
}

/** Cria `count` lugares numa zona, com códigos sequenciais (ex.: A01, A02, ...). */
export async function addSpots(parkId: string, zone: string, count: number, existing: Spot[]): Promise<void> {
  const z = zone.trim().toUpperCase();
  const inZone = existing.filter((s) => s.zone === z);
  const used = new Set(existing.map((s) => s.code));
  let next = inZone.reduce((m, s) => Math.max(m, Number(s.code.replace(/\D/g, '')) || 0), 0) + 1;
  let order = existing.reduce((m, s) => Math.max(m, s.order), 0) + 1;
  const batch = writeBatch(db);
  for (let i = 0; i < count; i++) {
    let code = `${z}${String(next).padStart(2, '0')}`;
    while (used.has(code)) code = `${z}${String(++next).padStart(2, '0')}`;
    used.add(code);
    const ref = refs.spot(parkId, `${z}-${code}-${Date.now()}-${i}`.replace(/[^A-Za-z0-9-]/g, ''));
    batch.set(ref, { code, zone: z, order: order++, active: true, occupied: false });
    next++;
  }
  await batch.commit();
}

/** RFG1a: editar o estado de um lugar (ativo/desativo, ocupado/desocupado) ou o seu nome. */
export async function updateSpot(parkId: string, spotId: string, data: Partial<Pick<Spot, 'active' | 'occupied' | 'code'>>): Promise<void> {
  await updateDoc(refs.spot(parkId, spotId), data);
}

export async function deleteSpot(parkId: string, spotId: string): Promise<void> {
  const active = await getDocs(query(refs.bookings(parkId), where('spotId', '==', spotId)));
  if (active.docs.some((d) => ['reservada', 'no_parque'].includes(d.data().status))) {
    throw new Error('O lugar tem reservas ativas. Desative-o em vez de o remover.');
  }
  const batch = writeBatch(db);
  batch.delete(refs.spot(parkId, spotId));
  await batch.commit();
}
