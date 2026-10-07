import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Role } from '../types';

export type UtenteTabsParams = {
  Home: undefined;
  ParkView: undefined;
  History: undefined;
  Profile: undefined;
};

export type GestorTabsParams = {
  Dashboard: undefined;
  StaffPark: undefined;
  Scan: undefined;
  Reservations: undefined;
  Users: undefined;
};

export type AdminTabsParams = {
  Dashboard: undefined;
  StaffPark: undefined;
  Reservations: undefined;
  Accounts: undefined;
  Settings: undefined;
};

export type RootStackParams = {
  // autenticação
  Login: undefined;
  Register: undefined;
  Pending: undefined;
  // separadores de cada perfil
  UtenteMain: NavigatorScreenParams<UtenteTabsParams>;
  GestorMain: NavigatorScreenParams<GestorTabsParams>;
  AdminMain: NavigatorScreenParams<AdminTabsParams>;
  // utente
  Reserve: { kind: 'antecipada' | 'avenca'; reservationId?: string };
  WalkIn: undefined;
  ReservationDetail: { id: string };
  // partilhados
  MyProfile: undefined;
  // gestor / administrador
  ManageReservation: { id: string };
  UserEdit: { uid: string };
  CreateAccount: { role: 'gestor' | 'utente' };
  Stats: undefined;
  Alerts: undefined;
  ScanGate: undefined;
  ParkSettings: undefined;
  Prices: undefined;
  Vehicles: undefined;
  VehicleHistory: { plate: string };
  ResetHistory: undefined;
};

export type RootScreenProps<K extends keyof RootStackParams> = NativeStackScreenProps<RootStackParams, K>;

export type UtenteTabProps<K extends keyof UtenteTabsParams> = CompositeScreenProps<
  BottomTabScreenProps<UtenteTabsParams, K>,
  NativeStackScreenProps<RootStackParams>
>;

export type StaffRole = Exclude<Role, 'utente'>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParams {}
  }
}
