import { StyleSheet, Text, View } from 'react-native';
import type { AccountStatus, ReservationKind, ReservationStatus } from '../types';
import { colors, radius } from '../theme';

interface Props {
  label: string;
  color: string;
  background: string;
}

export function Badge({ label, color, background }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const STATUS: Record<ReservationStatus, Props> = {
  reservada: { label: 'Reservada', color: colors.primary, background: colors.primaryLight },
  no_parque: { label: 'No parque', color: colors.success, background: colors.successLight },
  concluida: { label: 'Concluída', color: colors.textMuted, background: colors.background },
  cancelada: { label: 'Cancelada', color: colors.danger, background: colors.dangerLight },
};

export const KIND_LABEL: Record<ReservationKind, string> = {
  antecipada: 'Marcação antecipada',
  imediata: 'Lugar na hora',
  avenca: 'Avença mensal',
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge {...STATUS[status]} />;
}

const ACCOUNT: Record<AccountStatus, Props> = {
  pendente: { label: 'Pendente', color: colors.warning, background: colors.warningLight },
  ativo: { label: 'Ativo', color: colors.success, background: colors.successLight },
  bloqueado: { label: 'Bloqueado', color: colors.danger, background: colors.dangerLight },
};

export function AccountBadge({ status }: { status: AccountStatus }) {
  return <Badge {...ACCOUNT[status]} />;
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '700' },
});
