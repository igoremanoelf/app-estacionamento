import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { LogoMark } from '../../components/Logo';
import { Banner } from '../../components/Misc';
import { ParkSelector } from '../../components/ParkSelector';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useParks } from '../../hooks/data';
import { errorMessage, registerUtente } from '../../services/auth';
import { colors, fonts, spacing } from '../../theme';

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { data: parks } = useParks();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [parkId, setParkId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return setError('Preencha todos os campos.');
    if (!/^\+?[0-9 ]{9,15}$/.test(form.phone.trim())) return setError('Telemóvel inválido.');
    if (form.password.length < 6) return setError('A password deve ter pelo menos 6 caracteres.');
    if (form.password !== form.confirm) return setError('As passwords não coincidem.');
    const park = parkId ?? parks[0]?.id;
    if (!park) return setError('Escolha um parque.');
    setBusy(true);
    try {
      await registerUtente({ ...form, parkId: park });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={{ paddingTop: insets.top + 56, gap: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <LogoMark size={48} />
          <Text style={styles.h1}>Criar conta</Text>
          <Text style={styles.sub}>Reserve lugares, pague e entre no parque só com o telemóvel.</Text>
        </View>
        <Banner text="Depois do registo, a sua conta tem de ser validada por um gestor do parque." />
        <TextField label="Nome" icon="person-outline" placeholder="Nome e apelido" value={form.name} onChangeText={set('name')} autoComplete="name" />
        <TextField label="Email" icon="mail-outline" placeholder="nome@exemplo.pt" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Telemóvel" icon="call-outline" placeholder="912 345 678" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <ParkSelector parks={parks} value={parkId ?? parks[0]?.id ?? null} onChange={setParkId} label="Parque habitual" />
        <TextField label="Password" icon="lock-closed-outline" placeholder="Mínimo 6 caracteres" value={form.password} onChangeText={set('password')} secureTextEntry />
        <TextField label="Confirmar password" icon="shield-checkmark-outline" value={form.confirm} onChangeText={set('confirm')} secureTextEntry />
        {!!error && <Banner tone="danger" text={error} />}
        <AppButton title="Criar conta" icon="arrow-forward" onPress={submit} loading={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 21, marginTop: -4 },
});
