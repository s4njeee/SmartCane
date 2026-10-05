import { Alert, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsNS from 'expo-notifications';

export type EmergencyKind = 'fall' | 'emergency' | 'stolen';

const CHANNEL_ID = 'smartcane-emergency';
let configured = false;
let notifications: typeof NotificationsNS | null | undefined;

function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Expo Go SDK 53+ throws if expo-notifications is imported on Android. */
function getNotifications() {
  if (notifications !== undefined) return notifications;
  // Android Expo Go crashes if expo-notifications is loaded.
  if (Platform.OS === 'web' || (isExpoGo() && Platform.OS === 'android')) {
    notifications = null;
    return notifications;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifications = require('expo-notifications') as typeof NotificationsNS;
  } catch {
    notifications = null;
  }
  return notifications;
}

export async function configureEmergencyNotifications() {
  const Notifications = getNotifications();
  if (!Notifications || configured) return;

  try {
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
  } catch {
    /* Native module missing in Expo Go / unsupported builds. */
  }
}

export async function requestEmergencyNotificationPermission() {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  await configureEmergencyNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

export async function notifyEmergency(kind: EmergencyKind, caneName: string) {
  const title =
    kind === 'fall' ? 'Fall Detection' : kind === 'stolen' ? 'Cane Stolen' : 'Emergency Request';
  const body =
    kind === 'fall'
      ? `${caneName} may have fallen. Open Alerts.`
      : kind === 'stolen'
        ? `${caneName}: the glasses reported the cane is stolen. Open Alerts.`
        : `${caneName} sent an emergency request from the cane.`;

  const Notifications = getNotifications();
  if (!Notifications) {
    Alert.alert(title, body);
    return;
  }
  await configureEmergencyNotifications();
  const granted = await requestEmergencyNotificationPermission();
  if (!granted) {
    Alert.alert(title, body);
    return;
  }

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
  const Notifications = getNotifications();
  if (!Notifications) return () => undefined;
  try {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      onOpenAlerts();
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
