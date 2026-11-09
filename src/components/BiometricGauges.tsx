import React, { useState } from 'react';
import {
  Heart,
  Activity,
  Wind,
  ShieldCheck,
  Droplets,
  Gauge,
  AlertOctagon,
  Sparkles,
  Brain,
  Timer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { BiometricMetrics } from '../types';

interface BiometricGaugesProps {
  metrics: BiometricMetrics;
}

export const BiometricGauges: React.FC<BiometricGaugesProps> = ({ metrics }) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);

  const getBpmStatus = (bpm: number) => {
    if (bpm === 0) return { label: 'Ölçülüyor...', color: 'text-slate-400' };
    if (bpm < 55) return { label: 'Bradikardi / Düşük', color: 'text-cyan-400' };
    if (bpm <= 90) return { label: 'Normal / Dinlenme', color: 'text-emerald-400' };
    if (bpm <= 115) return { label: 'Yükselmiş / Hafif Stres', color: 'text-amber-400' };
    return { label: 'Taşikardi / Yüksek Stres', color: 'text-rose-400' };
  };

  const getHrvStatus = (rmssd: number) => {
    if (rmssd === 0) return { label: 'Hesaplanıyor...', color: 'text-slate-400' };
    if (rmssd < 25) return { label: 'Yüksek Stres / Yorgun', color: 'text-rose-400' };
    if (rmssd <= 50) return { label: 'Dengeli / Uyanık', color: 'text-emerald-400' };
    return { label: 'Yüksek Rahatlama / Sakin', color: 'text-cyan-400' };
  };

  const getAutonomicStatus = (tone: string, lfHf: number) => {
    if (tone === 'PARASYMPATHETIC_DOMINANT' || lfHf < 0.65) {
      return { label: 'Parasempatik (Derin Gevşeme / Uyku Meyli)', color: 'text-sky-400', badge: 'bg-sky-950/60 border-sky-800' };
    }
    if (tone === 'SYMPATHETIC_SURGE' || lfHf > 2.6) {
      return { label: 'Sempatik Fırlama (Akut Stres / Öfke)', color: 'text-rose-400', badge: 'bg-rose-950/60 border-rose-800' };
    }
    return { label: 'Otonom Sinir Dengede', color: 'text-emerald-400', badge: 'bg-emerald-950/60 border-emerald-800' };
  };

  const bpmInfo = getBpmStatus(metrics.smoothedBpm);
  const hrvInfo = getHrvStatus(metrics.hrvRmssd);
  const autonomicInfo = getAutonomicStatus(metrics.autonomicTone, metrics.hrvLfHfRatio);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. Kademeli Temel Vital Bulgular (6 Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Nabız (BPM) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              NABIZ
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {metrics.acfBpm > 0 ? `ACF:${metrics.acfBpm}` : 'BPM'}
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {metrics.smoothedBpm > 0 ? metrics.smoothedBpm : '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">atım/dk</span>
          </div>
          <div className={`text-[10px] font-medium ${bpmInfo.color} truncate`}>
            ● {bpmInfo.label}
          </div>
        </div>

        {/* 2. Tansiyon (Kan Basıncı - mmHg) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-pink-400" />
              TANSİYON
            </span>
            <span className="font-mono text-[10px] text-slate-500">PWA</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {metrics.smoothedBpm > 0 ? `${metrics.bloodPressure.systolic}/${metrics.bloodPressure.diastolic}` : '--/--'}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold">mmHg</span>
          </div>
          <div className="text-[10px] font-medium text-pink-300 truncate">
            ● {metrics.bloodPressure.vascularStiffness}
          </div>
        </div>

        {/* 3. SpO2 (Kandaki Oksijen %) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              OKSİJEN
            </span>
            <span className="font-mono text-[10px] text-slate-500">SpO2</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1">
            <span className={`text-2xl font-black font-mono tracking-tight ${metrics.isHypoxiaRisk ? 'text-amber-400' : 'text-white'}`}>
              %{metrics.smoothedBpm > 0 ? metrics.spO2 : '--'}
            </span>
          </div>
          <div className="text-[10px] font-medium text-sky-400 truncate">
            {metrics.isHypoxiaRisk ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Kabini Havalandırın!
              </span>
            ) : (
              <span>● {metrics.spO2 >= 95 ? 'Normal Doygunluk' : 'Hafif Düşük'}</span>
            )}
          </div>
        </div>

        {/* 4. HRV (RMSSD ms) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              HRV
            </span>
            <span className="font-mono text-[10px] text-slate-500">ms</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {metrics.hrvRmssd > 0 ? metrics.hrvRmssd : '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">ms</span>
          </div>
          <div className={`text-[10px] font-medium ${hrvInfo.color} truncate`}>
            ● {hrvInfo.label}
          </div>
        </div>

        {/* 5. Solunum (RR) & Aritmi */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              SOLUNUM
            </span>
            <span className="font-mono text-[10px] text-slate-500">RR</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {metrics.respirationRate > 0 ? metrics.respirationRate : '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">/dk</span>
          </div>
          <div className="text-[10px] font-medium text-cyan-400 truncate">
            {metrics.apneaDetected ? (
              <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                <AlertOctagon className="w-3 h-3" /> Apne / Duraksama!
              </span>
            ) : metrics.arrhythmiaDetected ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Düzensiz Ritim
              </span>
            ) : (
              <span>● Düzenli Sinüs</span>
            )}
          </div>
        </div>

        {/* 6. Sinyal Doğruluğu & FPS */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              GÜVEN / FPS
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {metrics.isLowLightMode ? '🌙 IR/GECE' : 'SNR'}
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              %{metrics.confidence}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {metrics.actualFps > 0 ? `${metrics.actualFps}fps` : ''}
            </span>
          </div>
          <div className="text-[10px] font-medium text-slate-300 truncate">
            {metrics.motionArtifact ? (
              <span className="text-amber-400 font-semibold">● Hareket Bastırıldı</span>
            ) : (
              <span>● {metrics.snr > 0 ? `+${metrics.snr}dB SNR` : 'Kalibre Ediliyor'}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Gelişmiş Biyometrik Paneli Aç/Kapa Başlığı */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>GELİŞMİŞ BİYOMETRİK DERİNLİK (SDPPG, LF/HF BALANSI, ERKEN UYKU)</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[10px] font-mono text-slate-500">
          Lomb-Scargle & Takazawa SDPPG Modeli
        </span>
      </div>

      {/* 3. Gelişmiş Biyometrik Kartları (SDPPG Damar Yaşı + LF/HF Frekans Analizi) */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* A. SDPPG Damar Yaşı ve Arter Sertliği */}
          <div className="bg-[#0b1324] border border-cyan-900/60 rounded-xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-cyan-400" />
                DAMAR YAŞI (SDPPG)
              </span>
              <span className="font-mono text-[10px] text-slate-400">b/a Oranı</span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black font-mono text-white">
                  {metrics.smoothedBpm > 0 ? metrics.vascularAge : '--'}
                </span>
                <span className="text-xs text-slate-400 ml-1">yaş</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {metrics.smoothedBpm > 0 ? `${metrics.arterialStiffnessIndex}` : '--'}
                </span>
                <div className="text-[10px] text-slate-400">Arter Sertliği</div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Vasküler Elastikiyet:</span>
                <span className="font-mono font-bold text-emerald-400">%{metrics.vascularElasticityScore}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${metrics.vascularElasticityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* B. LF/HF Frekans Analizi ve Otonom Sinir Denge */}
          <div className="bg-[#0b1324] border border-indigo-900/60 rounded-xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400" />
                OTONOM DENGE (LF/HF)
              </span>
              <span className="font-mono text-[10px] text-slate-400">Symp/Vagal</span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black font-mono text-white">
                  {metrics.smoothedBpm > 0 ? metrics.hrvLfHfRatio : '--'}
                </span>
                <span className="text-xs text-slate-400 ml-1">LF/HF</span>
              </div>
              <div className="text-right text-[11px] font-mono">
                <span className="text-indigo-400">LF:{metrics.hrvLf}</span> • <span className="text-cyan-400">HF:{metrics.hrvHf}</span>
              </div>
            </div>

            <div className={`text-[10px] font-medium truncate ${autonomicInfo.color}`}>
              ● {autonomicInfo.label}
            </div>
          </div>

          {/* C. Göz Kapanmadan Önceki Erken Uyku Olasılığı (Pre-Sleep Vegetative Shift) */}
          <div className="bg-[#0b1324] border border-amber-900/60 rounded-xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-amber-400" />
                ERKEN UYKU ALARMI
              </span>
              <span className="font-mono text-[10px] text-slate-400">Pre-PERCLOS</span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <span className={`text-3xl font-black font-mono ${metrics.earlyDrowsinessProbability > 60 ? 'text-rose-400' : 'text-white'}`}>
                  %{metrics.earlyDrowsinessProbability}
                </span>
                <span className="text-xs text-slate-400 ml-1">olasılık</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  metrics.earlyDrowsinessProbability > 65
                    ? 'bg-rose-950 border border-rose-600 text-rose-300 animate-pulse'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                }`}>
                  {metrics.earlyDrowsinessProbability > 65 ? 'UYKU REHAVETİ' : 'DİNÇ / ALARM'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 truncate">
              {metrics.earlyDrowsinessProbability > 65
                ? '⚠️ Göz kapanmadan 2-3 dk önceki vagal gevşeme!'
                : 'Fizyolojik uyku belirtisi yok'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
