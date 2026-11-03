import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const useStorageForPhotos = process.env.EXPO_PUBLIC_USE_STORAGE === 'true';

/*
 * O Firebase só é inicializado quando é usado (modo "firebase"). No modo local
 * a app nunca chama estas funções, por isso funciona sem .env.
 */
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function firebaseApp(): FirebaseApp {
  return (_app ??= getApps().length ? getApp() : initializeApp(firebaseConfig));
}

export function firebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = firebaseApp();
  if (Platform.OS === 'web') return (_auth = getAuth(app));
  // getReactNativePersistence só existe no bundle "react-native" do firebase/auth,
  // que o Metro resolve automaticamente; os tipos públicos não o declaram.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  try {
    _auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // fast refresh: o auth já foi inicializado
    _auth = getAuth(app);
  }
  return _auth;
}

export function firebaseDb(): Firestore {
  return (_db ??= getFirestore(firebaseApp()));
}

export function firebaseStorage(): FirebaseStorage {
  return (_storage ??= getStorage(firebaseApp()));
}

/**
 * App Firebase secundária usada pelo administrador para criar contas de
 * gestores sem terminar a sua própria sessão (createUserWithEmailAndPassword
 * autentica sempre o utilizador criado na instância onde é chamado).
 */
export function getSecondaryAuth(): Auth {
  const name = 'secondary';
  const secondary = getApps().find((a) => a.name === name) ?? initializeApp(firebaseConfig, name);
  return getAuth(secondary);
}
