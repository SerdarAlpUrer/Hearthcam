import React, { useEffect, useRef } from 'react';
import { Activity, Heart, Zap } from 'lucide-react';

interface PulseWaveformProps {
  bvpHistory: number[];
  bpm: number;
  confidence: number;
  snr: number;
  algorithm: string;
}

export const PulseWaveform: React.FC<PulseWaveformProps> = ({
  bvpHistory,
  bpm,
  confidence,
  snr,
  algorithm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Arka planı temizle
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    // EKG ızgarası (Grid lines)
    ctx.strokeStyle = '#142036';
    ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Orta referans çizgisi
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!bvpHistory || bvpHistory.length < 2) {
      // Bekleme çizgisi
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    // Sinyal min-max normalizasyonu
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const v of bvpHistory) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const range = Math.max(0.0001, maxVal - minVal);

    const stepX = width / (bvpHistory.length - 1);
    const paddingY = 16;
    const usableHeight = height - paddingY * 2;

    // Nabız Dalgası Gradyanı ve Çizimi
    ctx.save();
    ctx.beginPath();

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < bvpHistory.length; i++) {
      const x = i * stepX;
      // Normalleştir ve ortala
      const norm = (bvpHistory[i] - minVal) / range;
      // Ters çevir (kan hacmi artınca y ekseninde yukarı çıksın)
      const y = height - (paddingY + norm * usableHeight);
      points.push({ x, y });

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Yumuşak eğri (Bezier)
        const prev = points[i - 1];
        const xc = (prev.x + x) / 2;
        const yc = (prev.y + y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
      }
    }

    // Parıltı efekti (Glow)
    ctx.strokeStyle = confidence > 40 ? '#06b6d4' : '#64748b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = confidence > 40 ? '#06b6d4' : '#000000';
    ctx.shadowBlur = confidence > 40 ? 10 : 0;
    ctx.stroke();

    // Alt alanı hafif renkle doldur
    if (points.length > 0) {
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
      fillGradient.addColorStop(0, confidence > 40 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(100, 116, 139, 0.1)');
      fillGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = fillGradient;
      ctx.fill();
    }

    // En uçtaki güncel sinyal noktası (Pulsing Dot)
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.fill();
    }

    ctx.restore();
  }, [bvpHistory, confidence]);

  // Kalp atış animasyon periyodu (BPM'e göre)
  const pulseDuration = bpm > 40 ? `${(60 / bpm).toFixed(2)}s` : '1s';

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-sm tracking-wide text-slate-200">
            KAN HACMİ NABIZ DALGASI (BVP / rPPG)
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono">
            {algorithm}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>SNR:</span>
            <span className={snr > 4 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
              {snr > 0 ? `+${snr} dB` : `${snr} dB`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">GÜVENİLİRLİK:</span>
            <span className={`font-bold ${confidence > 60 ? 'text-emerald-400' : confidence > 30 ? 'text-amber-400' : 'text-slate-400'}`}>
              %{confidence}
            </span>
          </div>
        </div>
      </div>

      {/* Dalga Formu Çizim Alanı */}
      <div className="relative w-full h-36 bg-[#0a0f1d] rounded-lg border border-slate-800/80 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={144}
          className="w-full h-full block"
        />

        {/* Canlı Nabız Göstergesi Rozeti */}
        <div className="absolute top-2 right-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg">
          <Heart
            className={`w-5 h-5 text-rose-500 transition-transform ${
              bpm > 40 && confidence > 30 ? 'animate-pulse' : ''
            }`}
            style={{ animationDuration: pulseDuration }}
          />
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {bpm > 0 ? bpm : '--'}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">BPM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
