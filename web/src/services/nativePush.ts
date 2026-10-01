import { apiRequest } from './api';

declare global {
  interface Window {
    TimePlusAndroid?: {
      getFcmToken?: () => string;
      getDeviceName?: () => string;
    };
  }
}

export function isNativeAndroidApp(): boolean {
  return typeof window !== 'undefined' && !!window.TimePlusAndroid;
}

export async function registerNativeFcmToken(): Promise<boolean> {
  if (!isNativeAndroidApp()) return false;

  const token = window.TimePlusAndroid?.getFcmToken?.()?.trim() || '';
  if (!token) return false;

  const deviceName = window.TimePlusAndroid?.getDeviceName?.() || 'Android';

  await apiRequest('/api/push/fcm-subscribe', {
    method: 'POST',
    body: JSON.stringify({ token, deviceName }),
  });

  return true;
}


export async function unregisterNativeFcmToken(): Promise<boolean> {
  if (!isNativeAndroidApp()) return false;

  const token = window.TimePlusAndroid?.getFcmToken?.()?.trim() || '';
  if (!token) return false;

  await apiRequest('/api/push/fcm-unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  return true;
}
