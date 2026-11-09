import React, { useState, useEffect, useRef } from 'react';
import { X, Wind, Heart, Sparkles, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { BiometricMetrics } from '../types';

interface BreathingGuideModalProps {
  metrics: BiometricMetrics;
  onClose: () => void;
}

type BreathingPhase = 'INHALE' | 'HOLD_FULL' | 'EXHALE' | 'HOLD_EMPTY';

export const BreathingGuideModal: React.FC<BreathingGuideModalProps> = ({
  metrics,
  onClose,
}) => {
  const [phase, setPhase] = useState<BreathingPhase>('INHALE');
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [coherenceScore, setCoherenceScore] = useState<number>(75);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playPhaseSound = (freq: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          // Faz Değişimi
          setPhase((currentPhase) => {
            if (currentPhase === 'INHALE') {
              playPhaseSound(528); // Mi notası (Solfej 528 Hz dönüşüm frekansı)
              return 'HOLD_FULL';
            } else if (currentPhase === 'HOLD_FULL') {
              playPhaseSound(432); // A 432 Hz rahatlama frekansı
              return 'EXHALE';
            } else if (currentPhase === 'EXHALE') {
              playPhaseSound(396); // Gevşeme frekansı
              return 'HOLD_EMPTY';
            } else {
              playPhaseSound(639); // Yeni nefes başlangıcı
              setCyclesCompleted((c) => c + 1);
              setCoherenceScore((score) => Math.min(98, score + 4));
              return 'INHALE';
            }
          });
          return 4; // 4 saniyelik kutu nefesi
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [soundEnabled]);

  const getPhaseInfo = () => {
    switch (phase) {
      case 'INHALE':
        return {
          title: 'NEFES AL',
          sub: 'Burnunuzdan derin ve yavaşça nefes alın',
          color: 'text-cyan-400',
          borderColor: 'border-cyan-400',
          scale: 'scale-125',
          glow: 'shadow-[0_0_50px_rgba(6,182,212,0.6)]',
        };
      case 'HOLD_FULL':
        return {
          title: 'NEFESİ TUT',
          sub: 'Ciğerlerinizi doldurup sakin kalın',
          color: 'text-indigo-400',
          borderColor: 'border-indigo-400',
          scale: 'scale-125',
          glow: 'shadow-[0_0_50px_rgba(99,102,241,0.6)]',
        };
      case 'EXHALE':
        return {
          title: 'NEFES VER',
          sub: 'Ağzınızdan tüm havayı yavaşça boşaltın',
          color: 'text-emerald-400',
          borderColor: 'border-emerald-400',
          scale: 'scale-75',
          glow: 'shadow-[0_0_30px_rgba(16,185,129,0.5)]',
        };
      case 'HOLD_EMPTY':
        return {
          title: 'NEFESİ TUT',
          sub: 'Boş ciğerle rahatça bekleyin',
          color: 'text-amber-400',
          borderColor: 'border-amber-400',
          scale: 'scale-75',
          glow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]',
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#0b1324] via-[#0f172a] to-[#070b13] border border-cyan-800/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col items-center text-center">
        {/* Kapat & Ses Düğmesi */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Wind className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm text-white">Biyo-Geri Bildirim Kutu Nefesi</h3>
              <p className="text-[11px] text-slate-400">4-4-4-4 Kalp ve Vagal Sinir Koheransı</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
              title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canlı Koherans ve Nabız Göstergesi */}
        <div className="flex items-center justify-center gap-4 mb-6 text-xs font-mono">
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="text-slate-400">Canlı Nabız:</span>
            <span className="font-bold text-white text-sm">{metrics.smoothedBpm || 72} BPM</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Kalp Uyumu:</span>
            <span className="font-bold text-emerald-400 text-sm">%{coherenceScore}</span>
          </div>
        </div>

        {/* Büyüyüp Küçülen Biyo-Geri Bildirim Nefes Çemberi */}
        <div className="relative w-64 h-64 flex items-center justify-center my-4">
          {/* Dış Halo */}
          <div
            className={`absolute inset-0 rounded-full border-2 ${phaseInfo.borderColor} ${phaseInfo.glow} transition-all duration-1000 ease-in-out ${phaseInfo.scale} opacity-40`}
          />

          {/* İç Küre */}
          <div
            className={`w-48 h-48 rounded-full border-4 ${phaseInfo.borderColor} bg-slate-900/90 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${phaseInfo.scale}`}
          >
            <span className={`text-2xl font-black tracking-wider ${phaseInfo.color}`}>
              {phaseInfo.title}
            </span>
            <span className="text-4xl font-black font-mono text-white mt-1">
              {secondsLeft}s
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mt-1">
              Döngü: {cyclesCompleted + 1}
            </span>
          </div>
        </div>

        {/* Rehber Açıklaması */}
        <p className="text-sm font-medium text-slate-300 mt-4 min-h-[24px]">
          {phaseInfo.sub}
        </p>

        {/* Alt İpuçları */}
        <div className="w-full mt-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-3 text-left flex items-start gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Kutu nefesi tekniği vagus sinirini uyararak kalp hızını ve yüksek tansiyonu dakikalar içinde düşürür.
            Yol öfkesi (Road Rage) ve panik durumlarında zihinsel dinginliği ve odaklanmayı anında geri kazandırır.
          </p>
        </div>
      </div>
    </div>
  );
};
