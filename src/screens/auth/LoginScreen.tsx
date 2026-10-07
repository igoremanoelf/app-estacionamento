import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { isFirebaseConfigured } from '../../config/firebase';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage, login, resetPassword } from '../../services/auth';
import { colors, spacing } from '../../theme';

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email || !password) return setError('Preencha o email e a password.');
    setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) return setError('Escreva o seu email para recuperar a password.');
    try {
      await resetPassword(email);
      Alert.alert('Recuperar password', 'Enviámos um email com instruções.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="car-sport" size={44} color="#fff" />
          </View>
          <Text style={styles.title}>ParkSmart</Text>
          <Text style={styles.subtitle}>Estacionamento inteligente</Text>
        </View>
        {!isFirebaseConfigured && <Banner tone="warning" text="Firebase não configurado: crie o ficheiro .env a partir de .env.example." />}
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        {!!error && <Banner tone="danger" text={error} />}
        <AppButton title="Entrar" icon="log-in-outline" onPress={submit} loading={busy} />
        <AppButton title="Criar conta de utente" variant="secondary" onPress={() => navigation.navigate('Register')} />
        <AppButton title="Esqueci-me da password" variant="ghost" onPress={forgot} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 80 },
  hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  logo: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginTop: spacing.md },
  subtitle: { color: colors.textMuted },
});
