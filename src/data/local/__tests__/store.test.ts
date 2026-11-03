import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Timestamp } from 'firebase/firestore';
import { createLocalAuth } from '../auth';
import { buildSeed, PARK_CENTRAL } from '../seed';
import { createFirestoreApi, deserialize, LocalDb, serialize, type StorageAdapter } from '../store';
import { computeAlerts } from '../../../utils/alerts';
import type { Reservation } from '../../../types';

function memoryStorage(): StorageAdapter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

const tick = () => new Promise((r) => setTimeout(r, 5));

function setup(seed = () => ({})) {
  const db = new LocalDb({ seed });
  return { db, api: createFirestoreApi(db) };
}

test('set/get, update com sentinelas e query com where', async () => {
  const { db, api } = setup();
  const users = api.collection(db, 'users');
  await api.setDoc(api.doc(db, 'users', 'u1'), { name: 'Ana', role: 'utente', vehicles: [], visits: 1 });
  await api.setDoc(api.doc(users, 'u2'), { name: 'Rui', role: 'gestor' });
  await api.updateDoc(api.doc(db, 'users', 'u1'), {
    vehicles: api.arrayUnion({ plate: 'AA-00-AA', type: 'carro' }),
    visits: api.increment(2),
    createdAt: api.serverTimestamp(),
  });
  await api.updateDoc(api.doc(db, 'users', 'u1'), { vehicles: api.arrayUnion({ plate: 'AA-00-AA', type: 'carro' }) });
  const u1 = (await api.getDoc(api.doc(db, 'users', 'u1'))).data()!;
  assert.deepEqual(u1.vehicles, [{ plate: 'AA-00-AA', type: 'carro' }]);
  assert.equal(u1.visits, 3);
  assert.ok(u1.createdAt instanceof Timestamp);

  const gestores = await api.getDocs(api.query(users, api.where('role', '==', 'gestor')));
  assert.deepEqual(gestores.docs.map((d) => d.id), ['u2']);
  const some = await api.getDocs(api.query(users, api.where('role', 'in', ['gestor', 'utente'])));
  assert.equal(some.size, 2);
});

test('doc() sem caminho gera um id automático', () => {
  const { db, api } = setup();
  const a = api.doc(api.collection(db, 'reservations'));
  const b = api.doc(api.collection(db, 'reservations'));
  assert.equal(a.collectionPath, 'reservations');
  assert.notEqual(a.id, b.id);
});

test('writeBatch é atómico: se uma escrita falhar nenhuma é aplicada', async () => {
  const { db, api } = setup();
  const batch = api.writeBatch(db);
  batch.set(api.doc(db, 'parks', 'p1'), { name: 'X' });
  batch.update(api.doc(db, 'parks', 'nao-existe'), { name: 'Y' });
  await assert.rejects(batch.commit(), /não encontrado/);
  assert.equal((await api.getDoc(api.doc(db, 'parks', 'p1'))).exists(), false);
});

test('runTransaction lê e escreve de forma consistente', async () => {
  const { db, api } = setup();
  const ref = api.doc(db, 'parks', 'p1', 'spots', 's1');
  await api.setDoc(ref, { occupied: false });
  const r = await api.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    tx.update(ref, { occupied: !snap.data()!.occupied });
    return 'ok';
  });
  assert.equal(r, 'ok');
  assert.equal((await api.getDoc(ref)).data()!.occupied, true);
});

test('onSnapshot notifica as vistas quando os dados mudam (e só nessa altura)', async () => {
  const { db, api } = setup();
  const seen: number[] = [];
  const unsub = api.onSnapshot(api.query(api.collection(db, 'parks', 'p1', 'spots'), api.where('active', '==', true)), (snap) => {
    seen.push((snap as { size: number }).size);
  });
  await tick();
  await api.setDoc(api.doc(db, 'parks', 'p1', 'spots', 'a'), { active: true });
  await tick();
  await api.setDoc(api.doc(db, 'parks', 'p1', 'spots', 'b'), { active: false }); // não altera o resultado
  await tick();
  unsub();
  await api.setDoc(api.doc(db, 'parks', 'p1', 'spots', 'c'), { active: true });
  await tick();
  assert.deepEqual(seen, [0, 1]);
});

test('persistência: os dados (com datas) sobrevivem a reiniciar a app', async () => {
  const storage = memoryStorage();
  const db1 = new LocalDb({ storage, key: 'k', seed: () => buildSeed() });
  await db1.ready;
  const api1 = createFirestoreApi(db1);
  await api1.updateDoc(api1.doc(db1, 'parks', PARK_CENTRAL), { name: 'Parque Renomeado' });
  await new Promise((r) => setTimeout(r, 200));
  const db2 = new LocalDb({ storage, key: 'k', seed: () => ({}) });
  const api2 = createFirestoreApi(db2);
  const park = (await api2.getDoc(api2.doc(db2, 'parks', PARK_CENTRAL))).data()!;
  assert.equal(park.name, 'Parque Renomeado');
  const r = (await api2.getDoc(api2.doc(db2, 'reservations', 'R0001'))).data()!;
  assert.ok(r.start instanceof Timestamp);
  assert.deepEqual(deserialize(serialize({ c: { d: { t: new Timestamp(10, 5) } } })).c.d.t, new Timestamp(10, 5));
});

test('dados de demonstração geram alertas de cada tipo e lugares ocupados', () => {
  const now = new Date();
  const state = buildSeed(now);
  const reservations = Object.entries(state.reservations).map(([id, r]) => ({ id, ...r }) as Reservation);
  const kinds = new Set(computeAlerts(reservations.filter((r) => r.parkId === PARK_CENTRAL), now).map((a) => a.kind));
  assert.deepEqual([...kinds].sort(), ['excesso_tempo', 'nao_comparencia', 'pagamento_pendente']);
  const occupied = Object.values(state[`parks/${PARK_CENTRAL}/spots`]).filter((s) => s.occupied).length;
  const inside = reservations.filter((r) => r.status === 'no_parque').length;
  assert.equal(occupied, inside);
  // cada reserva tem o espelho público (bookings) com o mesmo estado
  for (const r of reservations) assert.equal(state[`parks/${r.parkId}/bookings`][r.id].status, r.status);
});

test('autenticação local: entrar, registar, mudar password e sessão persistente', async () => {
  const storage = memoryStorage();
  const db = new LocalDb({ storage, key: 'db', seed: () => buildSeed() });
  const auth = createLocalAuth(db, storage, 'sess');
  await assert.rejects(auth.signIn('utente@parque.pt', 'errada'), (e: { code?: string }) => e.code === 'auth/invalid-credential');
  const u = await auth.signIn('UTENTE@parque.pt ', 'demo1234');
  assert.equal(u.uid, 'u-ana');
  await assert.rejects(auth.createAccount('utente@parque.pt', 'abcdef', true), (e: { code?: string }) => e.code === 'auth/email-already-in-use');
  await assert.rejects(auth.createAccount('novo@parque.pt', '123', true), (e: { code?: string }) => e.code === 'auth/weak-password');
  await auth.changePassword('demo1234', 'nova123');
  await auth.signOut();
  await auth.signIn('utente@parque.pt', 'nova123');
  // nova instância (app reaberta) recupera a sessão
  const auth2 = createLocalAuth(db, storage, 'sess');
  await auth2.ready;
  assert.equal(auth2.currentUser?.uid, 'u-ana');
});
