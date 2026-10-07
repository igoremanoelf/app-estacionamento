import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Park } from '../types';
import { colors, radius, spacing } from '../theme';
import { openingHoursLabel } from '../utils/dates';

interface Props {
  parks: Park[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
}

/** Seletor de parque (RNF0: vários parques no mesmo sistema). */
export function ParkSelector({ parks, value, onChange, label = 'Parque' }: Props) {
  const [open, setOpen] = useState(false);
  const current = parks.find((p) => p.id === value);
  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Ionicons name="business-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{current?.name ?? 'Escolher parque'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Escolha o parque</Text>
          <FlatList
            data={parks}
            keyExtractor={(p) => p.id}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.option, item.id === value && styles.optionActive]}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <Text style={styles.value}>{item.name}</Text>
                <Text style={styles.label}>
                  {item.address ? `${item.address} · ` : ''}
                  {openingHoursLabel(item)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.label}>Ainda não existem parques configurados.</Text>}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.background, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', gap: spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  option: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, gap: 2 },
  optionActive: { borderColor: colors.primary },
});
