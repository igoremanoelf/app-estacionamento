import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Park } from '../types';
import { colors, fonts, radius, shadows, spacing } from '../theme';
import { IconChip } from './Misc';
import { openingHoursLabel } from '../utils/dates';

interface Props {
  parks: Park[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
  /** estilo translúcido para usar sobre o HeroHeader */
  dark?: boolean;
}

/** Seletor de parque (RNF0: vários parques no mesmo sistema). */
export function ParkSelector({ parks, value, onChange, label = 'Parque', dark }: Props) {
  const [open, setOpen] = useState(false);
  const current = parks.find((p) => p.id === value);
  return (
    <>
      <Pressable style={[styles.field, dark && styles.fieldDark]} onPress={() => setOpen(true)}>
        <IconChip name="business" size={38} color={dark ? '#fff' : colors.primary} background={dark ? 'rgba(255,255,255,0.14)' : colors.primaryLight} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, dark && { color: 'rgba(255,255,255,0.6)' }]}>{label}</Text>
          <Text style={[styles.value, dark && { color: '#fff' }]}>{current?.name ?? 'Escolher parque'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={dark ? 'rgba(255,255,255,0.7)' : colors.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
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
                <IconChip name="location" size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.value}>{item.name}</Text>
                  <Text style={styles.label}>
                    {item.address ? `${item.address} · ` : ''}
                    {openingHoursLabel(item)}
                  </Text>
                </View>
                {item.id === value && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
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
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  fieldDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowOpacity: 0, elevation: 0 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  value: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,21,51,0.45)' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
  sheet: { backgroundColor: colors.background, padding: spacing.lg, paddingBottom: spacing.xxl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '65%', gap: spacing.md },
  sheetTitle: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: 'transparent', ...shadows.sm },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
