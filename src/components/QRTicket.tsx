import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Reservation } from '../types';
import { colors, radius, spacing } from '../theme';
import { buildQrPayload } from '../utils/token';

/** Bilhete com o QR Code de entrada e saída (o mesmo código serve para ambos). */
export function QRTicket({ reservation: r }: { reservation: Reservation }) {
  const valid = r.status === 'reservada' || r.status === 'no_parque';
  return (
    <View style={styles.ticket}>
      <Text style={styles.park}>{r.parkName}</Text>
      <View style={[styles.qr, !valid && { opacity: 0.25 }]}>
        <QRCode value={buildQrPayload(r.id, r.qrToken)} size={200} />
      </View>
      <Text style={styles.hint}>
        {valid
          ? r.status === 'no_parque'
            ? 'Mostre este código na cancela para sair'
            : 'Mostre este código na cancela para entrar'
          : 'Este QR Code já não é válido'}
      </Text>
      <View style={styles.spotRow}>
        <Text style={styles.label}>LUGAR</Text>
        <Text style={styles.spot}>{r.spotCode}</Text>
        <Text style={styles.label}>MATRÍCULA</Text>
        <Text style={styles.plate}>{r.plate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  park: { fontWeight: '800', fontSize: 16, color: colors.primaryDark },
  qr: { padding: spacing.md, backgroundColor: '#fff' },
  hint: { color: colors.textMuted, textAlign: 'center' },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  spot: { fontSize: 22, fontWeight: '900', color: colors.primary, marginRight: spacing.md },
  plate: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 1 },
});
