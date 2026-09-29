import React from 'react';
import { useAuth } from './context/AuthContext';
import { BackgroundStars } from './components/BackgroundStars';
import { OfflineBanner } from './components/OfflineBanner';
import { VersionFooter } from './components/VersionFooter';
import { LoginScreen } from './screens/LoginScreen';
import { SetupScreen } from './screens/SetupScreen';
import { ChildDashboard } from './screens/ChildDashboard';
import { ParentDashboard } from './screens/ParentDashboard';

export const App: React.FC = () => {
  const { user, loading, isInitialized } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <BackgroundStars />
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-gold-400 p-0.5 shadow-2xl">
            <div className="h-full w-full rounded-2xl bg-night-950 flex items-center justify-center">
              <span className="text-2xl font-bold font-cinzel text-gold-400">T+</span>
            </div>
          </div>
          <span className="text-sm font-semibold text-gold-300 font-cinzel">Time+ אקדמיית הזמן</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-purple-100">
      <BackgroundStars />
      <OfflineBanner />

      <main className="flex-1">
        {!isInitialized ? (
          <SetupScreen />
        ) : !user ? (
          <LoginScreen />
        ) : user.role === 'parent' ? (
          <ParentDashboard />
        ) : (
          <ChildDashboard />
        )}
      </main>

      <VersionFooter />
    </div>
  );
};
