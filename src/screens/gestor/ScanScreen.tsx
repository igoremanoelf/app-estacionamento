import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useCurrentPark } from '../../context/ParkContext';
import { useParkReservations } from '../../hooks/data';
import { errorMessage } from '../../services/auth';
import { processGateScan, type GateResult } from '../../services/gate';
import { colors, fonts, radius, spacing } from '../../theme';
import { normalizePlate } from '../../utils/plate';
import { buildQrPayload } from '../../utils/token';

/** Leitura dos QR Codes de entrada/saída na cancela (câmara) com alternativa manual por matrícula. */
export function ScanScreen() {
  const { park, parkId } = useCurrentPark();
  const { data: reservations } = useParkReservations(parkId);
  const [permission, requestPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const [result, setResult] = useState<{ ok: boolean; title: string; text: string } | null>(null);
  const [plate, setPlate] = useState('');
  const processing = useRef(false);

  const handle = async (data: string) => {
    if (processing.current || result || !park) return;
    processing.current = true;
    try {
      const r: GateResult = await processGateScan(data, park);
      setResult({ ok: true, title: r.action === 'entrada' ? `Entrada · ${r.plate}` : `Saída · ${r.plate}`, text: r.message });
    } catch (e) {
      setResult({ ok: false, title: 'Acesso recusado', text: errorMessage(e) });
    } finally {
      processing.current = false;
    }
  };

  const byPlate = () => {
    const p = normalizePlate(plate);
    const r = reservations.find((x) => x.plate === p && x.status === 'no_parque') ?? reservations.find((x) => x.plate === p && x.status === 'reservada');
    if (!r) return setResult({ ok: false, title: 'Sem reserva', text: `Não há reservas ativas para ${p}.` });
    handle(buildQrPayload(r.id, r.qrToken));
  };

  return (
    <Screen>
      <View style={styles.cameraBox}>
        {!permission ? null : !permission.granted ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={40} color="#fff" />
            <Text style={styles.white}>É necessário acesso à câmara para ler os QR Codes.</Text>
            <AppButton title="Permitir câmara" onPress={requestPermission} />
          </View>
        ) : focused && !result ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => handle(data)}
          />
        ) : null}
        {result && (
          <View style={[styles.center, { backgroundColor: result.ok ? colors.success : colors.danger }]}>
            <Ionicons name={result.ok ? 'checkmark-circle' : 'close-circle'} size={64} color="#fff" />
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.white}>{result.text}</Text>
          </View>
        )}
        {!result && permission?.granted && <View style={styles.frame} pointerEvents="none" />}
      </View>
      {result && <AppButton title="Ler outro código" icon="scan-outline" onPress={() => setResult(null)} />}

      <Card title="Sem QR Code? Procurar por matrícula" icon="search-outline">
        <TextField label="Matrícula" value={plate} onChangeText={(t) => setPlate(t.toUpperCase())} autoCapitalize="characters" placeholder="AA-00-BB" />
        <AppButton title="Registar entrada/saída" variant="secondary" icon="swap-horizontal-outline" onPress={byPlate} disabled={!plate || !!result} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraBox: { height: 340, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#111' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  white: { color: '#fff', textAlign: 'center' },
  resultTitle: { color: '#fff', fontSize: 20, fontFamily: fonts.extrabold },
  frame: { position: 'absolute', top: 60, left: 60, right: 60, bottom: 60, borderWidth: 3, borderColor: '#fff', borderRadius: radius.lg },
});
