import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

export function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export const tabScreenOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  headerTitleStyle: { color: colors.text },
};

/** Botão do cabeçalho para abrir o perfil (gestor/admin). */
export function ProfileHeaderButton() {
  const navigation = useNavigation();
  return (
    <Pressable onPress={() => navigation.navigate('MyProfile')} hitSlop={12} style={{ marginRight: 16 }}>
      <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
    </Pressable>
  );
}
