import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePark, useParks } from '../hooks/data';
import type { Park } from '../types';
import { useProfile } from './AuthContext';

interface ParkState {
  parkId: string;
  park: Park | null;
  parks: Park[];
  /** só os utentes podem mudar de parque; gestores/admins estão associados a um */
  canSwitch: boolean;
  setParkId: (id: string) => void;
}

const ParkContext = createContext<ParkState | null>(null);
const STORAGE_KEY = 'parksmart:selectedPark';

/** RNF0: a solução suporta vários parques; o utente escolhe em qual quer estacionar. */
export function ParkProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const canSwitch = profile.role === 'utente';
  const [selected, setSelected] = useState(profile.parkId);
  const { data: parks } = useParks();

  useEffect(() => {
    if (!canSwitch) return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => v && setSelected(v))
      .catch(() => {});
  }, [canSwitch]);

  const parkId = canSwitch ? selected : profile.parkId;
  const { data: park } = usePark(parkId);

  const setParkId = (id: string) => {
    setSelected(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  };

  return <ParkContext.Provider value={{ parkId, park, parks, canSwitch, setParkId }}>{children}</ParkContext.Provider>;
}

export function useCurrentPark(): ParkState {
  const ctx = useContext(ParkContext);
  if (!ctx) throw new Error('useCurrentPark fora do ParkProvider');
  return ctx;
}
