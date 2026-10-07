import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/auth';
import { colors, spacing } from '../../theme';

/** Mostrado enquanto a conta aguarda validação (RFG2a) ou se foi bloqueada. */
export function PendingScreen() {
  const { profile } = useAuth();
  const blocked = profile?.status === 'bloqueado';
  return (
    <View style={styles.container}>
      <Ionicons name={blocked ? 'lock-closed' : 'hourglass'} size={64} color={blocked ? colors.danger : colors.warning} />
      <Text style={styles.title}>{blocked ? 'Conta bloqueada' : 'Conta a aguardar validação'}</Text>
      <Text style={styles.text}>
        {blocked
          ? 'A sua conta foi bloqueada por um gestor. Contacte o parque para mais informações.'
          : `Olá ${profile?.name ?? ''}! O seu registo foi recebido. Assim que um gestor validar a conta, esta página atualiza sozinha.`}
      </Text>
      <AppButton title="Terminar sessão" variant="secondary" icon="log-out-outline" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
