import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, fonts, gradients } from '../theme';

/** Caminhos do símbolo (iguais aos de scripts/brand-assets.mjs). */
const PIN = 'M50 86 C47 82 23 61 23 41 A27 27 0 1 1 77 41 C77 61 53 82 50 86 Z';
const P = 'M40.5 27 H52.5 A10.5 10.5 0 0 1 52.5 48 H48 V56.5 H40.5 Z M48 33.5 V41.5 H52 A4 4 0 0 0 52 33.5 Z';

/** Símbolo do ParkSmart: pino de localização com um "P", num azulejo com degradê. */
export function LogoMark({ size = 56, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gradients.brand[0]} />
          <Stop offset="1" stopColor={gradients.brand[1]} />
        </LinearGradient>
      </Defs>
      {tile && <Rect width="100" height="100" rx="26" fill="url(#brand)" />}
      <G scale={0.78} origin="50, 50">
        <Ellipse cx="50" cy="88" rx="11" ry="2.6" fill="#000" opacity={tile ? 0.18 : 0.08} />
        <Path d={PIN} fill={tile ? '#fff' : 'url(#brand)'} />
        <Path d={P} fill={tile ? colors.primaryDark : '#fff'} fillRule="evenodd" />
        <Circle cx="67.5" cy="22.5" r="4.2" fill="#2BD9AE" stroke={tile ? '#fff' : colors.surface} strokeWidth="2.4" />
      </G>
    </Svg>
  );
}

/** Logótipo completo (símbolo + nome). `dark` para fundos escuros. */
export function Logo({ size = 40, dark, tagline }: { size?: number; dark?: boolean; tagline?: string }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      <View>
        <Text style={[styles.word, { fontSize: size * 0.58, color: dark ? '#fff' : colors.ink }]}>
          Park<Text style={{ color: dark ? '#8EA2FF' : colors.primary }}>Smart</Text>
        </Text>
        {!!tagline && <Text style={[styles.tagline, { color: dark ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>{tagline}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { fontFamily: fonts.extrabold, letterSpacing: -0.6 },
  tagline: { fontFamily: fonts.medium, fontSize: 12, marginTop: -2 },
});
