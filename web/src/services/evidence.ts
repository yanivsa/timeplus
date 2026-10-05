import { apiRequest, apiUpload } from './api';

export type EvidenceMediaSource = 'camera_capture' | 'gallery_upload';
export type EvidenceMediaKind = 'image' | 'screenshot';

export interface EvidenceSubmissionResult {
  submissionId: string;
  status: 'needs_parent_review';
  duplicateDetected: boolean;
  message: string;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const tryType = async (type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await tryType('image/webp', 0.82);
  if (webp) return webp;

  const jpeg = await tryType('image/jpeg', 0.86);
  if (jpeg) return jpeg;

  throw new Error('לא ניתן לעבד את התמונה במכשיר זה');
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fallback below covers older Android WebViews/codecs.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function normalizeEvidenceImage(file: File, maxEdge = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('יש לבחור תמונה תקינה');

  const source = await loadImage(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  if (!sourceWidth || !sourceHeight) throw new Error('לא ניתן לקרוא את ממדי התמונה');

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('לא ניתן לעבד את התמונה');

  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ('close' in source && typeof (source as ImageBitmap).close === 'function') {
    (source as ImageBitmap).close();
  }

  // Re-encoding through Canvas strips EXIF/GPS metadata before upload.
  return canvasToBlob(canvas);
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function submitImageEvidence(params: {
  taskInstanceId: string;
  file: File;
  mediaSource: EvidenceMediaSource;
  note?: string;
}): Promise<EvidenceSubmissionResult & { clientSha256: string }> {
  const normalized = await normalizeEvidenceImage(params.file);
  const clientSha256 = await sha256Blob(normalized);
  const mediaKind: EvidenceMediaKind = params.mediaSource === 'gallery_upload' ? 'screenshot' : 'image';

  const started = await apiRequest<{
    submissionId: string;
  }>('/api/child/evidence/start', {
    method: 'POST',
    body: JSON.stringify({
      taskInstanceId: params.taskInstanceId,
      mediaKind,
      mediaSource: params.mediaSource,
      note: params.note || null,
      clientSha256,
    }),
  });

  await apiUpload(`/api/child/evidence/${started.submissionId}/asset/normalized`, normalized, {
    contentType: normalized.type,
  });

  const result = await apiRequest<EvidenceSubmissionResult>(
    `/api/child/evidence/${started.submissionId}/complete`,
    { method: 'POST', body: JSON.stringify({}) }
  );

  return { ...result, clientSha256 };
}
