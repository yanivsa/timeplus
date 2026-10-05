import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, Pause, Play, Tv } from 'lucide-react';
import { apiRequest } from '../services/api';

type ActiveScreenSession = {
  id: string;
  child_id: string;
  child_name: string;
  child_color?: string | null;
  source: string;
  mode?: 'approved' | 'self';
  status: 'running' | 'paused';
  allocated_seconds: number;
  remaining_seconds: number;
  remaining_now?: number;
  elapsed_now?: number;
};

const sourceLabels: Record<string, string> = {
  playstation: 'PlayStation',
  vr: 'VR',
  tv: 'טלוויזיה',
  computer: 'מחשב',
  tablet: 'טאבלט',
  phone: 'טלפון',
  youtube: 'YouTube',
  other: 'אחר',
};

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export const ParentActiveTimers: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveScreenSession[]>([]);
  const [syncedAt, setSyncedAt] = useState(() => performance.now());
  const [tick, setTick] = useState(() => performance.now());
  const refreshInFlight = useRef(false);

  const loadSessions = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;

    try {
      const res = await apiRequest('/api/parent/dashboard');
      setSessions(res.activeScreenSessions || []);
      setSyncedAt(performance.now());
      setTick(performance.now());
    } catch (err) {
      console.error('Failed to load active child screen timers', err);
    } finally {
      refreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    loadSessions();

    const refreshInterval = window.setInterval(loadSessions, 15000);
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') loadSessions();
    };

    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', loadSessions);
    window.addEventListener('pageshow', loadSessions);

    return () => {
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', loadSessions);
      window.removeEventListener('pageshow', loadSessions);
    };
  }, [loadSessions]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const secondsSinceSync = Math.max(0, Math.floor((tick - syncedAt) / 1000));
    const hasExpiredRunningTimer = sessions.some((session) => {
      if (session.status !== 'running') return false;
      const baseRemaining = Number(session.remaining_now ?? session.remaining_seconds ?? 0);
      return baseRemaining - secondsSinceSync <= 0;
    });

    if (hasExpiredRunningTimer) loadSessions();
  }, [tick, syncedAt, sessions, loadSessions]);

  if (sessions.length === 0) return null;

  const secondsSinceSync = Math.max(0, Math.floor((tick - syncedAt) / 1000));

  return (
    <section className="relative z-20 max-w-5xl mx-auto px-4 pt-4" aria-live="polite">
      <div className="rounded-3xl border border-cyan-400/40 bg-cyan-950/35 shadow-xl shadow-cyan-950/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-cyan-400/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-cyan-300" />
            <div>
              <div className="text-sm font-black text-white">זמן מסך פעיל עכשיו</div>
              <div className="text-[11px] text-cyan-200/70">השעון מתעדכן בזמן אמת גם כשהילד יוצא מהאפליקציה</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold whitespace-nowrap">
            {sessions.length} פעיל{sessions.length > 1 ? 'ים' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
          {sessions.map((session) => {
            const isRunning = session.status === 'running';
            const localElapsed = isRunning ? secondsSinceSync : 0;
            const baseRemaining = Number(session.remaining_now ?? session.remaining_seconds ?? 0);
            const remaining = Math.max(0, baseRemaining - localElapsed);
            const baseElapsed = Number(
              session.elapsed_now ?? Math.max(0, Number(session.allocated_seconds || 0) - baseRemaining)
            );
            const elapsed = Math.max(
              0,
              Math.min(Number(session.allocated_seconds || 0), baseElapsed + localElapsed)
            );
            const sourceLabel = sourceLabels[session.source] || session.source || 'מסך';

            return (
              <div
                key={session.id}
                className="rounded-2xl bg-night-950/75 border border-cyan-400/20 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center border shrink-0"
                    style={{
                      borderColor: session.child_color || '#22d3ee',
                      backgroundColor: `${session.child_color || '#22d3ee'}20`,
                    }}
                  >
                    <Tv className="h-5 w-5" style={{ color: session.child_color || '#22d3ee' }} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm text-white truncate">{session.child_name}</span>
                      <span className="text-[10px] text-cyan-300/80 whitespace-nowrap">{sourceLabel}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                      {isRunning ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <Play className="h-3 w-3 text-emerald-300" />
                          <span className="text-emerald-300 font-bold">פועל עכשיו</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <Pause className="h-3 w-3 text-amber-300" />
                          <span className="text-amber-300 font-bold">מושהה</span>
                        </>
                      )}
                      <span className="text-purple-400">•</span>
                      <span className="text-purple-300/80">
                        {session.mode === 'self' ? 'ניצול עצמי' : 'זמן שאושר'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left shrink-0 min-w-[92px]">
                  <div className="font-mono text-2xl font-black tracking-tight text-cyan-200 tabular-nums">
                    {formatDuration(remaining)}
                  </div>
                  <div className="flex justify-between gap-2 text-[9px] text-purple-400 font-semibold">
                    <span>נותר</span>
                    <span>נוצל {formatDuration(elapsed)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
