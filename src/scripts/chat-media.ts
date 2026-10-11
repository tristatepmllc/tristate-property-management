/**
 * Shared browser helpers for chat photos and voice notes (visitor widget
 * and admin inbox).
 */

/**
 * Downscale a photo before upload (longest side 1600px, JPEG 85%) so a
 * 10 MB phone photo goes up as a few hundred KB. GIF/HEIC, or anything the
 * browser cannot decode, is sent unchanged (the server still enforces 8 MB).
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export const MAX_VOICE_MS = 120_000;

function pickMime(): string {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  for (const t of options) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Voice note recorder. start() asks for the microphone; stop() resolves
 * with the recording; cancel() throws it away. Auto-stops at 2 minutes and
 * calls onLimit so the UI can send it.
 */
export class VoiceRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private limitTimer: number | undefined;
  onLimit: (() => void) | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickMime();
    this.rec = mime ? new MediaRecorder(this.stream, { mimeType: mime }) : new MediaRecorder(this.stream);
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.rec.start(250);
    this.startedAt = Date.now();
    this.limitTimer = window.setTimeout(() => this.onLimit?.(), MAX_VOICE_MS);
  }

  elapsed(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  stop(): Promise<{ file: File; durationMs: number }> {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      if (!rec) return reject(new Error('not recording'));
      const durationMs = this.elapsed();
      rec.onstop = () => {
        const type = (rec.mimeType || 'audio/webm').split(';')[0];
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File(this.chunks, `voice.${ext}`, { type });
        this.release();
        resolve({ file, durationMs });
      };
      rec.stop();
    });
  }

  cancel(): void {
    try {
      if (this.rec) {
        this.rec.onstop = null;
        if (this.rec.state !== 'inactive') this.rec.stop();
      }
    } catch {
      /* ignore */
    }
    this.release();
  }

  private release(): void {
    window.clearTimeout(this.limitTimer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
    this.startedAt = 0;
  }
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
