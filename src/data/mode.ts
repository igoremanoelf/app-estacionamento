/**
 * Origem dos dados da app:
 *  - "local"    (por omissão) — base de dados local no dispositivo, com dados de
 *               demonstração (entrega "Componentes"). Não precisa de Firebase.
 *  - "firebase" — Cloud Firestore + Firebase Authentication (entrega "Backend").
 *
 * Define-se no .env com EXPO_PUBLIC_DATA_MODE=local | firebase.
 */
export type DataMode = 'local' | 'firebase';

export const DATA_MODE: DataMode = process.env.EXPO_PUBLIC_DATA_MODE === 'firebase' ? 'firebase' : 'local';

export const isLocalMode = DATA_MODE === 'local';
