import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type EmergencyKind = 'fall' | 'emergency';

const CHANNEL_ID = 'smartcane-emergency';
let configured = false;

export async function configureEmergencyNotifications() {
  if (Platform.OS === 'web' || configured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  configured = true;
}

export async function requestEmergencyNotificationPermission() {
  if (Platform.OS === 'web') return false;
  await configureEmergencyNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

export async function notifyEmergency(kind: EmergencyKind, caneName: string) {
  if (Platform.OS === 'web') return;
  await configureEmergencyNotifications();
  const granted = await requestEmergencyNotificationPermission();
  if (!granted) return;

  const title =
    kind === 'fall' ? 'Fall Detection Emergency' : 'Emergency Request';
  const body =
    kind === 'fall'
      ? `${caneName} may have fallen. Open Alerts to view location.`
      : `${caneName} pressed the cane SOS button twice. Open Alerts.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { kind, screen: 'messages' },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export function addEmergencyNotificationResponseListener(onOpenAlerts: () => void) {
  if (Platform.OS === 'web') return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener(() => {
    onOpenAlerts();
  });
  return () => sub.remove();
}
