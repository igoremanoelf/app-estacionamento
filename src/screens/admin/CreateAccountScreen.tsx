import { useState } from 'react';
import { Alert } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useProfile } from '../../context/AuthContext';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage } from '../../services/auth';
import { createAccountByAdmin } from '../../services/users';

/** RFG0 / RFA2: o administrador regista seguranças/gestores (e, se necessário, utentes). */
export function CreateAccountScreen({ route, navigation }: RootScreenProps<'CreateAccount'>) {
  const { role } = route.params;
  const me = useProfile();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return setError('Preencha todos os campos.');
    if (form.password.length < 6) return setError('A password deve ter pelo menos 6 caracteres.');
    setBusy(true);
    try {
      await createAccountByAdmin({ ...form, role, parkId: me.parkId });
      Alert.alert('Conta criada', `${form.name} já pode iniciar sessão.`);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Banner text={role === 'gestor' ? 'A conta de segurança/gestor fica associada a este parque e ativa de imediato.' : 'A conta de utente fica ativa de imediato.'} />
      <TextField label="Nome" value={form.name} onChangeText={set('name')} />
      <TextField label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
      <TextField label="Telemóvel" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <TextField label="Password inicial" value={form.password} onChangeText={set('password')} secureTextEntry />
      {!!error && <Banner tone="danger" text={error} />}
      <AppButton title="Criar conta" icon="person-add-outline" onPress={submit} loading={busy} />
    </Screen>
  );
}
