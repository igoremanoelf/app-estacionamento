import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCurrentPark } from '../context/ParkContext';
import { useStaffNotifications } from '../hooks/useWatchers';
import { DashboardScreen } from '../screens/gestor/DashboardScreen';
import { StaffParkScreen } from '../screens/gestor/StaffParkScreen';
import { ScanScreen } from '../screens/gestor/ScanScreen';
import { ReservationsScreen } from '../screens/gestor/ReservationsScreen';
import { UsersScreen } from '../screens/gestor/UsersScreen';
import type { GestorTabsParams } from './types';
import { ProfileHeaderButton, tabIcon, tabScreenOptions } from './tabIcon';

const Tab = createBottomTabNavigator<GestorTabsParams>();

export function GestorTabs() {
  const { parkId } = useCurrentPark();
  const { alertCount } = useStaffNotifications(parkId);
  return (
    <Tab.Navigator screenOptions={{ ...tabScreenOptions, headerRight: () => <ProfileHeaderButton /> }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Painel', headerShown: false, tabBarIcon: tabIcon('speedometer'), tabBarBadge: alertCount || undefined }}
      />
      <Tab.Screen name="StaffPark" component={StaffParkScreen} options={{ title: 'Lugares', tabBarIcon: tabIcon('grid') }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Ler QR', tabBarIcon: tabIcon('qr-code') }} />
      <Tab.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Reservas', tabBarIcon: tabIcon('list') }} />
      <Tab.Screen name="Users" component={UsersScreen} options={{ title: 'Utentes', tabBarIcon: tabIcon('people') }} />
    </Tab.Navigator>
  );
}
