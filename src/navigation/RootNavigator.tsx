import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ParkProvider } from '../context/ParkContext';
import { Loading } from '../components/Misc';
import { colors } from '../theme';
import type { RootStackParams } from './types';
import { UtenteTabs } from './UtenteTabs';
import { GestorTabs } from './GestorTabs';
import { AdminTabs } from './AdminTabs';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { PendingScreen } from '../screens/auth/PendingScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { ReserveScreen } from '../screens/utente/ReserveScreen';
import { WalkInScreen } from '../screens/utente/WalkInScreen';
import { ReservationDetailScreen } from '../screens/utente/ReservationDetailScreen';
import { ManageReservationScreen } from '../screens/gestor/ManageReservationScreen';
import { UserEditScreen } from '../screens/gestor/UserEditScreen';
import { StatsScreen } from '../screens/gestor/StatsScreen';
import { AlertsScreen } from '../screens/gestor/AlertsScreen';
import { ScanScreen } from '../screens/gestor/ScanScreen';
import { CreateAccountScreen } from '../screens/admin/CreateAccountScreen';
import { ParkSettingsScreen } from '../screens/admin/ParkSettingsScreen';
import { PricesScreen } from '../screens/admin/PricesScreen';
import { VehiclesScreen } from '../screens/admin/VehiclesScreen';
import { VehicleHistoryScreen } from '../screens/admin/VehicleHistoryScreen';
import { ResetHistoryScreen } from '../screens/admin/ResetHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParams>();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background } };

/**
 * Navegação principal: um Stack nativo na raiz (ecrãs de detalhe/formulários)
 * com Bottom Tabs diferentes consoante o perfil (utente, gestor, administrador).
 */
export function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Loading label="A carregar..." />;

  const screenOptions = {
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.text },
    headerBackTitle: 'Voltar',
  };

  if (!user || !profile) {
    return (
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (profile.status !== 'ativo') {
    return (
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Pending" component={PendingScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <ParkProvider key={profile.id}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={screenOptions}>
          {profile.role === 'utente' && (
            <Stack.Group>
              <Stack.Screen name="UtenteMain" component={UtenteTabs} options={{ headerShown: false }} />
              <Stack.Screen name="Reserve" component={ReserveScreen} options={({ route }) => ({ title: route.params.reservationId ? 'Alterar reserva' : route.params.kind === 'avenca' ? 'Avença mensal' : 'Nova reserva' })} />
              <Stack.Screen name="WalkIn" component={WalkInScreen} options={{ title: 'Lugar na hora' }} />
              <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'Bilhete' }} />
            </Stack.Group>
          )}
          {profile.role === 'gestor' && <Stack.Screen name="GestorMain" component={GestorTabs} options={{ headerShown: false }} />}
          {profile.role === 'admin' && <Stack.Screen name="AdminMain" component={AdminTabs} options={{ headerShown: false }} />}
          {profile.role !== 'utente' && (
            <Stack.Group>
              <Stack.Screen name="ManageReservation" component={ManageReservationScreen} options={{ title: 'Gerir reserva' }} />
              <Stack.Screen name="UserEdit" component={UserEditScreen} options={{ title: 'Conta' }} />
              <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Estatísticas' }} />
              <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alertas' }} />
              <Stack.Screen name="ScanGate" component={ScanScreen} options={{ title: 'Ler QR Code' }} />
              <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ title: 'Nova conta' }} />
              <Stack.Screen name="ParkSettings" component={ParkSettingsScreen} options={{ title: 'Configurar parque' }} />
              <Stack.Screen name="Prices" component={PricesScreen} options={{ title: 'Preços' }} />
              <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: 'Veículos' }} />
              <Stack.Screen name="VehicleHistory" component={VehicleHistoryScreen} options={({ route }) => ({ title: route.params.plate })} />
              <Stack.Screen name="ResetHistory" component={ResetHistoryScreen} options={{ title: 'Histórico de reservas' }} />
            </Stack.Group>
          )}
          <Stack.Screen name="MyProfile" component={ProfileScreen} options={{ title: 'O meu perfil' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ParkProvider>
  );
}
