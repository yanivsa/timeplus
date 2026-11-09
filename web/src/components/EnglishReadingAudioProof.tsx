import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, Send, Trash2 } from 'lucide-react';
import { EvidenceMediaSource, MAX_AUDIO_EVIDENCE_BYTES, submitAudioEvidence } from '../services/evidence';
import { TaskItem } from '../types';

/** Match Hebrew or English labels while avoiding other unrelated English exercises. */
export function isEnglishReadingTask(task: Pick<TaskItem, 'title' | 'description'>): boolean {
  const text = `${task.title || ''} ${task.description || ''}`;
  return /(?:english|אנגלי)/i.test(text) && /(?:קריא|הקרא|reading|read\b)/i.test(text);
}

const MAX_RECORDING_MS = 5 * 60 * 1000;

interface Props {
  taskInstanceId: string;
  note?: string;
  disabled?: boolean;
  onUploaded?: () => void | Promise<void>;
}

export const EnglishReadingAudioProof: React.FC<Props> = ({
  taskInstanceId, note, disabled = false, onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<EvidenceMediaSource>('gallery_upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupRecorder = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    tickRef.current = null;
    timeoutRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => {
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      if (recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    }
    cleanupRecorder();
  }, []);

  const startRecording = async () => {
    if (disabled || uploading || recording) return;
    setMessage('');
    setFile(null);
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setMessage('המכשיר אינו מאפשר הקלטה ישירה. אפשר להקליט באמצעות אפליקציית ההקלטה בטלפון ולצרף את הקובץ.');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      const started = Date.now();
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setMessage('אירעה שגיאה בהקלטה. נסה שוב או בחר קובץ קיים.');
        cleanupRecorder();
        setRecording(false);
      };
      recorder.onstop = () => {
        cleanupRecorder();
        setRecording(false);
        const type = recorder.mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setMessage('לא נקלט שמע. נסה להקליט שוב.');
          return;
        }
        const extension = type === 'audio/mp4' ? 'm4a' : 'webm';
        setFile(new File([blob], `english-reading-${Date.now()}.${extension}`, { type }));
        setSource('microphone_recording');
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      streamRef.current = stream;
      setElapsed(0);
      setRecording(true);
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
      timeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_RECORDING_MS);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setMessage('הגישה למיקרופון לא אושרה או אינה זמינה. ניתן לצרף הקלטה קיימת מהטלפון.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const selectFile = (next: File | undefined) => {
    if (!next || disabled || uploading || recording) return;
    setMessage('');
    if (next.size > MAX_AUDIO_EVIDENCE_BYTES) {
      setFile(null);
      setMessage('הקובץ גדול מ-20MB. בחר הקלטה קצרה יותר.');
      return;
    }
    setFile(next);
    setSource('gallery_upload');
  };

  const upload = async () => {
    if (!file || recording || uploading || disabled) return;
    setUploading(true);
    setMessage('');
    try {
      await submitAudioEvidence({ taskInstanceId, file, mediaSource: source, note });
      setMessage('הקריאה נשלחה להאזנה ולאישור ההורים.');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      if (onUploaded) Promise.resolve(onUploaded()).catch(console.error);
    } catch (error: any) {
      setMessage(error?.message || 'שליחת ההקלטה נכשלה. אפשר לנסות שוב.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3" dir="rtl">
      <p className="text-sm font-bold text-cyan-200">הקלטת קריאה באנגלית</p>
      <p className="text-xs text-purple-200">אורי מקריא את הקטע באנגלית. הקלט או צרף קובץ קיים, האזן ואז שלח לאישור.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={recording ? stopRecording : startRecording}
          className="rounded-xl bg-cyan-700 text-white p-3 font-bold text-xs flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {recording ? `עצור (${elapsed} שנ׳)` : 'הקלט עכשיו'}
        </button>
        <button
          type="button"
          disabled={disabled || uploading || recording}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-purple-700 text-white p-3 font-bold text-xs flex justify-center items-center gap-2 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          העלה הקלטה
        </button>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.aac"
        onChange={(e) => selectFile(e.target.files?.[0])}
      />
      {recording && <p role="status" className="text-xs text-cyan-300">מקליט... עד 5 דקות. לחץ ״עצור״ לסיום.</p>}
      {file && previewUrl && (
        <div className="space-y-2">
          <p className="text-xs text-purple-200">האזן להקלטה לפני ההגשה ({(file.size / (1024 * 1024)).toFixed(1)} MB)</p>
          <audio controls preload="metadata" src={previewUrl} className="w-full" />
          <div className="flex gap-2">
            <button type="button" onClick={upload} disabled={uploading || disabled}
              className="flex-1 rounded-xl bg-emerald-700 p-3 text-xs text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {uploading ? 'מעלה הקלטה...' : 'שלח להורים'}
            </button>
            <button type="button" disabled={uploading} onClick={() => setFile(null)}
              aria-label="מחק הקלטה שנבחרה" className="rounded-xl bg-night-900 text-purple-200 p-3">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {message && <p role="status" className="text-xs text-cyan-200">{message}</p>}
    </div>
  );
};
