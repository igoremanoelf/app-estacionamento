import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '../components/Misc';
import { useProfile } from '../context/AuthContext';
import { colors, fonts, shadows } from '../theme';

type IconBase = 'home' | 'grid' | 'time' | 'person' | 'speedometer' | 'qr-code' | 'list' | 'people' | 'settings';

/** Ícone do separador: contorno quando inativo, preenchido numa pílula quando ativo. */
export function tabIcon(name: IconBase) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean; size: number }) {
    return (
      <View style={[styles.pill, focused && styles.pillActive]}>
        <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={color} />
      </View>
    );
  };
}

export const tabScreenOptions: BottomTabNavigationOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSubtle,
  tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    ...shadows.lg,
  },
  tabBarBadgeStyle: { backgroundColor: colors.danger, fontFamily: fonts.bold, fontSize: 10 },
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleAlign: 'left',
  headerTitleStyle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
};

/** Botão do cabeçalho para abrir o perfil (gestor/admin). */
export function ProfileHeaderButton({ light }: { light?: boolean }) {
  const navigation = useNavigation();
  const profile = useProfile();
  return (
    <Pressable onPress={() => navigation.navigate('MyProfile')} hitSlop={12} style={[styles.avatar, light && styles.avatarLight]} accessibilityLabel="O meu perfil">
      <Avatar uri={profile.photoURL} name={profile.name} size={36} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.primaryLight },
  avatar: { marginRight: 16, borderRadius: 20, borderWidth: 2, borderColor: colors.surface },
  avatarLight: { marginRight: 0, borderColor: 'rgba(255,255,255,0.35)' },
});
