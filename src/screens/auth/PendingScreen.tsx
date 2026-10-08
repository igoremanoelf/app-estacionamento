import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { LogoMark } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/auth';
import { colors, fonts, shadows, spacing } from '../../theme';

/** Mostrado enquanto a conta aguarda validação (RFG2a) ou se foi bloqueada. */
export function PendingScreen() {
  const { profile } = useAuth();
  const blocked = profile?.status === 'bloqueado';
  const tone = blocked ? colors.danger : colors.warning;
  return (
    <View style={styles.container}>
      <LogoMark size={44} />
      <View style={[styles.halo, { backgroundColor: tone + '1A' }]}>
        <View style={styles.iconWrap}>
          <Ionicons name={blocked ? 'lock-closed' : 'hourglass'} size={40} color={tone} />
        </View>
      </View>
      <Text style={styles.title}>{blocked ? 'Conta bloqueada' : 'Quase lá!'}</Text>
      <Text style={styles.text}>
        {blocked
          ? 'A sua conta foi bloqueada por um gestor. Contacte o parque para mais informações.'
          : `Olá ${profile?.name?.split(' ')[0] ?? ''}, o seu registo foi recebido. Assim que um gestor validar a conta, esta página atualiza sozinha.`}
      </Text>
      {!blocked && (
        <View style={styles.steps}>
          <Step done label="Conta criada" />
          <Step label="Validação pelo gestor do parque" active />
          <Step label="Reservar o primeiro lugar" />
        </View>
      )}
      <AppButton title="Terminar sessão" variant="secondary" icon="log-out-outline" onPress={logout} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, done && { backgroundColor: colors.success, borderColor: colors.success }, active && { borderColor: colors.warning }]}>
        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
        {active && <View style={styles.stepPulse} />}
      </View>
      <Text style={[styles.stepText, (done || active) && { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  halo: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  iconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  title: { fontSize: 26, fontFamily: fonts.extrabold, color: colors.text, textAlign: 'center', letterSpacing: -0.6 },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  steps: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg, gap: spacing.md, ...shadows.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  stepText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSubtle },
});
