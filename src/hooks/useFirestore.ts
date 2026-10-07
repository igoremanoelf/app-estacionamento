import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore';
import { useEffect, useState, type DependencyList } from 'react';
import { fromSnap } from '../services/firestore';

interface State<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscreve uma query do Firestore em tempo real (onSnapshot). É isto que
 * mantém sincronizadas as vistas e os vários utilizadores.
 */
export function useQueryData<T extends { id: string }>(factory: () => Query | null, deps: DependencyList): State<T[]> {
  const [state, setState] = useState<State<T[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = factory();
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => fromSnap<T>(d)), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useDocData<T extends { id: string }>(factory: () => DocumentReference | null, deps: DependencyList): State<T | null> {
  const [state, setState] = useState<State<T | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    const ref = factory();
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? fromSnap<T>(snap) : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
