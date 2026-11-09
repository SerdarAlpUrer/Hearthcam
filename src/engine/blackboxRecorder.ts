/**
 * HearthCam - Olay Kara Kutusu (Incident Blackbox Video Recording)
 * Kritik anlarda (Mikro-uyku, telefon dikkati, kafa düşmesi, aşırı esneme)
 * olay öncesi ve sonrasını içeren 10 saniyelik video klipleri kaydeder ve arşivler.
 * Mimar: Serdar Alptekin Ürer
 */

import { IncidentClip, DriverEmotion } from '../types';

export class BlackboxRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private rollingChunks: { blob: Blob; time: number }[] = [];
  private stream: MediaStream | null = null;
  private isRecordingPostIncident: boolean = false;
  private pendingIncident: {
    reason: string;
    metrics: { speed: number; bpm: number; perclos: number; stressScore: number; emotion: DriverEmotion };
    preChunks: Blob[];
    thumbnailUrl?: string;
  } | null = null;

  private clips: IncidentClip[] = [];
  private onClipCreatedCallback?: (clip: IncidentClip) => void;
  private lastIncidentTriggerTime: number = 0;

  constructor(onClipCreated?: (clip: IncidentClip) => void) {
    this.onClipCreatedCallback = onClipCreated;
  }

  public initStream(canvasOrVideo: HTMLCanvasElement | HTMLVideoElement) {
    try {
      if (typeof window === 'undefined') return;
      let stream: MediaStream | null = null;
      if (canvasOrVideo instanceof HTMLCanvasElement) {
        stream = canvasOrVideo.captureStream(20);
      } else if (canvasOrVideo instanceof HTMLVideoElement && (canvasOrVideo as any).captureStream) {
        stream = (canvasOrVideo as any).captureStream(20);
      }

      if (!stream) return;
      this.stream = stream;

      const mimeTypes = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const now = Date.now();
          this.rollingChunks.push({ blob: event.data, time: now });
          // Sadece son 12 saniyelik tamponu tut
          while (this.rollingChunks.length > 0 && this.rollingChunks[0].time < now - 12000) {
            this.rollingChunks.shift();
          }

          if (this.isRecordingPostIncident && this.pendingIncident) {
            this.recordedChunks.push(event.data);
          }
        }
      };

      recorder.start(1000); // Her 1 saniyede parça üret
    } catch (e) {
      console.warn('Blackbox MediaRecorder başlatılamadı:', e);
    }
  }

  public triggerIncident(
    reason: string,
    metrics: { speed: number; bpm: number; perclos: number; stressScore: number; emotion: DriverEmotion },
    canvas?: HTMLCanvasElement | null
  ) {
    const now = Date.now();
    // 8 saniye içinde mükerrer olay kaydını engelle
    if (now - this.lastIncidentTriggerTime < 8000) return;
    this.lastIncidentTriggerTime = now;

    let thumbnailUrl: string | undefined = undefined;
    if (canvas) {
      try {
        // Thumbnail üzerine HUD telemetry damgası vur
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 320;
        thumbCanvas.height = 180;
        const ctx = thumbCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, 320, 180);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, 140, 320, 40);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`! ${reason.slice(0, 30)}`, 8, 153);

          ctx.fillStyle = '#38bdf8';
          ctx.font = '10px monospace';
          ctx.fillText(`Hız: ${Math.round(metrics.speed)} km/s | Kalp: ${metrics.bpm} BPM | PERCLOS: %${metrics.perclos}`, 8, 170);
          thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
        }
      } catch (err) {
        console.warn('Blackbox thumbnail oluşturma hatası:', err);
      }
    }

    // MediaRecorder mevcutsa son 7 saniyeyi ve gelecek 3 saniyeyi birleştir
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      const preChunks = this.rollingChunks.map(c => c.blob);
      this.pendingIncident = { reason, metrics, preChunks, thumbnailUrl };
      this.recordedChunks = [];
      this.isRecordingPostIncident = true;

      setTimeout(() => {
        this.finalizeIncident();
      }, 3000);
    } else {
      // Yedek durum: Sadece anlık kanvas snapshot'ı ile olay oluştur
      const clip: IncidentClip = {
        id: `INC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        reason,
        durationSec: 10,
        thumbnailUrl,
        metrics,
      };
      this.clips.unshift(clip);
      if (this.clips.length > 25) this.clips.pop();
      if (this.onClipCreatedCallback) this.onClipCreatedCallback(clip);
    }
  }

  private finalizeIncident() {
    if (!this.pendingIncident) return;
    try {
      const allBlobs = [...this.pendingIncident.preChunks, ...this.recordedChunks];
      const videoBlob = new Blob(allBlobs, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(videoBlob);

      const clip: IncidentClip = {
        id: `INC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        reason: this.pendingIncident.reason,
        durationSec: 10,
        videoUrl,
        thumbnailUrl: this.pendingIncident.thumbnailUrl,
        metrics: this.pendingIncident.metrics,
      };

      this.clips.unshift(clip);
      if (this.clips.length > 25) this.clips.pop();
      if (this.onClipCreatedCallback) this.onClipCreatedCallback(clip);
    } catch (e) {
      console.warn('Olay klibi oluşturulamadı:', e);
    } finally {
      this.pendingIncident = null;
      this.isRecordingPostIncident = false;
      this.recordedChunks = [];
    }
  }

  public getClips(): IncidentClip[] {
    return this.clips;
  }

  public clearClips() {
    this.clips.forEach(clip => {
      if (clip.videoUrl) URL.revokeObjectURL(clip.videoUrl);
    });
    this.clips = [];
  }
}
