import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Banner, Loading } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useCurrentPark } from '../../context/ParkContext';
import { useSpots } from '../../hooks/data';
import { errorMessage } from '../../services/auth';
import { addSpots, deleteSpot, updateParkSettings, updateSpot } from '../../services/parks';
import type { Spot } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { isValidHHMM } from '../../utils/dates';

/** RFA1: nome do parque, espaços úteis (lugares) e horário de funcionamento. */
export function ParkSettingsScreen() {
  const { park, parkId } = useCurrentPark();
  const { data: spots } = useSpots(parkId);
  const [form, setForm] = useState({ name: '', address: '', open24h: true, openTime: '08:00', closeTime: '22:00' });
  const [zone, setZone] = useState('A');
  const [count, setCount] = useState('10');
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Spot | null>(null);
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    if (park) setForm({ name: park.name, address: park.address ?? '', open24h: park.open24h, openTime: park.openTime, closeTime: park.closeTime });
  }, [park?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!park) return <Loading />;

  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await fn();
      if (done) Alert.alert('Concluído', done);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    if (!form.name.trim()) return Alert.alert('Erro', 'O nome é obrigatório.');
    if (!form.open24h && (!isValidHHMM(form.openTime) || !isValidHHMM(form.closeTime))) return Alert.alert('Erro', 'Horas no formato HH:MM.');
    run('save', () => updateParkSettings(parkId, { ...form, name: form.name.trim(), address: form.address.trim() }), 'Parque atualizado.');
  };

  const add = () => {
    const n = Number(count);
    if (!/^[A-Za-z]{1,2}$/.test(zone.trim())) return Alert.alert('Erro', 'A zona deve ser 1 ou 2 letras.');
    if (!Number.isInteger(n) || n < 1 || n > 100) return Alert.alert('Erro', 'Quantidade entre 1 e 100.');
    run('add', () => addSpots(parkId, zone, n, spots), `${n} lugares criados na zona ${zone.toUpperCase()}.`);
  };

  const zones = [...new Set(spots.map((s) => s.zone))];

  return (
    <Screen>
      <Card title="Dados do parque">
        <TextField label="Nome do parque" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
        <TextField label="Morada" value={form.address} onChangeText={(address) => setForm((f) => ({ ...f, address }))} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Aberto 24h/24h</Text>
          <Switch value={form.open24h} onValueChange={(open24h) => setForm((f) => ({ ...f, open24h }))} />
        </View>
        {!form.open24h && (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="Abre (HH:MM)" value={form.openTime} onChangeText={(openTime) => setForm((f) => ({ ...f, openTime }))} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Fecha (HH:MM)" value={form.closeTime} onChangeText={(closeTime) => setForm((f) => ({ ...f, closeTime }))} />
              </View>
            </View>
            <Banner text="Com horário limitado, as reservas só podem começar e acabar dentro deste horário e a cancela recusa entradas com o parque fechado." />
          </>
        )}
        <AppButton title="Guardar" icon="save-outline" onPress={save} loading={busy === 'save'} />
      </Card>

      <Card title="Adicionar lugares">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField label="Zona" value={zone} onChangeText={(t) => setZone(t.toUpperCase())} autoCapitalize="characters" maxLength={2} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Quantidade" value={count} onChangeText={setCount} keyboardType="number-pad" />
          </View>
        </View>
        <AppButton title="Criar lugares" icon="add-circle-outline" variant="secondary" onPress={add} loading={busy === 'add'} />
      </Card>

      <Card title={`Lugares (${spots.length})`}>
        <Text style={styles.muted}>Toque no nome para mudar; o interruptor ativa/desativa o lugar.</Text>
        {zones.map((z) => (
          <View key={z} style={{ gap: spacing.xs }}>
            <Text style={styles.zone}>Zona {z}</Text>
            {spots
              .filter((s) => s.zone === z)
              .map((s) => (
                <View key={s.id} style={styles.spotRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      setRenaming(s);
                      setNewCode(s.code);
                    }}
                  >
                    <Text style={styles.spotCode}>{s.code}</Text>
                  </Pressable>
                  <Switch value={s.active} onValueChange={(active) => run(`t-${s.id}`, () => updateSpot(parkId, s.id, { active }))} />
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert('Remover lugar', `Remover o lugar ${s.code}?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Remover', style: 'destructive', onPress: () => run(`d-${s.id}`, () => deleteSpot(parkId, s.id)) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
          </View>
        ))}
      </Card>

      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <TextField label={`Novo nome para ${renaming?.code}`} value={newCode} onChangeText={(t) => setNewCode(t.toUpperCase())} autoCapitalize="characters" />
            <AppButton
              title="Guardar"
              onPress={() => {
                const s = renaming;
                const code = newCode.trim();
                if (!s || !code) return;
                if (spots.some((x) => x.code === code && x.id !== s.id)) return Alert.alert('Erro', 'Já existe um lugar com esse nome.');
                setRenaming(null);
                run('rename', () => updateSpot(parkId, s.id, { code }));
              }}
            />
            <AppButton title="Cancelar" variant="ghost" onPress={() => setRenaming(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 12 },
  zone: { fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  spotCode: { fontWeight: '700', color: colors.text, fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
