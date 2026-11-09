import React, { useEffect, useState } from 'react';
import { apiMediaBlob } from '../services/api';

interface Props {
  src: string;
  className?: string;
  autoLoad?: boolean;
}

/**
 * An <audio src="/api/..."> request cannot forward an in-memory Bearer token.
 * The Android app can restore a session from native storage even if its
 * HttpOnly cookie was cleared. Fetch the protected file with the same
 * authentication as the rest of the app, then play a short-lived object URL.
 */
export const AuthenticatedEvidenceAudio: React.FC<Props> = ({
  src, className = 'w-full', autoLoad = false,
}) => {
  const [requested, setRequested] = useState(autoLoad);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequested(autoLoad);
    setPlaybackUrl(null);
    setError('');
  }, [src, autoLoad]);

  useEffect(() => {
    if (!requested || !src) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError('');

    apiMediaBlob(src)
      .then((blob) => {
        if (!blob.size || !blob.type.startsWith('audio/')) {
          throw new Error('קובץ ההקלטה אינו זמין או אינו תקין');
        }
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setPlaybackUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'לא ניתן לטעון את ההקלטה');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, requested]);

  return (
    <div className={className}>
      {!requested && (
        <button type="button" onClick={() => setRequested(true)}
          className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-300">
          האזן להקלטה
        </button>
      )}
      {loading && <p role="status" className="text-xs text-cyan-300">טוען הקלטה…</p>}
      {error && (
        <div className="space-y-1">
          <p role="alert" className="text-xs text-red-300">{error}</p>
          <button type="button" onClick={() => {
            setRequested(false);
            setPlaybackUrl(null);
          }} className="text-xs text-cyan-300 underline">נסה שוב</button>
        </div>
      )}
      {playbackUrl && !error && (
        <audio controls preload="metadata" src={playbackUrl} className="w-full" />
      )}
    </div>
  );
};
