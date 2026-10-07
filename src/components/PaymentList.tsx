import { StyleSheet, Text, View } from 'react-native';
import type { Payment, PaymentKind } from '../types';
import { colors, spacing } from '../theme';
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  kind: { fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 12 },
  amount: { fontWeight: '700', color: colors.text },
  status: { fontSize: 12, fontWeight: '700' },
});
