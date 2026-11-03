import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocalAuth } from './auth';
import { buildSeed } from './seed';
import { createFirestoreApi, LocalDb } from './store';

/**
 * Instância única da base de dados local da app, persistida com AsyncStorage.
 * Só é criada no modo local (ver src/data/mode.ts).
 */
const STORAGE_KEY = 'parksmart:local:db:v1';

let instance: ReturnType<typeof create> | null = null;

function create() {
  const db = new LocalDb({ storage: AsyncStorage, key: STORAGE_KEY, seed: () => buildSeed(), notifyDelayMs: 60 });
  const api = createFirestoreApi(db);
  const auth = createLocalAuth(db, AsyncStorage);
  return { db, api, auth };
}

export function localBackend() {
  return (instance ??= create());
}

/** Apaga tudo o que foi feito na app e volta aos dados de demonstração. */
export async function resetLocalData(): Promise<void> {
  const { db, auth } = localBackend();
  await auth.reset();
  await db.reset();
}
