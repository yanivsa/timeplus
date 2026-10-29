import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Film, ImagePlus, ShieldCheck, Video, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  EvidenceMediaSource,
  submitImageEvidence,
  submitVideoEvidence,
} from '../services/evidence';
import { TaskItem } from '../types';

const isReportableTask = (t: TaskItem) =>
  (t.status === 'open' || t.status === 'rejected') &&
  !t.title.includes('סיום משימות יומיות');

export const ChildEvidencePanel: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const vcam = useRef<HTMLInputElement>(null);
  const vgal = useRef<HTMLInputElement>(null);

  const eligible = useMemo(() => tasks.filter(isReportableTask), [tasks]);
  const selected = eligible.find((t) => t.id === selectedTaskId) || null;
  const videoAllowed = Number(selected?.allow_video_proof || 0) === 1;

  const load = async (): Promise<TaskItem[]> => {
    if (!user?.id) return [];
    try {
      const r = await apiRequest<{ tasks: TaskItem[] }>(`/api/child/tasks?childId=${user.id}`);
      const nextTasks = r.tasks || [];
      setTasks(nextTasks);
      setSelectedTaskId((current) =>
        current && nextTasks.some((t) => t.id === current && isReportableTask(t))
          ? current
          : nextTasks.find(isReportableTask)?.id || ''
      );
      return nextTasks;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Keep the reporting categories fresh while the panel is open. This is a
  // cheap, scoped poll and avoids requiring the child to close/reopen the app.
  useEffect(() => {
    if (!open || !user?.id) return;
    const interval = window.setInterval(load, 3000);
    return () => window.clearInterval(interval);
  }, [open, user?.id]);

  // Repeatable tasks are regenerated server-side after a submission. Retry for
  // a short bounded window so the successor appears immediately even if the
  // first request races the background regeneration.
  const refreshAfterSubmission = async (submittedTemplateId: string | null) => {
    const delays = [0, 150, 350, 700, 1200];
    for (const delay of delays) {
      if (delay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      }
      const nextTasks = await load();
      if (
        !submittedTemplateId ||
        nextTasks.some(
          (t) => t.template_id === submittedTemplateId && isReportableTask(t)
        )
      ) {
        return;
      }
    }
  };

  const msg = (r: { duplicateDetected: boolean; status: string }) =>
    r.duplicateDetected
      ? 'התיעוד נשמר. זוהתה ראיה זהה ולכן היא תיבדק ידנית.'
      : r.status === 'pending_ai'
      ? 'התיעוד נשמר ונשלח לאימות.'
      : r.status === 'verified'
      ? 'התיעוד אומת.'
      : 'התיעוד נשמר ונשלח לבדיקה.';

  const image = async (f: File | undefined, source: EvidenceMediaSource) => {
    if (!f || !selectedTaskId || busy) return;
    const submittedTemplateId = selected?.template_id || null;
    setBusy(true);
    setMessage(null);
    try {
      const r = await submitImageEvidence({
        taskInstanceId: selectedTaskId,
        file: f,
        mediaSource: source,
        note: note.trim() || undefined,
      });
      setMessage(msg(r));
      setNote('');
      await refreshAfterSubmission(submittedTemplateId);
    } catch (e: any) {
      setMessage(e?.message || 'לא ניתן היה לשלוח את התיעוד');
    } finally {
      setBusy(false);
      if (cam.current) cam.current.value = '';
      if (gal.current) gal.current.value = '';
    }
  };

  const video = async (f: File | undefined, source: EvidenceMediaSource) => {
    if (!f || !selectedTaskId || busy) return;
    const submittedTemplateId = selected?.template_id || null;
    setBusy(true);
    setMessage(null);
    try {
      const r = await submitVideoEvidence({
        taskInstanceId: selectedTaskId,
        file: f,
        mediaSource: source,
        note: note.trim() || undefined,
      });
      setMessage(`${msg(r)} (${r.duration.toFixed(1)} שנ׳)`);
      setNote('');
      await refreshAfterSubmission(submittedTemplateId);
    } catch (e: any) {
      setMessage(e?.message || 'לא ניתן היה לשלוח את הווידאו');
    } finally {
      setBusy(false);
      if (vcam.current) vcam.current.value = '';
      if (vgal.current) vgal.current.value = '';
    }
  };

  if (!user || user.role !== 'child') return null;

  return (
    <section className="max-w-md mx-auto px-4 pt-4" dir="rtl">
      <div className="rounded-2xl border border-cyan-500/25 bg-night-900/70 shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-right"
        >
          <span className="flex items-center gap-2 font-bold text-cyan-200">
            <ShieldCheck className="h-5 w-5" />
            תיעוד ביצוע
          </span>
          <span className="text-xs text-purple-300">צילום / מסך / וידאו</span>
        </button>

        {open && (
          <div className="border-t border-cyan-500/15 p-4 space-y-3">
            {eligible.length === 0 ? (
              <p className="text-sm text-purple-300">אין כרגע משימה פתוחה שאפשר לתעד.</p>
            ) : (
              <>
                <label className="block text-xs font-semibold text-purple-200">
                  עבור איזו משימה?
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    disabled={busy}
                    className="mt-1.5 w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-sm text-white"
                  >
                    {eligible.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} {t.task_kind === 'mandatory' ? '(XP)' : `(+${t.reward_minutes} דק׳)`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold text-purple-200">
                  הערה להורים (אופציונלי)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={busy}
                    rows={2}
                    maxLength={1000}
                    className="mt-1.5 w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-sm text-white"
                    placeholder="מה עשית?"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={busy}
                    onClick={() => cam.current?.click()}
                    className="rounded-xl bg-cyan-600/80 text-white py-3 px-2 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    צלם עכשיו
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => gal.current?.click()}
                    className="rounded-xl bg-purple-600/80 text-white py-3 px-2 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    גלריה / צילום מסך
                  </button>
                  {videoAllowed && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => vcam.current?.click()}
                        className="rounded-xl bg-cyan-700/80 text-white py-3 px-2 font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Video className="h-4 w-4" />
                        צלם וידאו
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => vgal.current?.click()}
                        className="rounded-xl bg-purple-700/80 text-white py-3 px-2 font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Film className="h-4 w-4" />
                        וידאו מהגלריה
                      </button>
                    </>
                  )}
                </div>

                {videoAllowed && (
                  <p className="text-[11px] text-purple-400">
                    וידאו: עד 30 שניות ועד 25MB. ל-AI נשלחים פריימים בלבד; הווידאו נשמר כראיה פרטית.
                  </p>
                )}

                <input
                  ref={cam}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => image(e.target.files?.[0], 'camera_capture')}
                />
                <input
                  ref={gal}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => image(e.target.files?.[0], 'gallery_upload')}
                />
                <input
                  ref={vcam}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => video(e.target.files?.[0], 'camera_capture')}
                />
                <input
                  ref={vgal}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => video(e.target.files?.[0], 'gallery_upload')}
                />

                {busy && (
                  <p className="text-xs text-cyan-300 text-center">מעבד ושולח את התיעוד...</p>
                )}
              </>
            )}

            {message && (
              <div className="rounded-xl border border-purple-500/25 bg-night-950/70 p-3 text-xs text-purple-100 flex gap-2">
                <span className="flex-1">{message}</span>
                <button onClick={() => setMessage(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
