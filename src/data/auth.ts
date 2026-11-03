import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { firebaseAuth, getSecondaryAuth } from '../config/firebase';
import { localBackend } from './local';
import { isLocalMode } from './mode';

/**
 * Autenticação com a mesma interface nos dois modos: Firebase Authentication
 * ou contas locais de demonstração (src/data/local/auth.ts).
 */

export interface SessionUser {
  uid: string;
  email: string | null;
}

export interface AuthBackend {
  subscribe(cb: (u: SessionUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Regista e inicia sessão com a conta nova (registo de utente). */
  register(email: string, password: string): Promise<SessionUser>;
  /** Cria uma conta sem mudar a sessão atual (contas criadas pelo administrador). */
  createAccount(email: string, password: string): Promise<SessionUser>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

const toSession = (u: { uid: string; email: string | null } | null): SessionUser | null => (u ? { uid: u.uid, email: u.email } : null);

const firebaseBackend: AuthBackend = {
  subscribe: (cb) => onAuthStateChanged(firebaseAuth(), (u) => cb(toSession(u))),
  signIn: async (email, password) => {
    await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
  },
  signOut: () => signOut(firebaseAuth()),
  sendPasswordReset: (email) => sendPasswordResetEmail(firebaseAuth(), email.trim()),
  register: async (email, password) => toSession((await createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password)).user)!,
  createAccount: async (email, password) => {
    const secondary = getSecondaryAuth();
    try {
      return toSession((await createUserWithEmailAndPassword(secondary, email.trim(), password)).user)!;
    } finally {
      await signOut(secondary);
    }
  },
  changePassword: async (currentPassword, newPassword) => {
    const user = firebaseAuth().currentUser;
    if (!user?.email) throw new Error('Sessão inválida.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);
  },
};

function localAuthBackend(): AuthBackend {
  const a = localBackend().auth;
  return {
    subscribe: (cb) => a.onAuthStateChanged(cb),
    signIn: async (email, password) => {
      await a.signIn(email, password);
    },
    signOut: () => a.signOut(),
    sendPasswordReset: (email) => a.sendPasswordReset(email),
    register: (email, password) => a.createAccount(email, password, true),
    createAccount: (email, password) => a.createAccount(email, password, false),
    changePassword: (c, n) => a.changePassword(c, n),
  };
}

export const authBackend: AuthBackend = isLocalMode ? localAuthBackend() : firebaseBackend;
