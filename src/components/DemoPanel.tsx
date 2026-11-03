import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { resetLocalData } from '../data/local';
import { DEMO_ACCOUNTS } from '../data/local/seed';
import { colors, fonts, radius, spacing } from '../theme';
import { AppButton } from './AppButton';
import { Card } from './Card';

/**
 * Atalhos de entrada com as contas de demonstração (só no modo local).
 * Um toque preenche o email e a password de cada perfil.
 */
export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <Ionicons name="phone-portrait-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.title}>Modo local · contas de demonstração</Text>
      </View>
      <View style={styles.row}>
        {DEMO_ACCOUNTS.map((a) => (
          <Pressable
            key={a.email}
            onPress={() => onPick(a.email, a.password)}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Entrar como ${a.label}`}
          >
            <Ionicons name={a.icon} size={18} color={colors.primary} />
            <Text style={styles.chipText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Os dados ficam guardados neste dispositivo. Password dos utentes e gestores: demo1234.</Text>
    </View>
  );
}

/** Cartão no perfil para repor os dados de demonstração (só no modo local). */
export function DemoResetCard() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await resetLocalData();
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => {
    const msg = 'Apaga as reservas, contas e alterações feitas e volta aos dados iniciais. A sessão é terminada.';
    Alert.alert('Repor dados de demonstração', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Repor', style: 'destructive', onPress: run },
    ]);
  };
  return (
    <Card title="Dados de demonstração" icon="server-outline">
      <Text style={styles.cardText}>
        A app está em modo local: todos os dados (parques, lugares, reservas e contas) estão guardados neste dispositivo.
      </Text>
      <AppButton title="Repor dados iniciais" variant="secondary" icon="refresh-outline" onPress={confirm} loading={busy} />
    </Card>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryDark },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  cardText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
});
