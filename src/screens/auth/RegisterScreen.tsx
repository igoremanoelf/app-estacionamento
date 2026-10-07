import { useState } from 'react';
import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Misc';
import { ParkSelector } from '../../components/ParkSelector';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useParks } from '../../hooks/data';
import { errorMessage, registerUtente } from '../../services/auth';

export function RegisterScreen() {
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
    <Screen>
      <Banner text="Depois do registo, a sua conta tem de ser validada por um gestor do parque." />
      <TextField label="Nome" value={form.name} onChangeText={set('name')} autoComplete="name" />
      <TextField label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
      <TextField label="Telemóvel" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <ParkSelector parks={parks} value={parkId ?? parks[0]?.id ?? null} onChange={setParkId} label="Parque habitual" />
      <TextField label="Password" value={form.password} onChangeText={set('password')} secureTextEntry />
      <TextField label="Confirmar password" value={form.confirm} onChangeText={set('confirm')} secureTextEntry />
      {!!error && <Banner tone="danger" text={error} />}
      <AppButton title="Criar conta" icon="person-add-outline" onPress={submit} loading={busy} />
    </Screen>
  );
}
