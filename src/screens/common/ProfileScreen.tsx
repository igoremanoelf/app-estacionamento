import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { HeroHeader, HeroPill } from '../../components/Hero';
import { Avatar, Banner, ListItem } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useProfile } from '../../context/AuthContext';
import { changePassword, errorMessage, logout } from '../../services/auth';
import { pickAndUploadPhoto, removeUserVehicle, updateUserProfile } from '../../services/users';
import { VEHICLE_TYPES } from '../../types';
import { colors, fonts, spacing } from '../../theme';

const ROLE_LABEL = { utente: 'Utente', gestor: 'Segurança / Gestor', admin: 'Administrador' } as const;

/** RFC5 / RFG2b: editar dados pessoais (nome, telemóvel, foto e password). */
export function ProfileScreen() {
  const profile = useProfile();
  const route = useRoute();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone);
  }, [profile.name, profile.phone]);

  const save = async () => {
    if (!name.trim()) return setMsg({ tone: 'danger', text: 'O nome é obrigatório.' });
    if (!/^\+?[0-9 ]{9,15}$/.test(phone.trim())) return setMsg({ tone: 'danger', text: 'Telemóvel inválido.' });
    setSaving(true);
    try {
      await updateUserProfile(profile.id, { name: name.trim(), phone: phone.trim() });
      setMsg({ tone: 'success', text: 'Dados atualizados.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto(profile.id);
      if (url) setMsg({ tone: 'success', text: 'Foto atualizada.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setUploading(false);
    }
  };

  const savePassword = async () => {
    if (pw.next.length < 6) return setMsg({ tone: 'danger', text: 'A nova password deve ter pelo menos 6 caracteres.' });
    if (pw.next !== pw.confirm) return setMsg({ tone: 'danger', text: 'As passwords não coincidem.' });
    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setMsg({ tone: 'success', text: 'Password alterada.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <Screen
      header={
        <HeroHeader>
          <View style={[styles.header, { marginTop: route.name === 'MyProfile' ? 36 : 0 }]}>
            <Pressable onPress={changePhoto} disabled={uploading} style={styles.avatarRing}>
              <Avatar uri={profile.photoURL} name={profile.name} size={96} />
              <View style={styles.camera}>
                <Ionicons name={uploading ? 'hourglass' : 'camera'} size={15} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.muted}>{profile.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <HeroPill>{ROLE_LABEL[profile.role]}</HeroPill>
              <HeroPill tone={profile.status === 'ativo' ? 'success' : 'danger'}>{profile.status === 'ativo' ? 'Conta ativa' : profile.status}</HeroPill>
            </View>
          </View>
        </HeroHeader>
      }
    >
      {!!msg && <Banner tone={msg.tone} text={msg.text} />}

      <Card title="Dados pessoais" icon="person-outline">
        <TextField label="Nome" icon="person-outline" value={name} onChangeText={setName} />
        <TextField label="Telemóvel" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField label="Email" icon="mail-outline" value={profile.email} editable={false} />
        <AppButton title="Guardar" icon="save-outline" onPress={save} loading={saving} />
      </Card>

      {profile.role === 'utente' && (
        <Card title="Os meus veículos" icon="car-outline">
          {(profile.vehicles ?? []).length === 0 && <Text style={styles.hint}>Os veículos são guardados ao fazer uma reserva.</Text>}
          {(profile.vehicles ?? []).map((v) => (
            <ListItem
              key={v.plate}
              icon={VEHICLE_TYPES.find((t) => t.value === v.type)?.icon as keyof typeof Ionicons.glyphMap}
              title={v.plate}
              subtitle={VEHICLE_TYPES.find((t) => t.value === v.type)?.label}
              right={
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Remover veículo', `Remover ${v.plate} da lista?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Remover', style: 'destructive', onPress: () => removeUserVehicle(profile.id, v) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              }
            />
          ))}
        </Card>
      )}

      <Card title="Alterar password" icon="key-outline">
        <TextField label="Password atual" icon="lock-closed-outline" value={pw.current} onChangeText={(t) => setPw((p) => ({ ...p, current: t }))} secureTextEntry />
        <TextField label="Nova password" icon="lock-open-outline" value={pw.next} onChangeText={(t) => setPw((p) => ({ ...p, next: t }))} secureTextEntry />
        <TextField label="Confirmar nova password" icon="shield-checkmark-outline" value={pw.confirm} onChangeText={(t) => setPw((p) => ({ ...p, confirm: t }))} secureTextEntry />
        <AppButton title="Alterar password" variant="secondary" icon="key-outline" onPress={savePassword} loading={pwBusy} />
      </Card>

      <AppButton title="Terminar sessão" variant="danger" icon="log-out-outline" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm },
  avatarRing: { borderRadius: 54, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)', padding: 3, marginBottom: spacing.xs },
  camera: { position: 'absolute', right: 2, bottom: 2, backgroundColor: colors.primary, borderRadius: 15, padding: 7, borderWidth: 2, borderColor: colors.ink },
  name: { fontSize: 22, fontFamily: fonts.extrabold, color: '#fff', letterSpacing: -0.5 },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: -4 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
