import { apiRequest } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Service worker registration failed:', err);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Failed to get push subscription:', err);
    return null;
  }
}

export async function subscribeToPushNotifications(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'התראות Push אינן נתמכות בדפדפן או במכשיר זה' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'הרשאת ההתראות לא אושרה' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: 'רישום שירות ההתראות נכשל' };
    }

    // Get VAPID public key from backend
    const vapidRes = await apiRequest('/api/push/vapid-public-key');
    if (!vapidRes?.publicKey) {
      return { success: false, error: 'מפתח שרת ההתראות חסר' };
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidRes.publicKey);

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // Send subscription to server
    const subJson = sub.toJSON();
    await apiRequest('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: subJson }),
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to subscribe to push:', err);
    return { success: false, error: err.message || 'הפעלת ההתראות נכשלה' };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await apiRequest('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint }),
      });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to unsubscribe:', err);
    return { success: false, error: err.message || 'ביטול ההתראות נכשל' };
  }
}

export interface InAppNotification {
  id: string;
  family_id: string;
  recipient_role: 'parent' | 'child';
  recipient_child_id: string | null;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read_at: string | null;
  created_at: string;
}

export async function fetchNotifications(): Promise<{ notifications: InAppNotification[]; unreadCount: number }> {
  try {
    const res = await apiRequest('/api/notifications');
    return {
      notifications: res.notifications || [],
      unreadCount: res.unreadCount || 0,
    };
  } catch (e) {
    console.error('Failed to fetch notifications', e);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    await apiRequest('/api/notifications/read-all', { method: 'POST' });
    return true;
  } catch (e) {
    console.error('Failed to mark notifications read', e);
    return false;
  }
}
