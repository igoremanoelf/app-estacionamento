import { collection, db, doc, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot } from '../data/db';

export function fromSnap<T extends { id: string }>(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...(snap.data() as Omit<T, 'id'>) } as T;
}

export const refs = {
  parks: () => collection(db, 'parks'),
  park: (parkId: string) => doc(db, 'parks', parkId),
  spots: (parkId: string) => collection(db, 'parks', parkId, 'spots'),
  spot: (parkId: string, spotId: string) => doc(db, 'parks', parkId, 'spots', spotId),
  bookings: (parkId: string) => collection(db, 'parks', parkId, 'bookings'),
  booking: (parkId: string, id: string) => doc(db, 'parks', parkId, 'bookings', id),
  vehicles: (parkId: string) => collection(db, 'parks', parkId, 'vehicles'),
  vehicle: (parkId: string, plate: string) => doc(db, 'parks', parkId, 'vehicles', plate),
  users: () => collection(db, 'users'),
  user: (uid: string) => doc(db, 'users', uid),
  reservations: () => collection(db, 'reservations'),
  reservation: (id: string) => doc(db, 'reservations', id),
};
