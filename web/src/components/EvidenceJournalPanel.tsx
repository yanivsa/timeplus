import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, ChevronUp, Image, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface EvidenceRow {
  id: string;
  task_instance_id: string;
  child_id: string;
  child_name: string;
  child_color: string;
  task_title: string;
  task_status: string;
  reward_minutes: number;
  task_kind: 'mandatory' | 'bonus';
  submitted_at: string;
  verification_status: string | null;
  verification_summary: string | null;
  review_mode: 'automatic' | 'parent';
  media_kind: 'image' | 'screenshot' | 'video';
  media_source: 'camera_capture' | 'gallery_upload' | 'unknown';
  evidence_expires_at: string | null;
  preview_asset_id: string | null;
  active_asset_count: number;
  duplicate_detected: number | null;
}

interface EvidenceListResponse {
  submissions: EvidenceRow[];
  storage: {
    activeBytes: number;
    warningAtBytes: number;
    videoRetentionReductionAtBytes: number;
    videoStopAtBytes: number;
  };
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Jerusalem',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function sourceLabel(source: EvidenceRow['media_source']): string {
  if (source === 'camera_capture') return 'צולם עכשיו';
  if (source === 'gallery_upload') return 'נבחר מהגלריה';
  return 'מקור לא ידוע';
}

function statusLabel(status: string | null): string {
  if (status === 'needs_parent_review') return 'ממתין לבדיקה';
  if (status === 'verified') return 'אומת';
  if (status === 'ai_unavailable') return 'AI לא זמין — בדיקה ידנית';
  if (status === 'rejected_by_ai') return 'דורש בדיקה';
  if (status === 'uploading') return 'בהעלאה';
  return status || 'ידני';
}

export const EvidenceJournalPanel: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EvidenceListResponse>({ submissions: [], storage: { activeBytes: 0, warningAtBytes: 0, videoRetentionReductionAtBytes: 0, videoStopAtBytes: 0 } });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!user || user.role !== 'parent') return;
    setLoading(true);
    try {
      const response = await apiRequest<EvidenceListResponse>('/api/parent/evidence?limit=30');
      setData(response);
    } catch (err: any) {
      if (err?.status !== 404) setMessage(err?.message || 'לא ניתן לטעון את יומן הביצועים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, user?.id]);

  const review = async (row: EvidenceRow, approved: boolean) => {
    try {
      if (approved) {
        await apiRequest(`/api/parent/tasks/${row.task_instance_id}/approve`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        setMessage(`המשימה של ${row.child_name} אושרה.`);
      } else {
        await apiRequest(`/api/parent/tasks/${row.task_instance_id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'הראיה אינה מספיקה' }),
        });
        setMessage(`המשימה של ${row.child_name} הוחזרה להגשה מחדש.`);
      }
      await load();
    } catch (err: any) {
      setMessage(err?.message || 'הטיפול בתיעוד נכשל');
    }
  };

  if (!user || user.role !== 'parent') return null;
  const activeMb = data.storage.activeBytes / (1024 * 1024);

  return (
    <section className="max-w-5xl mx-auto px-4 pt-4" dir="rtl">
      <div className="rounded-2xl border border-cyan-500/25 bg-night-900/70 overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="w-full px-4 py-3 flex items-center justify-between text-right"
        >
          <span className="flex items-center gap-2 font-bold text-cyan-200">
            <ShieldCheck className="h-5 w-5" />
            יומן ביצועים
            {data.submissions.filter((item) => item.task_status === 'submitted').length > 0 && (
              <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-xs">
                {data.submissions.filter((item) => item.task_status === 'submitted').length}
              </span>
            )}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {open && (
          <div className="border-t border-cyan-500/15 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-300">
              <span>מדיה פעילה: {activeMb < 1 ? `${Math.round(activeMb * 1024)} KB` : `${activeMb.toFixed(1)} MB`}</span>
              <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1 text-cyan-300">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> רענן
              </button>
            </div>

            {message && <div className="rounded-xl bg-night-950 border border-purple-500/25 p-2.5 text-xs text-purple-100">{message}</div>}

            {loading && data.submissions.length === 0 ? (
              <p className="text-sm text-purple-300">טוען תיעוד...</p>
            ) : data.submissions.length === 0 ? (
              <p className="text-sm text-purple-300">עדיין לא הוגש תיעוד.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.submissions.map((row) => (
                  <article key={row.id} className="rounded-2xl bg-night-950/80 border border-purple-500/20 p-3 flex gap-3">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-night-900 border border-purple-500/20 shrink-0 flex items-center justify-center">
                      {row.preview_asset_id ? (
                        row.media_kind === 'video' ? (
                          <video
                            src={`/api/parent/evidence/${row.id}/media/${row.preview_asset_id}`}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={`/api/parent/evidence/${row.id}/media/${row.preview_asset_id}`}
                            alt="תיעוד ביצוע"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : row.media_source === 'camera_capture' ? (
                        <Camera className="h-7 w-7 text-purple-400" />
                      ) : (
                        <Image className="h-7 w-7 text-purple-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div>
                        <p className="font-bold text-sm text-white truncate">{row.child_name} · {row.task_title}</p>
                        <p className="text-[11px] text-purple-300">{formatDate(row.submitted_at)} · {sourceLabel(row.media_source)}</p>
                      </div>
                      <p className="text-xs text-cyan-300">{statusLabel(row.verification_status)}</p>
                      {row.duplicate_detected ? <p className="text-[11px] text-amber-300">זוהתה ראיה זהה להגשה קודמת</p> : null}
                      {row.verification_summary && <p className="text-[11px] text-purple-300 line-clamp-2">{row.verification_summary}</p>}
                      <p className="text-[10px] text-purple-500">מדיה עד: {formatDate(row.evidence_expires_at)}</p>

                      {row.task_status === 'submitted' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => review(row, true)}
                            className="flex-1 rounded-lg bg-emerald-600/80 text-white py-1.5 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> אשר
                          </button>
                          <button
                            type="button"
                            onClick={() => review(row, false)}
                            className="flex-1 rounded-lg bg-red-600/70 text-white py-1.5 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> החזר
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
