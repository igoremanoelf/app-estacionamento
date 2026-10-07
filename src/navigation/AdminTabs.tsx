import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCurrentPark } from '../context/ParkContext';
import { useStaffNotifications } from '../hooks/useWatchers';
import { DashboardScreen } from '../screens/gestor/DashboardScreen';
import { StaffParkScreen } from '../screens/gestor/StaffParkScreen';
import { ReservationsScreen } from '../screens/gestor/ReservationsScreen';
import { UsersScreen } from '../screens/gestor/UsersScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import type { AdminTabsParams } from './types';
import { ProfileHeaderButton, tabIcon, tabScreenOptions } from './tabIcon';

const Tab = createBottomTabNavigator<AdminTabsParams>();

export function AdminTabs() {
  const { parkId } = useCurrentPark();
  const { alertCount } = useStaffNotifications(parkId);
  return (
    <Tab.Navigator screenOptions={{ ...tabScreenOptions, headerRight: () => <ProfileHeaderButton /> }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Painel', tabBarIcon: tabIcon('speedometer'), tabBarBadge: alertCount || undefined }}
      />
      <Tab.Screen name="StaffPark" component={StaffParkScreen} options={{ title: 'Lugares', tabBarIcon: tabIcon('grid') }} />
      <Tab.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Reservas', tabBarIcon: tabIcon('list') }} />
      <Tab.Screen name="Accounts" component={UsersScreen} options={{ title: 'Contas', tabBarIcon: tabIcon('people') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Gestão', tabBarIcon: tabIcon('settings') }} />
    </Tab.Navigator>
  );
}
