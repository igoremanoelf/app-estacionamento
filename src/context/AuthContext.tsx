import { onAuthStateChanged, type User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../config/firebase';
import { fromSnap, refs } from '../services/firestore';
import { registerPushToken } from '../services/notifications';
import type { UserProfile } from '../types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  /** true enquanto não se sabe se há sessão ou enquanto o perfil carrega */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      unsubProfile = undefined;
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      setState({ user, profile: null, loading: true });
      // o perfil é ouvido em tempo real: validação da conta, alteração de dados, etc.
      unsubProfile = onSnapshot(
        refs.user(user.uid),
        (snap) => setState({ user, profile: snap.exists() ? fromSnap<UserProfile>(snap) : null, loading: !snap.exists() }),
        () => setState({ user, profile: null, loading: false }),
      );
      registerPushToken(user.uid);
    });
    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** Para ecrãs que só existem com sessão iniciada. */
export function useProfile(): UserProfile {
  const { profile } = useContext(AuthContext);
  if (!profile) throw new Error('useProfile usado sem sessão iniciada');
  return profile;
}
