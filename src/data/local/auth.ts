import type { LocalDb, StorageAdapter } from './store';
import { autoId, CollectionRef, DocRef, Query } from './store';

/**
 * Autenticação local (modo de demonstração). As credenciais ficam na coleção
 * "_accounts" da base de dados local e a sessão atual é guardada no
 * dispositivo, por isso continua iniciada depois de fechar a app.
 *
 * Os erros usam os mesmos códigos do Firebase Auth (auth/...), para que os
 * ecrãs mostrem as mesmas mensagens nos dois modos.
 *
 * Nota: as passwords ficam em texto simples porque são apenas dados de
 * demonstração guardados no próprio telemóvel; no modo Firebase quem trata
 * das credenciais é o Firebase Authentication.
 */

export interface SessionUser {
  uid: string;
  email: string | null;
}

class AuthError extends Error {
  constructor(
    public code: string,
    message = code,
  ) {
    super(message);
  }
}

const ACCOUNTS = '_accounts';

export function createLocalAuth(db: LocalDb, storage?: StorageAdapter, sessionKey = 'parksmart:local:session') {
  let current: SessionUser | null = null;
  const subscribers = new Set<(u: SessionUser | null) => void>();

  const ready = (async () => {
    await db.ready;
    try {
      const uid = storage ? await storage.getItem(sessionKey) : null;
      if (uid) {
        const acc = await db.getDoc(new DocRef(ACCOUNTS, uid));
        if (acc.exists()) current = { uid, email: (acc.data()!.email as string) ?? null };
      }
    } catch {
      current = null;
    }
  })();

  function setCurrent(u: SessionUser | null) {
    current = u;
    if (storage) (u ? storage.setItem(sessionKey, u.uid) : storage.removeItem(sessionKey)).catch(() => {});
    subscribers.forEach((cb) => cb(u));
  }

  async function findByEmail(email: string) {
    const all = await db.getDocs(new Query(new CollectionRef(ACCOUNTS), []));
    return all.docs.find((d) => (d.data()!.email as string) === email.trim().toLowerCase());
  }

  function validate(email: string, password: string) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new AuthError('auth/invalid-email');
    if (password.length < 6) throw new AuthError('auth/weak-password');
  }

  return {
    ready,
    get currentUser(): SessionUser | null {
      return current;
    },

    onAuthStateChanged(cb: (u: SessionUser | null) => void): () => void {
      subscribers.add(cb);
      ready.then(() => subscribers.has(cb) && cb(current));
      return () => {
        subscribers.delete(cb);
      };
    },

    async signIn(email: string, password: string): Promise<SessionUser> {
      await ready;
      const acc = await findByEmail(email);
      if (!acc || acc.data()!.password !== password) throw new AuthError('auth/invalid-credential');
      const u = { uid: acc.id, email: acc.data()!.email as string };
      setCurrent(u);
      return u;
    },

    async signOut(): Promise<void> {
      await ready;
      setCurrent(null);
    },

    /** Cria uma conta. Com `signIn` a nova conta fica com a sessão iniciada (registo). */
    async createAccount(email: string, password: string, signIn: boolean): Promise<SessionUser> {
      await ready;
      validate(email, password);
      if (await findByEmail(email)) throw new AuthError('auth/email-already-in-use');
      const uid = autoId();
      const normalized = email.trim().toLowerCase();
      await db.commit([{ kind: 'set', ref: new DocRef(ACCOUNTS, uid), data: { email: normalized, password }, merge: false }]);
      const u = { uid, email: normalized };
      if (signIn) setCurrent(u);
      return u;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      await ready;
      if (!current) throw new AuthError('auth/requires-recent-login');
      const ref = new DocRef(ACCOUNTS, current.uid);
      const acc = await db.getDoc(ref);
      if (!acc.exists() || acc.data()!.password !== currentPassword) throw new AuthError('auth/wrong-password');
      if (newPassword.length < 6) throw new AuthError('auth/weak-password');
      await db.commit([{ kind: 'update', ref, data: { password: newPassword } }]);
    },

    async sendPasswordReset(email: string): Promise<void> {
      await ready;
      if (!(await findByEmail(email))) throw new AuthError('auth/user-not-found');
      throw new Error('No modo local não são enviados emails. As contas de demonstração usam a password indicada no ecrã de entrada.');
    },

    /** Usado ao repor os dados de demonstração. */
    async reset(): Promise<void> {
      setCurrent(null);
    },
  };
}

export type LocalAuth = ReturnType<typeof createLocalAuth>;
