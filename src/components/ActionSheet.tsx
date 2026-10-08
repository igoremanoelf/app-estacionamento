import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
}

/** Folha de ações (o Alert do Android só suporta 3 botões). */
export function ActionSheet({ visible, title, message, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {!!message && <Text style={styles.message}>{message}</Text>}
        {actions.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
            onPress={() => {
              onClose();
              a.onPress();
            }}
          >
            <Text style={[styles.actionText, a.destructive && { color: colors.danger }]}>{a.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.action, styles.cancel]} onPress={onClose}>
          <Text style={[styles.actionText, { color: colors.textMuted }]}>Fechar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,21,51,0.45)' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.sm },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.xxl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: spacing.sm },
  title: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.text },
  message: { color: colors.textMuted, marginBottom: spacing.sm },
  action: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  cancel: { backgroundColor: 'transparent', alignItems: 'center' },
  actionText: { fontSize: 16, fontFamily: fonts.semibold, color: colors.primary },
});
