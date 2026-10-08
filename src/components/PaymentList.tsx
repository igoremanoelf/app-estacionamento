import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Payment, PaymentKind } from '../types';
import { colors, fonts, spacing } from '../theme';
import { formatDateTime, formatMoney } from '../utils/dates';

const KIND: Record<PaymentKind, string> = {
  reserva: 'Reserva',
  alteracao: 'Alteração',
  saida: 'Estacionamento',
  excesso: 'Tempo excedido',
  extra: 'Pagamento extra',
  avenca: 'Avença mensal',
  renovacao: 'Renovação da avença',
  reembolso: 'Reembolso',
};

export function PaymentList({ payments }: { payments: Payment[] }) {
  if (!payments.length) return <Text style={styles.muted}>Sem pagamentos.</Text>;
  return (
    <View style={{ gap: spacing.sm }}>
      {payments.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: p.amount < 0 ? colors.successLight : colors.primaryLight }]}>
            <Ionicons name={p.amount < 0 ? 'arrow-undo' : 'receipt-outline'} size={16} color={p.amount < 0 ? colors.success : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kind}>{p.note && p.kind === 'extra' ? p.note : KIND[p.kind]}</Text>
            <Text style={styles.muted}>{formatDateTime(p.createdAt.toDate())}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, p.amount < 0 && { color: colors.success }]}>{formatMoney(p.amount)}</Text>
            <Text style={[styles.status, { color: p.status === 'pago' ? colors.success : colors.danger }]}>
              {p.status === 'pago' ? 'Pago' : 'Pendente'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  kind: { fontFamily: fonts.semibold, color: colors.text },
  muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
  amount: { fontFamily: fonts.bold, color: colors.text },
  status: { fontSize: 12, fontFamily: fonts.bold },
});
