import * as fb from 'firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { localBackend } from './local';
import { isLocalMode } from './mode';

/**
 * Ponto único de acesso à base de dados. Exporta as funções do Firestore
 * usadas pela app; no modo local são substituídas pelas da base de dados
 * local (src/data/local/store.ts), que tem a mesma API. Os serviços, hooks e
 * ecrãs não sabem qual das duas está a ser usada.
 */

const local = isLocalMode ? localBackend().api : null;
const pick = <K extends keyof typeof fb>(name: K): (typeof fb)[K] =>
  (local && name in local ? (local as unknown as Record<string, unknown>)[name] : fb[name]) as (typeof fb)[K];

export const db: fb.Firestore = local ? (local.db as unknown as fb.Firestore) : firebaseDb();

export const collection = pick('collection');
export const doc = pick('doc');
export const query = pick('query');
export const where = pick('where');
export const getDoc = pick('getDoc');
export const getDocs = pick('getDocs');
export const setDoc = pick('setDoc');
export const updateDoc = pick('updateDoc');
export const deleteDoc = pick('deleteDoc');
export const writeBatch = pick('writeBatch');
export const runTransaction = pick('runTransaction');
export const onSnapshot = pick('onSnapshot');
export const serverTimestamp = pick('serverTimestamp');
export const increment = pick('increment');
export const arrayUnion = pick('arrayUnion');
export const arrayRemove = pick('arrayRemove');

export { Timestamp } from 'firebase/firestore';
export type { DocumentData, DocumentReference, DocumentSnapshot, Query, QueryDocumentSnapshot, WriteBatch } from 'firebase/firestore';
