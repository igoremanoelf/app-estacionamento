import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Reservation } from '../types';
import { colors, fonts, gradients, radius, shadows, spacing } from '../theme';
import { formatDateTime } from '../utils/dates';
import { buildQrPayload } from '../utils/token';
import { LogoMark } from './Logo';

/** Bilhete com o QR Code de entrada e saída (o mesmo código serve para ambos). */
export function QRTicket({ reservation: r }: { reservation: Reservation }) {
  const valid = r.status === 'reservada' || r.status === 'no_parque';
  return (
    <View style={styles.ticket}>
      <LinearGradient colors={valid ? gradients.hero : ['#5B6478', '#3A4256']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.head}>
        <LogoMark size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headOver}>BILHETE DE ESTACIONAMENTO</Text>
          <Text style={styles.park} numberOfLines={1}>
            {r.parkName}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.qrArea}>
        <View style={[styles.qr, !valid && { opacity: 0.2 }]}>
          <QRCode value={buildQrPayload(r.id, r.qrToken)} size={188} color={colors.ink} />
        </View>
        <Text style={[styles.hint, !valid && { color: colors.danger }]}>
          {valid
            ? r.status === 'no_parque'
              ? 'Mostre este código na cancela para sair'
              : 'Mostre este código na cancela para entrar'
            : 'Este QR Code já não é válido'}
        </Text>
      </View>

      <View style={styles.tear}>
        <View style={[styles.notch, { left: -12 }]} />
        <View style={styles.dash} />
        <View style={[styles.notch, { right: -12 }]} />
      </View>

      <View style={styles.footer}>
        <Field label="LUGAR" value={r.spotCode} big />
        <Field label="MATRÍCULA" value={r.plate} />
        <Field label="ENTRADA" value={formatDateTime(r.start.toDate())} small />
      </View>
    </View>
  );
}

function Field({ label, value, big, small }: { label: string; value: string; big?: boolean; small?: boolean }) {
  return (
    <View style={{ gap: 2, flexShrink: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, big && styles.valueBig, small && styles.valueSmall]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { backgroundColor: colors.surface, borderRadius: radius.xl, ...shadows.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  headOver: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  park: { color: '#fff', fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 },
  qrArea: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  qr: { padding: spacing.md, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  hint: { color: colors.textMuted, textAlign: 'center', fontFamily: fonts.medium, fontSize: 14 },
  tear: { height: 24, justifyContent: 'center' },
  notch: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background },
  dash: { marginHorizontal: spacing.lg + 4, borderTopWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  label: { fontSize: 10, color: colors.textSubtle, fontFamily: fonts.bold, letterSpacing: 1.1 },
  value: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, letterSpacing: 0.6 },
  valueBig: { fontSize: 26, fontFamily: fonts.extrabold, color: colors.primary, letterSpacing: -0.5 },
  valueSmall: { fontSize: 13, fontFamily: fonts.semibold, letterSpacing: 0 },
});
