import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Campo de texto com ícone, estado de foco e botão para mostrar a password. */
export function TextField({ label, error, icon, style, secureTextEntry, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const disabled = rest.editable === false;
  const tint = error ? colors.danger : focused ? colors.primary : colors.textSubtle;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError, disabled && styles.boxDisabled]}>
        {icon && <Ionicons name={icon} size={19} color={tint} />}
        <TextInput
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, disabled && { color: colors.textMuted }, style]}
          secureTextEntry={secureTextEntry && !reveal}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable hitSlop={10} onPress={() => setReveal((r) => !r)} accessibilityLabel={reveal ? 'Esconder password' : 'Mostrar password'}>
            <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textSubtle} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text, marginLeft: 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: 52,
  },
  boxFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  boxError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  boxDisabled: { opacity: 0.7 },
  input: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: colors.text, paddingVertical: spacing.md },
  error: { color: colors.danger, fontSize: 12, fontFamily: fonts.medium, marginLeft: 2 },
});
