import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { AppButton } from '../../components/AppButton';
import { useLightStatusBar } from '../../components/Hero';
import { LogoMark } from '../../components/Logo';
import { Banner } from '../../components/Misc';
import { TextField } from '../../components/TextField';
import { isFirebaseConfigured } from '../../config/firebase';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage, login, resetPassword } from '../../services/auth';
import { colors, fonts, gradients, radius, spacing } from '../../theme';

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useLightStatusBar();

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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.ink }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
            <Circle cx="85%" cy="12%" r="150" fill="#3B5BFD" opacity={0.28} />
            <Circle cx="5%" cy="95%" r="110" fill="#2BD9AE" opacity={0.1} />
          </Svg>
          <View style={styles.markWrap}>
            <LogoMark size={76} />
          </View>
          <Text style={styles.brand}>
            Park<Text style={{ color: '#8EA2FF' }}>Smart</Text>
          </Text>
          <Text style={styles.tagline}>Encontre, reserve e entre sem filas.</Text>
        </LinearGradient>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View>
            <Text style={styles.h1}>Bem-vindo de volta</Text>
            <Text style={styles.sub}>Entre com a sua conta para continuar.</Text>
          </View>
          {!isFirebaseConfigured && <Banner tone="warning" text="Firebase não configurado: crie o ficheiro .env a partir de .env.example." />}
          <TextField label="Email" icon="mail-outline" placeholder="nome@exemplo.pt" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TextField label="Password" icon="lock-closed-outline" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          <Pressable onPress={forgot} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: -4 }}>
            <Text style={styles.link}>Esqueci-me da password</Text>
          </Pressable>
          {!!error && <Banner tone="danger" text={error} />}
          <AppButton title="Entrar" icon="arrow-forward" onPress={submit} loading={busy} />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.or}>ainda não tem conta?</Text>
            <View style={styles.orLine} />
          </View>
          <AppButton title="Criar conta de utente" variant="secondary" icon="person-add-outline" onPress={() => navigation.navigate('Register')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 64, paddingHorizontal: spacing.xl, overflow: 'hidden' },
  markWrap: { shadowColor: '#3B5BFD', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12, borderRadius: 22 },
  brand: { fontFamily: fonts.extrabold, fontSize: 34, color: '#fff', letterSpacing: -1, marginTop: spacing.lg },
  tagline: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    marginTop: -32,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  h1: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.text, letterSpacing: -0.6 },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, marginTop: 4 },
  link: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSubtle },
});
