import { apiRequest, apiUpload } from './api';
export type EvidenceMediaSource = 'camera_capture' | 'gallery_upload' | 'microphone_recording';
export type EvidenceMediaKind = 'image' | 'screenshot' | 'video' | 'audio';
export interface EvidenceSubmissionResult { submissionId:string; status:'pending_ai'|'needs_parent_review'|'ai_unavailable'|'verified'|'rejected_by_ai'; duplicateDetected:boolean; message:string; }
async function canvasToBlob(canvas:HTMLCanvasElement,quality=.82):Promise<Blob>{ const f=(t:string,q?:number)=>new Promise<Blob|null>(r=>canvas.toBlob(r,t,q)); const w=await f('image/webp',quality); if(w)return w; const j=await f('image/jpeg',Math.min(.88,quality+.04)); if(j)return j; throw new Error('לא ניתן לעבד את המדיה במכשיר זה'); }
async function loadImage(file:File):Promise<ImageBitmap|HTMLImageElement>{ if('createImageBitmap' in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{}} const u=URL.createObjectURL(file); try{const i=new Image();i.decoding='async';i.src=u;await i.decode();return i;}finally{URL.revokeObjectURL(u)} }
export async function normalizeEvidenceImage(file:File,maxEdge=1600):Promise<Blob>{ if(!file.type.startsWith('image/'))throw new Error('יש לבחור תמונה תקינה'); const src=await loadImage(file), sw=src.width, sh=src.height; if(!sw||!sh)throw new Error('לא ניתן לקרוא את ממדי התמונה'); const scale=Math.min(1,maxEdge/Math.max(sw,sh)), w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale)); const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});if(!x)throw new Error('לא ניתן לעבד את התמונה');x.drawImage(src as CanvasImageSource,0,0,w,h);if('close' in src && typeof (src as ImageBitmap).close==='function')(src as ImageBitmap).close();return canvasToBlob(c); }
export async function sha256Blob(blob:Blob):Promise<string>{const d=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));return Array.from(d,b=>b.toString(16).padStart(2,'0')).join('');}
async function waitMeta(v:HTMLVideoElement){if(v.readyState>=1&&Number.isFinite(v.duration))return;await new Promise<void>((res,rej)=>{const t=setTimeout(()=>rej(new Error('לא ניתן לקרוא את הווידאו')),10000);v.addEventListener('loadedmetadata',()=>{clearTimeout(t);res()},{once:true});v.addEventListener('error',()=>{clearTimeout(t);rej(new Error('פורמט הווידאו אינו נתמך במכשיר זה'))},{once:true});});}
async function seek(v:HTMLVideoElement,time:number){if(Math.abs(v.currentTime-time)<.03&&v.readyState>=2)return;await new Promise<void>((res,rej)=>{const t=setTimeout(()=>rej(new Error('לא ניתן לדגום את הווידאו')),8000);v.addEventListener('seeked',()=>{clearTimeout(t);res()},{once:true});try{v.currentTime=Math.max(0,Math.min(time,Math.max(0,v.duration-.02)))}catch(e){clearTimeout(t);rej(e)}});}
export async function extractVideoEvidence(file:File):Promise<{contactSheet:Blob;keyframes:Blob[];duration:number}>{ if(!file.type.startsWith('video/'))throw new Error('יש לבחור קובץ וידאו תקין'); if(file.size>25*1024*1024)throw new Error('הווידאו גדול מ-25MB'); const u=URL.createObjectURL(file),v=document.createElement('video');v.preload='metadata';v.muted=true;v.playsInline=true;v.src=u;try{await waitMeta(v);const duration=Number(v.duration);if(!Number.isFinite(duration)||duration<=0)throw new Error('לא ניתן לקרוא את משך הווידאו');if(duration>30.25)throw new Error('אפשר לשלוח וידאו באורך של עד 30 שניות');const sw=v.videoWidth||1280,sh=v.videoHeight||720,cw=400,ch=Math.max(220,Math.round(cw*sh/sw)),sheet=document.createElement('canvas');sheet.width=cw*2;sheet.height=ch*4;const ctx=sheet.getContext('2d',{alpha:false});if(!ctx)throw new Error('לא ניתן לעבד את הווידאו');const times=Array.from({length:8},(_,i)=>duration<=.2?0:duration*i/7),keys=new Set([0,3,7]),frames:Blob[]=[];for(let i=0;i<8;i++){await seek(v,times[i]);const col=i%2,row=Math.floor(i/2);ctx.drawImage(v,col*cw,row*ch,cw,ch);ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(col*cw+6,row*ch+ch-32,92,26);ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText(`${times[i].toFixed(1)}s`,col*cw+12,row*ch+ch-13);if(keys.has(i)){const f=document.createElement('canvas'),scale=Math.min(1,1280/sw);f.width=Math.max(1,Math.round(sw*scale));f.height=Math.max(1,Math.round(sh*scale));f.getContext('2d',{alpha:false})?.drawImage(v,0,0,f.width,f.height);frames.push(await canvasToBlob(f,.84));}}return{contactSheet:await canvasToBlob(sheet,.82),keyframes:frames,duration};}finally{URL.revokeObjectURL(u);v.removeAttribute('src');v.load();}}
async function complete(id:string){return apiRequest<EvidenceSubmissionResult>(`/api/child/evidence/${id}/complete`,{method:'POST',body:JSON.stringify({})});}
export const MAX_EVIDENCE_IMAGES = 10;
export interface EvidenceImageFile { file: File; mediaSource: EvidenceMediaSource; }
export async function submitImagesEvidence(p: { taskInstanceId: string; files: EvidenceImageFile[]; note?: string }): Promise<EvidenceSubmissionResult> {
  if (!p.files.length || p.files.length > MAX_EVIDENCE_IMAGES) {
    throw new Error('אפשר לצרף בין תמונה אחת לעשר תמונות לפעילות');
  }
  for (const { file } of p.files) {
    if (!file.type.startsWith('image/')) throw new Error('יש לבחור תמונות בלבד');
  }
  // A camera image must not be classified as a trusted screenshot for AI auto-approval.
  const allGallery = p.files.every(({ mediaSource }) => mediaSource === 'gallery_upload');
  const mediaKind: EvidenceMediaKind = allGallery ? 'screenshot' : 'image';
  const mediaSource: EvidenceMediaSource = allGallery ? 'gallery_upload' : 'camera_capture';
  const start = await apiRequest<{ submissionId: string }>('/api/child/evidence/start', {
    method: 'POST',
    body: JSON.stringify({ taskInstanceId: p.taskInstanceId, mediaKind, mediaSource, note: p.note || null }),
  });
  // Upload sequentially to avoid browser memory spikes and preserve a single submission.
  // Complete exactly once, only after all images have been accepted by the server.
  for (const { file } of p.files) {
    const normalized = await normalizeEvidenceImage(file);
    await apiUpload(`/api/child/evidence/${start.submissionId}/asset/normalized`, normalized, { contentType: normalized.type });
  }
  return complete(start.submissionId);
}
export async function submitImageEvidence(p:{taskInstanceId:string;file:File;mediaSource:EvidenceMediaSource;note?:string}) {
  return submitImagesEvidence({ taskInstanceId:p.taskInstanceId, files:[{file:p.file,mediaSource:p.mediaSource}], note:p.note });
}
export async function submitVideoEvidence(p:{taskInstanceId:string;file:File;mediaSource:EvidenceMediaSource;note?:string}){if(p.file.size>25*1024*1024)throw new Error('הווידאו גדול מ-25MB');const ex=await extractVideoEvidence(p.file);const st=await apiRequest<{submissionId:string}>('/api/child/evidence/start',{method:'POST',body:JSON.stringify({taskInstanceId:p.taskInstanceId,mediaKind:'video',mediaSource:p.mediaSource,note:p.note||null})});await apiUpload(`/api/child/evidence/${st.submissionId}/asset/original`,p.file,{contentType:p.file.type||'video/mp4'});await apiUpload(`/api/child/evidence/${st.submissionId}/asset/contact_sheet`,ex.contactSheet,{contentType:ex.contactSheet.type});for(const f of ex.keyframes)await apiUpload(`/api/child/evidence/${st.submissionId}/asset/keyframe`,f,{contentType:f.type});return{...(await complete(st.submissionId)),duration:ex.duration};}


