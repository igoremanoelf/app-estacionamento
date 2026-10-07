import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Loading } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useCurrentPark } from '../../context/ParkContext';
import { errorMessage } from '../../services/auth';
import { updatePrices } from '../../services/parks';
import { VEHICLE_TYPES, type Prices } from '../../types';
import { colors, spacing } from '../../theme';

type Field = keyof Prices;
const FIELDS: { key: Field; label: string }[] = [
  { key: 'hourly', label: 'Por hora' },
  { key: 'daily', label: 'Máx. diário' },
  { key: 'monthly', label: 'Avença' },
];

/** RFA4: alterar preços por hora das marcações e das avenças mensais. */
export function PricesScreen() {
  const { park, parkId } = useCurrentPark();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!park) return;
    const v: Record<string, string> = {};
    for (const f of FIELDS) for (const t of VEHICLE_TYPES) v[`${f.key}.${t.value}`] = String(park.prices[f.key][t.value]).replace('.', ',');
    setValues(v);
  }, [park?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!park) return <Loading />;

  const save = async () => {
    const prices = { hourly: { ...park.prices.hourly }, daily: { ...park.prices.daily }, monthly: { ...park.prices.monthly } } as Prices;
    for (const f of FIELDS) {
      for (const t of VEHICLE_TYPES) {
        const n = Number((values[`${f.key}.${t.value}`] ?? '').replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) return Alert.alert('Erro', `Valor inválido em ${f.label} (${t.label}).`);
        prices[f.key][t.value] = Math.round(n * 100) / 100;
      }
    }
    setBusy(true);
    try {
      await updatePrices(parkId, prices);
      Alert.alert('Preços atualizados', 'Os novos preços aplicam-se às próximas reservas.');
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {VEHICLE_TYPES.map((t) => (
        <Card key={t.value} title={t.label}>
          <View style={styles.row}>
            {FIELDS.map((f) => (
              <View key={f.key} style={{ flex: 1 }}>
                <TextField
                  label={`${f.label} (€)`}
                  keyboardType="decimal-pad"
                  value={values[`${f.key}.${t.value}`] ?? ''}
                  onChangeText={(v) => setValues((s) => ({ ...s, [`${f.key}.${t.value}`]: v }))}
                />
              </View>
            ))}
          </View>
        </Card>
      ))}
      <Text style={styles.muted}>Cada hora iniciada é cobrada ao preço/hora, até ao máximo diário por cada 24h.</Text>
      <AppButton title="Guardar preços" icon="save-outline" onPress={save} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 12 },
});
