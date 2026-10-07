import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getDoc, updateDoc } from 'firebase/firestore';
import { AppState, Platform } from 'react-native';
import { refs } from './firestore';

let configured = false;

/**
 * Configura a apresentação das notificações. As notificações remotas (Expo Push)
 * não são mostradas com a app aberta porque, nesse caso, os listeners do Firestore
 * já geram uma notificação local equivalente (evita duplicados).
 */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const remote = n.request.content.data?.remote === true;
      const show = !(remote && AppState.currentState === 'active');
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Parque',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Regista o token Expo Push do dispositivo no perfil do utilizador (push remoto entre utilizadores). */
export async function registerPushToken(uid: string): Promise<void> {
  try {
    if (!Device.isDevice || !(await ensurePermission())) return;
    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await updateDoc(refs.user(uid), { pushToken: token });
  } catch {
    // push remoto é opcional (ex.: Expo Go sem projeto EAS)
  }
}

export async function notifyLocal(title: string, body: string, data: Record<string, unknown> = {}): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
  } catch {
    // sem permissões: ignora
  }
}

export async function scheduleAt(identifier: string, date: Date, title: string, body: string): Promise<void> {
  if (date.getTime() <= Date.now()) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    // ignora
  }
}

export async function cancelScheduled(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}

/** Envia uma notificação push remota a um utilizador através do serviço Expo Push. */
export async function sendPushToUser(uid: string, title: string, body: string, data: Record<string, unknown> = {}): Promise<void> {
  const snap = await getDoc(refs.user(uid));
  const token = snap.exists() ? (snap.data().pushToken as string | undefined) : undefined;
  if (!token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default', data: { ...data, remote: true } }),
  });
}