const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  webm: 'audio/webm', m4a: 'audio/mp4', mp4: 'audio/mp4',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg',
  wav: 'audio/wav', aac: 'audio/aac',
};
const AUDIO_MIME_TYPES = new Set(Object.values(AUDIO_MIME_BY_EXTENSION));
// Android voice recorders may use vendor MIME aliases for otherwise standard M4A/WAV/MP3 files.
// The Worker validates the actual file header, so a mislabeled file cannot bypass verification.
const AUDIO_MIME_ALIASES: Record<string, string> = {
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/mp3': 'audio/mpeg',
  'audio/x-mp3': 'audio/mpeg',
  'audio/x-aac': 'audio/aac',
};
export const MAX_AUDIO_EVIDENCE_BYTES = 20 * 1024 * 1024;

/** The parent approves listening tasks manually; never classify audio as visual AI proof. */
export async function submitAudioEvidence(p: {
  taskInstanceId: string;
  file: File;
  mediaSource: EvidenceMediaSource;
  note?: string;
}): Promise<EvidenceSubmissionResult> {
  if (!p.file.size) throw new Error('לא נמצאה הקלטה לשליחה');
  if (p.file.size > MAX_AUDIO_EVIDENCE_BYTES) throw new Error('ההקלטה גדולה מ-20MB');
  const extension = p.file.name.split('.').pop()?.toLowerCase() || '';
  const declaredType = p.file.type.split(';')[0].toLowerCase();
  const normalizedType = AUDIO_MIME_ALIASES[declaredType] || declaredType;
  const contentType = AUDIO_MIME_TYPES.has(normalizedType)
    ? normalizedType
    : (!declaredType || declaredType === 'application/octet-stream' || declaredType.startsWith('audio/'))
      ? AUDIO_MIME_BY_EXTENSION[extension]
      : undefined;
  if (!contentType || !AUDIO_MIME_TYPES.has(contentType)) {
    throw new Error('יש לבחור קובץ שמע מסוג MP3, M4A, WebM, OGG, WAV או AAC');
  }
  const start = await apiRequest<{ submissionId: string }>('/api/child/evidence/start', {
    method: 'POST',
    body: JSON.stringify({
      taskInstanceId: p.taskInstanceId,
      mediaKind: 'audio',
      mediaSource: p.mediaSource,
      note: p.note?.trim() || null,
    }),
  });
  await apiUpload(`/api/child/evidence/${start.submissionId}/asset/original`, p.file, { contentType });
  return complete(start.submissionId);
}
