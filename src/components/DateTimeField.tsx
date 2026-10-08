import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { formatDate, formatDateTime } from '../utils/dates';

interface Props {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode?: 'datetime' | 'date';
  minimumDate?: Date;
  disabled?: boolean;
}

/** Campo de data/hora multiplataforma (diálogos nativos no Android, picker inline no iOS). */
export function DateTimeField({ label, value, onChange, mode = 'datetime', minimumDate, disabled }: Props) {
  const [iosOpen, setIosOpen] = useState(false);

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate,
      onChange: (e: DateTimePickerEvent, date?: Date) => {
        if (e.type !== 'set' || !date) return;
        if (mode === 'date') return onChange(date);
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (e2: DateTimePickerEvent, time?: Date) => {
            if (e2.type !== 'set' || !time) return;
            const d = new Date(date);
            d.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(d);
          },
        });
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => (Platform.OS === 'android' ? openAndroid() : setIosOpen((o) => !o))}
        style={[styles.field, disabled && { opacity: 0.6 }]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.value}>{mode === 'date' ? formatDate(value) : formatDateTime(value)}</Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="inline"
          minimumDate={minimumDate}
          locale="pt-PT"
          onChange={(_e, d) => d && onChange(d)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, flex: 1 },
  label: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: 52,
  },
  value: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold },
});
