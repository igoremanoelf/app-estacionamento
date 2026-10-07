import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { refs } from './firestore';

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/** RFC0: registo de um utente. Fica "pendente" até ser validado por um gestor (RFG2a). */
export async function registerUtente(data: { name: string; email: string; phone: string; password: string; parkId: string }): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
  await setDoc(refs.user(cred.user.uid), {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    photoURL: null,
    role: 'utente',
    status: 'pendente',
    parkId: data.parkId,
    vehicles: [],
    createdAt: serverTimestamp(),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Sessão inválida.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Email inválido.',
  'auth/invalid-credential': 'Email ou password incorretos.',
  'auth/wrong-password': 'Password incorreta.',
  'auth/user-not-found': 'Conta não encontrada.',
  'auth/email-already-in-use': 'Já existe uma conta com este email.',
  'auth/weak-password': 'A password deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiadas tentativas. Tente mais tarde.',
  'auth/network-request-failed': 'Sem ligação à internet.',
  'auth/requires-recent-login': 'Volte a iniciar sessão para alterar a password.',
  'permission-denied': 'Não tem permissão para esta operação.',
};

export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code];
  if (e instanceof Error) return e.message;
  return 'Ocorreu um erro inesperado.';
}
