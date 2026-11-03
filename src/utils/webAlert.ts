import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * No browser (react-native-web) o Alert.alert não faz nada. Este polyfill usa
 * window.alert / window.confirm para que as confirmações e mensagens da app
 * também funcionem na versão web (útil para demonstrações e testes).
 */
export function installWebAlert(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    const cancel = (buttons ?? []).find((b) => b.style === 'cancel');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    if (window.confirm(text)) actions.at(-1)?.onPress?.();
    else cancel?.onPress?.();
  };
}
