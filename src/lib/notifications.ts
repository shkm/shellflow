import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

let permissionGranted = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionGranted) return true;

  permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  return permissionGranted;
}

export async function sendOsNotification(
  title: string,
  body: string
): Promise<void> {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return;

  sendNotification({ title, body });
}
