import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Smartphone,
  ListTodo,
  CheckCircle2,
  Sparkles,
  Gift,
  XCircle,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  InAppNotification,
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  getCurrentPushSubscription,
} from '../services/push';
import { audio } from '../services/audio';

interface NotificationBellProps {
  userRole: 'parent' | 'child';
  childId?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const data = await fetchNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  const checkPushState = async () => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (supported) {
      const sub = await getCurrentPushSubscription();
      setIsSubscribed(!!sub && getNotificationPermission() === 'granted');
    }
  };

  useEffect(() => {
    loadData();
    checkPushState();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  const handleEnablePush = async (playTap = true) => {
    if (playTap) audio.playTap();
    if (subscribing) return;

    setSubscribing(true);
    try {
      const res = await subscribeToPushNotifications();
      if (res.success) {
        audio.playApproval();
        setIsSubscribed(true);
      } else {
        alert(res.error || 'לא ניתן היה להפעיל התראות');
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleToggle = () => {
    audio.playTap();
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening && unreadCount > 0) {
      void handleMarkAllRead();
    }

    // A notification permission request must originate from a user gesture.
    // On the first bell tap, request it immediately so mobile Chrome shows its
    // native permission prompt without requiring a second hidden/extra tap.
    if (
      opening &&
      pushSupported &&
      !isSubscribed &&
      !subscribing &&
      getNotificationPermission() === 'default'
    ) {
      void handleEnablePush(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'screen_request':
        return <Smartphone className="h-4 w-4 text-amber-400" />;
      case 'screen_approved':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'screen_rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'task_submitted':
        return <ListTodo className="h-4 w-4 text-cyan-400" />;
      case 'task_approved':
        return <Sparkles className="h-4 w-4 text-gold-400" />;
      case 'manual_bonus':
        return <Gift className="h-4 w-4 text-purple-400" />;
      default:
        return <Bell className="h-4 w-4 text-purple-300" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = Date.now();
      const time = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - time) / 1000);

      if (diffSec < 60) return 'עכשיו';
      if (diffSec < 3600) return `לפני ${Math.floor(diffSec / 60)} דק׳`;
      if (diffSec < 86400) return `לפני ${Math.floor(diffSec / 3600)} שעות`;
      return `לפני ${Math.floor(diffSec / 86400)} ימים`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl bg-night-900 border border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-900/40 transition"
        title="התראות"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 rounded-2xl bg-night-900 border border-purple-500/30 shadow-2xl p-4 z-[100] animate-fade-in backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gold-400" />
              <h3 className="font-bold text-sm text-white">עדכונים והתראות</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 transition"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>סמן כנקרא</span>
              </button>
            )}
          </div>

          {/* Device Push Toggle Banner */}
          {pushSupported ? (
            <div className="my-2.5 p-2.5 rounded-xl bg-night-950 border border-purple-500/20 text-xs flex items-center justify-between gap-2">
              {isSubscribed ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px]">התראות קופצות פעילות במכשיר זה</span>
                </div>
              ) : (
                <>
                  <div className="text-purple-300/90 text-[11px]">
                    {getNotificationPermission() === 'denied'
                      ? 'Chrome חוסם כרגע התראות לאתר זה'
                      : 'רוצה לקבל התראה למסך הנעילה?'}
                  </div>
                  {getNotificationPermission() !== 'denied' && (
                    <button
                      onClick={() => handleEnablePush(true)}
                      disabled={subscribing}
                      className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shrink-0 transition disabled:opacity-60"
                    >
                      {subscribing ? 'מפעיל...' : 'הפעל התראות 🔔'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="my-2.5 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200">
              הדפדפן הזה אינו מאפשר Web Push במצב הנוכחי.
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto space-y-2 mt-2 divide-y divide-purple-500/10">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-purple-400/60">
                אין התראות כרגע
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    className={`pt-2 flex items-start gap-2.5 transition ${
                      isUnread ? 'bg-purple-950/20 p-2 rounded-xl' : ''
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-night-950 border border-purple-500/20 shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate">{n.title}</span>
                        <span className="text-[10px] text-purple-400/60 shrink-0">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-300/80 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
