import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useProfile } from '../context/AuthContext';
import { useUtenteNotifications } from '../hooks/useWatchers';
import { HomeScreen } from '../screens/utente/HomeScreen';
import { ParkViewScreen } from '../screens/utente/ParkViewScreen';
import { HistoryScreen } from '../screens/utente/HistoryScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import type { UtenteTabsParams } from './types';
import { tabIcon, tabScreenOptions } from './tabIcon';

const Tab = createBottomTabNavigator<UtenteTabsParams>();

export function UtenteTabs() {
  const profile = useProfile();
  useUtenteNotifications(profile.id);
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="ParkView" component={ParkViewScreen} options={{ title: 'Parque', tabBarIcon: tabIcon('grid') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Histórico', tabBarIcon: tabIcon('time') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil', tabBarIcon: tabIcon('person') }} />
    </Tab.Navigator>
  );
}
