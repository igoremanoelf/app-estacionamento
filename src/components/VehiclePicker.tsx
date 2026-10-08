import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VEHICLE_TYPES, type UserVehicle, type VehicleType } from '../types';
import { colors, fonts, radius, spacing } from '../theme';
import { normalizePlate } from '../utils/plate';
import { TextField } from './TextField';

interface Props {
  saved: UserVehicle[];
  plate: string;
  type: VehicleType;
  onChange: (v: { plate: string; type: VehicleType }) => void;
  error?: string | null;
}

/** Escolha do veículo: atalhos para os veículos já usados + tipo + matrícula. */
export function VehiclePicker({ saved, plate, type, onChange, error }: Props) {
  return (
    <View style={{ gap: spacing.md }}>
      {saved.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {saved.map((v) => {
            const active = normalizePlate(plate) === v.plate;
            return (
              <Pressable key={v.plate} onPress={() => onChange({ plate: v.plate, type: v.type })} style={[styles.chip, active && styles.chipActive]}>
                <Ionicons name={VEHICLE_TYPES.find((t) => t.value === v.type)?.icon as keyof typeof Ionicons.glyphMap} size={16} color={active ? '#fff' : colors.primary} />
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{v.plate}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.types}>
        {VEHICLE_TYPES.map((t) => (
          <Pressable key={t.value} onPress={() => onChange({ plate, type: t.value })} style={[styles.type, type === t.value && styles.typeActive]}>
            <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={22} color={type === t.value ? colors.primary : colors.textMuted} />
            <Text style={[styles.typeText, type === t.value && { color: colors.primary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextField
        label="Matrícula"
        placeholder="AA-00-BB"
        autoCapitalize="characters"
        value={plate}
        onChangeText={(t) => onChange({ plate: t.toUpperCase(), type })}
        onBlur={() => plate && onChange({ plate: normalizePlate(plate), type })}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontFamily: fonts.bold },
  types: { flexDirection: 'row', gap: spacing.sm },
  type: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  typeActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  typeText: { fontFamily: fonts.semibold, color: colors.textMuted },
});
