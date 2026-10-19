import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { ChildDashboard } from '../screens/ChildDashboard';

export const ChildDashboardGuard: React.FC = () => {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'child') return;

    let cancelled = false;
    setReady(false);
    setError(null);

    const verifyDashboard = async () => {
      try {
        const snapshot = await apiRequest<any>(
          `/api/child/dashboard?childId=${encodeURIComponent(user.id)}`
        );
        const availableMinutes = Number(snapshot?.wallet?.availableMinutes);
        if (
          snapshot?.child?.id !== user.id ||
          !snapshot?.wallet ||
          !Number.isFinite(availableMinutes)
        ) {
          throw new Error('Invalid child dashboard snapshot');
        }
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('Child dashboard preflight failed', err);
        if (!cancelled) {
          setReady(false);
          setError('לא ניתן לטעון את יתרת הזמן כרגע.');
        }
      }
    };

    verifyDashboard();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, retryKey]);

  if (ready) return <ChildDashboard />;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/30 p-6 text-center shadow-xl">
        {!error ? (
          <>
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-gold-400 border-t-transparent animate-spin" />
            <p className="mt-4 text-gold-300 font-semibold">טוען את יתרת הזמן...</p>
          </>
        ) : (
          <>
            <p className="text-amber-300 font-bold mb-2">{error}</p>
            <p className="text-sm text-purple-200/80 mb-5">
              לא נציג 0 דקות כשאין לנו נתון מאומת מהשרת.
            </p>
            <button
              onClick={() => setRetryKey((value) => value + 1)}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-3 font-bold text-white active:scale-95 transition"
            >
              נסה שוב
            </button>
          </>
        )}
      </div>
    </div>
  );
};
