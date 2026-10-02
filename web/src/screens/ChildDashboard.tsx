import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { audio } from '../services/audio';
import { TaskItem, TransactionItem, RewardEventData } from '../types';
import { RewardCelebration } from '../components/RewardCelebration';
import {
  Sparkles,
  Flame,
  Clock,
  Tv,
  CheckCircle,
  Clock4,
  History,
  LogOut,
  Send,
  X,
  Gamepad2,
  Monitor,
  Tablet,
  Smartphone,
  Youtube,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

export const ChildDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [history, setHistory] = useState<TransactionItem[]>([]);
  const [celebrationEvent, setCelebrationEvent] = useState<RewardEventData | null>(null);

  // Modals
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  const [showScreenRequestModal, setShowScreenRequestModal] = useState(false);
  const [requestMinutes, setRequestMinutes] = useState(30);
  const [customRequestMinutes, setCustomRequestMinutes] = useState(false);
  const [requestSource, setRequestSource] = useState('playstation');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showSelfUsageModal, setShowSelfUsageModal] = useState(false);
  const [selfUsageSource, setSelfUsageSource] = useState('vr');
  const [screenSession, setScreenSession] = useState<any>({ activeSession: null, readyRequests: [] });
  const [screenSessionLoadedAt, setScreenSessionLoadedAt] = useState(() => performance.now());
  const [timerTick, setTimerTick] = useState(() => performance.now());
  const [screenSessionBusy, setScreenSessionBusy] = useState(false);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);
  const alertedSessionRef = useRef<string | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const res = await apiRequest(`/api/child/dashboard?childId=${user?.id}`);
      setData(res);

      const tasksRes = await apiRequest(`/api/child/tasks?childId=${user?.id}`);
      setTasks(tasksRes.tasks || []);

      const sessionRes = await apiRequest('/api/child/screen-session');
      setScreenSession(sessionRes || { activeSession: null, readyRequests: [] });
      setScreenSessionLoadedAt(performance.now());

      // Check for celebration events
      const celebRes = await apiRequest(`/api/child/celebration?childId=${user?.id}`);
      if (celebRes.event) {
        setCelebrationEvent(celebRes.event);
      }
    } catch (e) {
      console.error('Error loading dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await apiRequest(`/api/child/history?childId=${user?.id}`);
      setHistory(res.transactions || []);
    } catch (e) {
      console.error('Error loading history', e);
    }
  };

  useEffect(() => {
    loadDashboard();

    const syncWhenForegrounded = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard();
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadDashboard();
    }, 60000);

    document.addEventListener('visibilitychange', syncWhenForegrounded);
    window.addEventListener('focus', syncWhenForegrounded);
    window.addEventListener('pageshow', syncWhenForegrounded);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncWhenForegrounded);
      window.removeEventListener('focus', syncWhenForegrounded);
      window.removeEventListener('pageshow', syncWhenForegrounded);
    };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => setTimerTick(performance.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    audio.playTap();
    setSubmittingTask(true);
    setStatusMessage(null);

    try {
      await apiRequest(`/api/child/tasks/${selectedTask.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          childId: user?.id,
          note: submissionNote.trim() || null,
        }),
      });
      audio.playSubmit();
      setSelectedTask(null);
      setSubmissionNote('');
      setStatusMessage('המשימה נשלחה לאישור ההורים בהצלחה!');
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage(err.message || 'שגיאה בשליחת המשימה');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleRequestScreenTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(requestMinutes) || requestMinutes <= 0) {
      setStatusMessage('יש להזין מספר דקות תקין');
      return;
    }

    audio.playTap();
    setSubmittingRequest(true);
    setStatusMessage(null);

    try {
      await apiRequest('/api/child/screen-time/request', {
        method: 'POST',
        body: JSON.stringify({
          childId: user?.id,
          minutes: requestMinutes,
          source: requestSource,
        }),
      });
      audio.playSubmit();
      setShowScreenRequestModal(false);
      setStatusMessage('בקשת זמן המסך נשלחה להורים!');
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage(err.message || 'שגיאה בשליחת הבקשה');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleStartSelfUsage = async () => {
    if (screenSessionBusy) return;
    setScreenSessionBusy(true);
    setStatusMessage(null);

    try {
      const res = await apiRequest('/api/child/screen-session/self-start', {
        method: 'POST',
        body: JSON.stringify({ source: selfUsageSource }),
      });
      setScreenSession(res);
      setScreenSessionLoadedAt(performance.now());
      setShowSelfUsageModal(false);
      audio.playTap();
      setStatusMessage('הטיימר התחיל — כשתסיים לחץ "סיימתי".');
    } catch (err: any) {
      audio.playReject();
      setStatusMessage(err.message || 'לא ניתן להתחיל את הטיימר');
    } finally {
      setScreenSessionBusy(false);
    }
  };

  const handleScreenSessionAction = async (action: 'start' | 'pause' | 'resume' | 'stop', requestId?: string) => {
    if (screenSessionBusy) return;

    if (action === 'stop') {
      const isSelfUsage = activeSession?.mode === 'self';
      const message = isSelfUsage
        ? 'לסיים את השימוש? ינוכו רק הדקות שנוצלו בפועל.'
        : 'לסיים את זמן המסך? הזמן שנותר בסשן הזה לא יוחזר לארנק.';
      if (!confirm(message)) return;
    }

    setScreenSessionBusy(true);
    try {
      const res = await apiRequest(`/api/child/screen-session/${action}`, {
        method: 'POST',
        body: JSON.stringify(requestId ? { requestId } : {}),
      });
      setScreenSession(res);
      setScreenSessionLoadedAt(performance.now());
      audio.playTap();

      if (action === 'stop' && res.mode === 'self') {
        setStatusMessage(
          res.spentMinutes > 0
            ? `סיימת! נרשמו ${res.spentMinutes} דקות ניצול.`
            : 'הטיימר נסגר ללא ניצול דקות.'
        );
        await loadDashboard();
      }
    } catch (err: any) {
      audio.playReject();
      setStatusMessage(err.message || 'פעולת הטיימר נכשלה');
    } finally {
      setScreenSessionBusy(false);
    }
  };

  const activeSession = screenSession?.activeSession;
  const baseRemaining = Number(activeSession?.remaining_now ?? activeSession?.remaining_seconds ?? 0);
  const elapsedSinceLoad =
    activeSession?.status === 'running'
      ? Math.max(0, Math.floor((timerTick - screenSessionLoadedAt) / 1000))
      : 0;
  const displayRemainingSeconds = Math.max(0, baseRemaining - elapsedSinceLoad);
  const baseElapsed = Number(
    activeSession?.elapsed_now ??
      Math.max(0, Number(activeSession?.allocated_seconds || 0) - baseRemaining)
  );
  const displayElapsedSeconds = Math.max(
    0,
    Math.min(Number(activeSession?.allocated_seconds || 0), baseElapsed + elapsedSinceLoad)
  );
  const displayMinutes = Math.floor(displayRemainingSeconds / 60);
  const displaySeconds = displayRemainingSeconds % 60;
  const elapsedMinutes = Math.floor(displayElapsedSeconds / 60);
  const elapsedSeconds = displayElapsedSeconds % 60;
  const readyScreenRequest = screenSession?.readyRequests?.[0] || null;

  useEffect(() => {
    if (activeSession?.status !== 'running' || displayRemainingSeconds > 0) return;
    if (!activeSession?.id || alertedSessionRef.current === activeSession.id) return;

    alertedSessionRef.current = activeSession.id;
    audio.playTimeUp();

    try {
      navigator.vibrate?.([400, 180, 400, 180, 800]);
    } catch {
      // Vibration is best-effort and not supported on every device/browser.
    }

    setStatusMessage('הזמן נגמר ⏰');
    setShowTimeUpAlert(true);

    const timeout = window.setTimeout(() => {
      loadDashboard();
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [activeSession?.id, activeSession?.status, displayRemainingSeconds]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-gold-400 border-t-transparent animate-spin" />
          <p className="text-gold-300 font-cinzel text-sm">פותח את ספר הזמן...</p>
        </div>
      </div>
    );
  }

  const child = data?.child;
  const wallet = data?.wallet;
  const progress = data?.progress;
  const pendingCount = data?.pendingSubmissionsCount || 0;
  const recommendedTask = data?.recommendedTask;

  const quickMinutes = [10, 15, 20, 30];
  const sources = [
    { id: 'playstation', label: 'PlayStation', icon: Gamepad2 },
    { id: 'vr', label: 'VR', icon: Gamepad2 },
    { id: 'tv', label: 'טלוויזיה', icon: Tv },
    { id: 'computer', label: 'מחשב', icon: Monitor },
    { id: 'tablet', label: 'טאבלט', icon: Tablet },
    { id: 'phone', label: 'טלפון', icon: Smartphone },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'other', label: 'אחר', icon: HelpCircle },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* 1. HEADER */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shadow-lg"
            style={{ borderColor: child?.color || '#38bdf8', backgroundColor: `${child?.color || '#38bdf8'}20` }}
          >
            <Sparkles className="h-6 w-6" style={{ color: child?.color || '#38bdf8' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>שלום, {child?.name}</span>
            </h1>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gold-400 font-cinzel">
                {progress?.rankTitle} (רמה {progress?.level})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flame className="h-3.5 w-3.5" />
                <span>רצף {progress?.currentStreakDays} ימים</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell userRole="child" childId={user?.id} />
          <button
            onClick={() => {
              audio.playTap();
              logout();
            }}
            className="p-2 rounded-xl bg-night-900 border border-purple-500/20 text-purple-400 hover:text-purple-200 active:scale-95 transition"
            title="התנתק"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Status banner */}
      {statusMessage && (
        <div className="rounded-2xl bg-night-900 border border-gold-500/40 p-3.5 text-center text-sm text-gold-300 shadow-md animate-fade-in flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-gold-400/60 hover:text-gold-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. HERO BALANCE: "כמה דקות יש לי?" */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#22184d] to-[#140e33] border-2 border-gold-500/40 p-6 text-center shadow-2xl shadow-purple-950/80">
        <div className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-purple-400/60 font-cinzel">
          Time Balance
        </div>

        <div className="my-2">
          <span className="text-xs font-semibold text-purple-300/80 block mb-1">
            יתרת זמן מסך זמינה
          </span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-gold-300 via-gold-400 to-amber-500 drop-shadow-md tracking-tight">
              {wallet?.availableMinutes ?? 0}
            </span>
            <span className="text-lg font-bold text-gold-300/90 font-alef">
              דקות
            </span>
          </div>
        </div>

        {/* Today Breakdown */}
        <div className="mt-4 pt-4 border-t border-purple-500/20 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/30 py-2 rounded-xl border border-emerald-500/20">
            <TrendingUp className="h-4 w-4" />
            <span>+{wallet?.earnedToday ?? 0} הרווחת היום</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-purple-300/80 font-semibold bg-night-950/50 py-2 rounded-xl border border-purple-500/20">
            <TrendingDown className="h-4 w-4 text-purple-400" />
            <span>-{wallet?.spentToday ?? 0} ניצלת היום</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-5 space-y-1.5 text-right">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-cyan-300 font-cinzel">רמה {progress?.level}</span>
            <span className="text-purple-300">
              עוד {progress?.xpNeededForNext} XP לדרגה הבאה
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-night-950 overflow-hidden border border-purple-500/30 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-500 shadow-glow shadow-cyan-400/50"
              style={{ width: `${progress?.progressPercent ?? 0}%` }}
            />
          </div>
        </div>
      </section>

      {/* 3. QUICK ACTIONS */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            audio.playTap();
            setShowScreenRequestModal(true);
          }}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 active:scale-95 transition-all text-night-950 font-bold text-sm shadow-lg shadow-gold-500/20"
        >
          <Tv className="h-5 w-5" />
          <span>בקש זמן מסך</span>
        </button>

        <button
          disabled={!!activeSession || (wallet?.availableMinutes ?? 0) <= 0}
          onClick={() => {
            audio.playTap();
            setShowSelfUsageModal(true);
          }}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-95 transition-all text-white font-bold text-sm shadow-lg shadow-cyan-950/30 disabled:opacity-40 disabled:active:scale-100"
        >
          <Clock className="h-5 w-5" />
          <span>{activeSession ? 'טיימר פעיל' : 'התחל ניצול זמן'}</span>
        </button>

        <button
          onClick={() => {
            audio.playTap();
            loadHistory();
            setShowHistoryModal(true);
          }}
          className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-night-900 hover:bg-night-850 border border-purple-500/30 active:scale-95 transition-all text-purple-200 font-bold text-sm"
        >
          <History className="h-5 w-5 text-purple-400" />
          <span>היסטוריית דקות</span>
        </button>
      </div>

      {(activeSession || readyScreenRequest) && (
        <section className="rounded-2xl bg-night-900 border border-cyan-500/30 p-4 shadow-lg">
          {activeSession ? (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-300 text-xs font-bold">
                <Clock className="h-4 w-4" />
                <span>
                  {activeSession.mode === 'self'
                    ? activeSession.status === 'paused'
                      ? 'ניצול הזמן מושהה'
                      : 'ניצול זמן פעיל'
                    : activeSession.status === 'paused'
                    ? 'זמן המסך מושהה'
                    : 'זמן מסך פעיל'}
                </span>
              </div>
              <div className="text-5xl font-black font-mono text-white tracking-tight" dir="ltr">
                {activeSession.mode === 'self'
                  ? `${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`
                  : `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`}
              </div>
              <div className="text-[11px] text-purple-300">
                {sources.find((s) => s.id === activeSession.source)?.label || activeSession.source}
                {activeSession.mode === 'self'
                  ? ` · מתוך יתרה של ${Math.round((activeSession.allocated_seconds || 0) / 60)} דקות`
                  : ` · מתוך ${Math.round((activeSession.allocated_seconds || 0) / 60)} דקות`}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeSession.status === 'running' ? (
                  <button
                    disabled={screenSessionBusy}
                    onClick={() => handleScreenSessionAction('pause')}
                    className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    השהה
                  </button>
                ) : (
                  <button
                    disabled={screenSessionBusy}
                    onClick={() => handleScreenSessionAction('resume')}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    המשך
                  </button>
                )}
                <button
                  disabled={screenSessionBusy}
                  onClick={() => handleScreenSessionAction('stop')}
                  className="py-2.5 rounded-xl bg-red-950 border border-red-700/50 text-red-200 text-xs font-bold disabled:opacity-50"
                >
                  סיים
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-cyan-300">זמן מסך שאושר</div>
                <div className="text-sm font-black text-white mt-1">
                  {readyScreenRequest.approved_minutes} דקות · {readyScreenRequest.source}
                </div>
              </div>
              <button
                disabled={screenSessionBusy}
                onClick={() => handleScreenSessionAction('start', readyScreenRequest.id)}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-xs font-bold disabled:opacity-50"
              >
                התחל
              </button>
            </div>
          )}
        </section>
      )}

      {/* Pending approvals alert if any */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Clock4 className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span>{pendingCount} משימות שהגשת מחכות לאישור ההורים</span>
          </div>
        </div>
      )}

      {/* 4. RECOMMENDED NEXT TASK (Highlight) */}
      {recommendedTask && (
        <div className="rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400 font-cinzel">
              משימה מומלצת הבאה
            </span>
            <span className="text-xs font-bold text-gold-400 font-cinzel">
              {recommendedTask.task_kind === 'mandatory' ? 'חובה · XP' : `+${recommendedTask.reward_minutes} דק׳`}
            </span>
          </div>
          <h3 className="font-bold text-white text-base mb-1">{recommendedTask.title}</h3>
          {recommendedTask.description && (
            <p className="text-xs text-purple-300/80 mb-3">{recommendedTask.description}</p>
          )}
          <button
            onClick={() => {
              audio.playTap();
              setSelectedTask(recommendedTask);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            <span>סיימתי את המשימה!</span>
          </button>
        </div>
      )}

      {/* 5. TODAY'S TASKS LIST */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-purple-100 flex items-center gap-2">
            <span>המשימות שלי להיום</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-mono">
              {tasks.length}
            </span>
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-2xl bg-night-900/50 border border-purple-500/20 p-8 text-center text-purple-400/60 text-sm">
            אין משימות פתוחות כרגע. כל הכבוד!
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => {
              const isApproved = task.status === 'approved';
              const isSubmitted = task.status === 'submitted';
              const isRejected = task.status === 'rejected';

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl p-4 border transition-all ${
                    isApproved
                      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                      : isSubmitted
                      ? 'bg-indigo-950/30 border-indigo-500/30'
                      : isRejected
                      ? 'bg-red-950/20 border-red-500/30'
                      : 'bg-night-900/80 border-purple-500/20 hover:border-purple-400/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-bold text-sm ${
                            isApproved ? 'line-through text-purple-300/70' : 'text-purple-100'
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.requires_photo === 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-800/40 text-purple-300 font-medium">
                            צילום
                          </span>
                        )}
                        {task.schedule_type === 'repeatable' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/30 font-bold">
                            אימון חופשי 🔄
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-purple-300/70 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-base font-extrabold text-gold-400 font-cinzel block">
                        {task.task_kind === 'mandatory' ? 'XP' : `+${task.reward_minutes}`}
                      </span>
                      <span className="text-[10px] text-purple-400/70 block">
                        {task.task_kind === 'mandatory' ? 'חובה' : 'דקות'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-purple-500/10 flex items-center justify-between">
                    <div>
                      {isApproved && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>אושר בהצלחה!</span>
                        </span>
                      )}
                      {isSubmitted && (
                        <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                          <Clock4 className="h-3.5 w-3.5 animate-pulse" />
                          <span>נשלח לאישור ההורים</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-xs font-semibold text-red-400">
                          נדחה – ניתן להגיש שוב
                        </span>
                      )}
                    </div>

                    {(!isApproved && !isSubmitted) && (
                      <button
                        onClick={() => {
                          audio.playTap();
                          setSelectedTask(task);
                        }}
                        className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                      >
                        סיימתי!
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL 1: SUBMIT TASK */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">הגשת משימה</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-purple-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-white mb-1">{selectedTask.title}</p>
            <p className="text-xs text-purple-300/80 mb-4">
              {selectedTask.task_kind === 'mandatory'
                ? `משימת חובה · XP בלבד (ערך ${selectedTask.reward_minutes})`
                : `תגמול על סיום: +${selectedTask.reward_minutes} דקות + XP`}
            </p>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  הערה להורים (אופציונלי)
                </label>
                <textarea
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="למשל: סידרתי את כל הצעצועים והשולחן!"
                  rows={2}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-sm text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-gold-400"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTask}
                className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 hover:from-gold-300 hover:to-amber-300 active:scale-95 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-gold-500/20 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{submittingTask ? 'שולח לאישור...' : 'שלח לאישור ההורים'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {showTimeUpAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-night-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border-2 border-amber-400/70 p-7 text-center shadow-2xl shadow-amber-950/40">
            <div className="text-6xl mb-3" aria-hidden="true">⏰</div>
            <h3 className="text-2xl font-black text-gold-300 mb-2">הזמן נגמר!</h3>
            <p className="text-sm text-purple-200 mb-6">
              זמן המסך הסתיים. אפשר לעצור עכשיו ולחזור כשיהיו דקות זמינות.
            </p>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setShowTimeUpAlert(false);
              }}
              className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 hover:from-gold-300 hover:to-amber-300 active:scale-95 transition"
            >
              הבנתי
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST SCREEN TIME */}
      {showScreenRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-gold-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">בקשת זמן מסך</h3>
              <button
                onClick={() => setShowScreenRequestModal(false)}
                className="p-1 text-purple-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-purple-300 mb-4">
              יתרה נוכחית: <strong className="text-gold-400">{wallet?.availableMinutes ?? 0} דקות</strong>
            </p>

            <form onSubmit={handleRequestScreenTime} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-2">
                  כמה דקות תרצה לבקש?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {quickMinutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        audio.playTap();
                        setCustomRequestMinutes(false);
                        setRequestMinutes(m);
                      }}
                      className={`py-2 rounded-xl text-sm font-bold font-cinzel border transition-all ${
                        !customRequestMinutes && requestMinutes === m
                          ? 'bg-gold-500 text-night-950 border-gold-400 shadow-md'
                          : 'bg-night-950 text-purple-200 border-purple-500/20 hover:border-purple-400/40'
                      }`}
                    >
                      {m} דק׳
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      setCustomRequestMinutes(true);
                    }}
                    className={`col-span-2 py-2 rounded-xl text-sm font-bold border transition-all ${
                      customRequestMinutes
                        ? 'bg-gold-500 text-night-950 border-gold-400 shadow-md'
                        : 'bg-night-950 text-purple-200 border-purple-500/20 hover:border-purple-400/40'
                    }`}
                  >
                    מותאם אישית
                  </button>
                </div>

                {customRequestMinutes && (
                  <div className="mt-3">
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, wallet?.availableMinutes ?? 1)}
                      step="1"
                      inputMode="numeric"
                      value={requestMinutes}
                      onChange={(e) => setRequestMinutes(Number(e.target.value))}
                      placeholder="כמה דקות?"
                      autoFocus
                      className="w-full rounded-xl bg-night-950 border border-gold-500/40 p-3 text-lg font-mono text-center text-white focus:outline-none focus:border-gold-400"
                    />
                    <p className="mt-1.5 text-[10px] text-purple-400 text-center">
                      אפשר לבקש כל מספר דקות עד היתרה הזמינה
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-2">
                  עבור מה זמן המסך?
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {sources.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          audio.playTap();
                          setRequestSource(s.id);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          requestSource === s.id
                            ? 'bg-purple-600/40 border-purple-400 text-white shadow-sm'
                            : 'bg-night-950 text-purple-300 border-purple-500/20 hover:border-purple-400/30'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-gold-400" />
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingRequest || (wallet?.availableMinutes ?? 0) < requestMinutes}
                className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 hover:from-gold-300 hover:to-amber-300 active:scale-95 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-gold-500/20 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                <span>
                  {(wallet?.availableMinutes ?? 0) < requestMinutes
                    ? 'אין מספיק דקות בארנק'
                    : submittingRequest
                    ? 'שולח בקשה...'
                    : `בקש ${requestMinutes} דקות`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SELF-REPORTED USAGE */}
      {showSelfUsageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-cyan-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-cyan-300 font-cinzel">התחל ניצול זמן</h3>
              <button
                onClick={() => setShowSelfUsageModal(false)}
                className="p-1 text-purple-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-purple-300 mb-4 leading-5">
              בחר במה אתה משתמש. הטיימר יספור את הזמן בפועל, ובסיום ינוכו רק הדקות שנוצלו.
            </p>
            <p className="text-xs text-purple-300 mb-4">
              יתרה זמינה: <strong className="text-gold-400">{wallet?.availableMinutes ?? 0} דקות</strong>
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 mb-4">
              {sources.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      setSelfUsageSource(s.id);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      selfUsageSource === s.id
                        ? 'bg-cyan-600/30 border-cyan-400 text-white shadow-sm'
                        : 'bg-night-950 text-purple-300 border-purple-500/20 hover:border-purple-400/30'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gold-400" />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={screenSessionBusy || (wallet?.availableMinutes ?? 0) <= 0}
              onClick={handleStartSelfUsage}
              className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-95 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-950/30 disabled:opacity-40"
            >
              <Clock className="h-4 w-4" />
              <span>{screenSessionBusy ? 'מתחיל...' : 'התחל טיימר'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORY LEDGER */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">היסטוריית דקות</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-purple-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {history.length === 0 ? (
                <p className="text-center text-xs text-purple-400/60 py-6">טרם נרשמה היסטוריה</p>
              ) : (
                history.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-night-950 border border-purple-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-purple-100 block">{tx.reason || 'פעולה'}</span>
                      <span className="text-[10px] text-purple-400/60">
                        {new Date(tx.created_at).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(tx.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>

                    <div className="text-left font-mono font-bold">
                      <span
                        className={`text-sm ${
                          tx.amount > 0 ? 'text-emerald-400' : 'text-purple-300'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} דק׳
                      </span>
                      <span className="text-[10px] text-purple-400/50 block">
                        יתרה: {tx.balance_after}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* REWARD CELEBRATION MODAL */}
      {celebrationEvent && (
        <RewardCelebration
          event={celebrationEvent}
          onDismiss={() => {
            setCelebrationEvent(null);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
};
