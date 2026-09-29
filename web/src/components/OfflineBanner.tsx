import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-950/90 border-b border-red-700/50 text-red-200 px-4 py-2.5 backdrop-blur-md flex items-center justify-between shadow-lg text-sm">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-red-400 shrink-0" />
        <span>אין כרגע חיבור לאינטרנט. נתונים מוצגים מהזיכרון המקומי.</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 bg-red-900/60 hover:bg-red-800/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>נסה שוב</span>
      </button>
    </div>
  );
};
