import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { EvidenceMediaSource, submitImageEvidence } from '../services/evidence';
import { TaskItem } from '../types';

export const ChildEvidencePanel: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const eligibleTasks = useMemo(
    () => tasks.filter((task) => task.status === 'open' || task.status === 'rejected'),
    [tasks]
  );

  const loadTasks = async () => {
    if (!user?.id) return;
    try {
      const res = await apiRequest<{ tasks: TaskItem[] }>(`/api/child/tasks?childId=${user.id}`);
      const next = res.tasks || [];
      setTasks(next);
      setSelectedTaskId((current) => {
        if (current && next.some((task) => task.id === current && (task.status === 'open' || task.status === 'rejected'))) {
          return current;
        }
        return next.find((task) => task.status === 'open' || task.status === 'rejected')?.id || '';
      });
    } catch (err) {
      console.error('Failed to load evidence tasks', err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  const handleFile = async (file: File | undefined, mediaSource: EvidenceMediaSource) => {
    if (!file || !selectedTaskId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await submitImageEvidence({
        taskInstanceId: selectedTaskId,
        file,
        mediaSource,
        note: note.trim() || undefined,
      });
      setMessage(result.duplicateDetected
        ? 'התיעוד נשמר ונשלח להורה. זוהתה תמונה זהה לתיעוד קודם.'
        : 'התיעוד נשמר ונשלח לבדיקה.');
      setNote('');
      await loadTasks();
    } catch (err: any) {
      setMessage(err?.message || 'לא ניתן היה לשלוח את התיעוד');
    } finally {
      setBusy(false);
      if (cameraInput.current) cameraInput.current.value = '';
      if (galleryInput.current) galleryInput.current.value = '';
    }
  };

  if (!user || user.role !== 'child') return null;

  return (
    <section className="max-w-md mx-auto px-4 pt-4" dir="rtl">
      <div className="rounded-2xl border border-cyan-500/25 bg-night-900/70 shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="w-full px-4 py-3 flex items-center justify-between text-right"
        >
          <span className="flex items-center gap-2 font-bold text-cyan-200">
            <ShieldCheck className="h-5 w-5" />
            תיעוד ביצוע
          </span>
          <span className="text-xs text-purple-300">צילום / צילום מסך</span>
        </button>

        {open && (
          <div className="border-t border-cyan-500/15 p-4 space-y-3">
            {eligibleTasks.length === 0 ? (
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
                    {eligibleTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title} {task.task_kind === 'mandatory' ? '(XP)' : `(+${task.reward_minutes} דק׳)`}
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
                    type="button"
                    disabled={busy}
                    onClick={() => cameraInput.current?.click()}
                    className="rounded-xl bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-50 text-white py-3 px-2 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    צלם עכשיו
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => galleryInput.current?.click()}
                    className="rounded-xl bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 text-white py-3 px-2 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    גלריה / צילום מסך
                  </button>
                </div>

                <input
                  ref={cameraInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0], 'camera_capture')}
                />
                <input
                  ref={galleryInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0], 'gallery_upload')}
                />

                {busy && <p className="text-xs text-cyan-300 text-center">מעבד ושולח את התיעוד...</p>}
              </>
            )}

            {message && (
              <div className="rounded-xl border border-purple-500/25 bg-night-950/70 p-3 text-xs text-purple-100 flex gap-2 items-start">
                <span className="flex-1">{message}</span>
                <button type="button" onClick={() => setMessage(null)} aria-label="סגור">
                  <X className="h-4 w-4 text-purple-400" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
