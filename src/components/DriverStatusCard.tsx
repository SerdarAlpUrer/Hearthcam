import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Coffee,
  Compass,
  Smile,
  Flame,
  ShieldAlert,
  CheckCircle2,
  ScanEye,
  Brain,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DriverState } from '../types';

interface DriverStatusCardProps {
  state: DriverState;
}

export const DriverStatusCard: React.FC<DriverStatusCardProps> = ({ state }) => {
  const [showBiomechanics, setShowBiomechanics] = useState<boolean>(true);

  const getStatusBadge = () => {
    switch (state.overallStatus) {
      case 'EMERGENCY':
        return {
          bg: 'bg-rose-950/80 border-rose-600 text-rose-300',
          dot: 'bg-rose-500 animate-ping',
          label: 'ACİL DURUM / CANLILIK KAYBI',
          icon: ShieldAlert,
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/80 border-red-500 text-red-300',
          dot: 'bg-red-500 animate-pulse',
          label: 'KRİTİK UYKU / MİKRO-UYKU ALARMI',
          icon: AlertTriangle,
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-950/80 border-amber-500 text-amber-300',
          dot: 'bg-amber-500',
          label: state.roadRageDetected ? 'YOL ÖFKESİ / AGRESYON' : 'DİKKAT DAĞINIKLIĞI / YORGUNLUK',
          icon: Coffee,
        };
      default:
        return {
          bg: 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'SÜRÜCÜ UYANIK VE DİKKATLİ',
          icon: CheckCircle2,
        };
    }
  };

  const badge = getStatusBadge();
  const StatusIcon = badge.icon;

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between gap-3">
      {/* Üst Başlık & Ana Durum Rozeti */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-sm tracking-wide text-slate-200 flex items-center gap-2">
            <StatusIcon className="w-4 h-4 text-cyan-400" />
            SÜRÜCÜ İZLEME VE CANLILIK TELEMETRİSİ (DMS)
          </h3>
          <p className="text-[11px] text-slate-400">
            Euro NCAP & SAE J3016 • Pupillometri (PUI) • Göz Kapağı Hız Biyomekaniği
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Yol Öfkesi Rozeti */}
          {state.roadRageDetected && (
            <div className="px-2.5 py-1 rounded-full bg-rose-950 border border-rose-500 text-rose-300 text-xs font-bold font-mono animate-pulse flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>YOL ÖFKESİ AKTİF</span>
            </div>
          )}

          {/* Sigara / Yeme-İçme Rozeti */}
          {state.isSmokingOrEating && (
            <div className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-500 text-purple-300 text-xs font-bold font-mono animate-pulse flex items-center gap-1.5">
              <span>🚬 SİGARA / YEME</span>
            </div>
          )}

          {/* Bakış Yönü Rozeti */}
          <div className={`px-2.5 py-1 rounded-full border text-xs font-mono font-semibold flex items-center gap-1.5 ${
            state.gazeDirection === 'DOWN_PHONE'
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
              : state.gazeDirection === 'CENTER_ROAD'
              ? 'bg-slate-900 border-slate-700 text-emerald-400'
              : 'bg-slate-900 border-slate-700 text-amber-300'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>
              {state.gazeDirection === 'DOWN_PHONE'
                ? 'GÖZ TELEFONDA / AŞAĞIDA'
                : state.gazeDirection === 'LEFT_MIRROR'
                ? 'SOL AYNA / YAN'
                : state.gazeDirection === 'RIGHT_MIRROR'
                ? 'SAĞ AYNA / KONSOL'
                : 'YOLA ODAKLI'}
            </span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold font-mono tracking-wide ${badge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span>{badge.label}</span>
          </div>
        </div>
      </div>

      {/* Uyarı Nedeni Bandı */}
      {state.statusReason && state.overallStatus !== 'ALERT' && (
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
          state.overallStatus === 'EMERGENCY'
            ? 'bg-rose-950/90 border-rose-600 text-rose-200 animate-pulse'
            : state.overallStatus === 'CRITICAL'
            ? 'bg-red-950/80 border-red-500 text-red-200'
            : 'bg-amber-950/70 border-amber-500 text-amber-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{state.statusReason}</span>
          {state.gazeDownDurationMs > 0 && (
            <span className="ml-auto font-mono text-[11px] opacity-80">
              ({(state.gazeDownDurationMs / 1000).toFixed(1)} sn)
            </span>
          )}
        </div>
      )}

      {/* Standart DMS Metrikleri Grid (4'lü) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. PERCLOS (Göz Kapalılık Oranı) */}
        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              {state.isBlinking ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              PERCLOS
            </span>
            <span className="text-[10px] text-slate-500 font-mono">15s Ort.</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className={`text-2xl font-black font-mono ${state.perclos > 40 ? 'text-rose-400' : state.perclos > 20 ? 'text-amber-400' : 'text-white'}`}>
              %{state.perclos}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${state.perclos > 40 ? 'bg-rose-500' : state.perclos > 20 ? 'bg-amber-400' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(100, state.perclos * 2)}%` }}
            />
          </div>
        </div>

        {/* 2. Göz Kırpma Frekansı */}
        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>KIRPMA FREKANSI</span>
            <span className="text-[10px] text-slate-500 font-mono">Dk</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-black font-mono text-white">
              {state.blinkRatePerMin}
            </span>
            <span className="text-[10px] text-slate-400">/dk</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {state.isProlongedClosure ? (
              <span className="text-rose-400 font-bold animate-pulse">● UZUN GÖZ KAPANMASI!</span>
            ) : (
              <span>Toplam: {state.blinkCount} kırpma</span>
            )}
          </div>
        </div>

        {/* 3. Esneme (Yawn) & Geometrik MAR */}
        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              ESNEME SAYACI
            </span>
            <span className="text-[10px] text-slate-500 font-mono">MAR Analiz</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className={`text-2xl font-black font-mono ${state.yawnCount > 2 ? 'text-amber-400' : 'text-white'}`}>
              {state.yawnCount}
            </span>
            <span className="text-[10px] text-slate-400">kez</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {state.isYawning ? (
              <span className="text-amber-400 font-bold animate-pulse">● ESNİYOR...</span>
            ) : (
              <span>Ağız Açıklığı: %{state.mouthOpenRatio}</span>
            )}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${state.mouthOpenRatio > 60 ? 'bg-amber-400' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(100, state.mouthOpenRatio)}%` }}
            />
          </div>
        </div>

        {/* 4. Stres / Yol Öfkesi Skoru */}
        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              STRES / ÖFKE
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Mimik+HRV</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className={`text-2xl font-black font-mono ${state.stressScore > 70 ? 'text-rose-400' : state.stressScore > 40 ? 'text-amber-400' : 'text-white'}`}>
              {state.stressScore}
            </span>
            <span className="text-[10px] text-slate-400">/100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${state.stressScore > 70 ? 'bg-rose-500' : state.stressScore > 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${state.stressScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gelişmiş Biyomekanik / Pupillometri Aç/Kapa Başlığı */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <button
          onClick={() => setShowBiomechanics(!showBiomechanics)}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>PUPILLOMETRİ (PUI), BİLİŞSEL YÜK VE KIRPMA HIZ BİYOMEKANİĞİ</span>
          {showBiomechanics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[10px] font-mono text-slate-500">
          Vclose/Vopen & Pupil Unrest Index
        </span>
      </div>

      {/* Gelişmiş Biyomekanik Grid (Pupillometri, Kırpma Hızı, FACS Valence/Arousal) */}
      {showBiomechanics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* 1. Pupillometri (PUI) & Bilişsel Yük */}
          <div className="bg-[#0b1324] border border-cyan-900/60 rounded-xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <ScanEye className="w-4 h-4 text-cyan-400" />
                PUPILLOMETRİ (PUI)
              </span>
              <span className="font-mono text-[10px] text-slate-400">Merkezi Yorgunluk</span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-white">
                  {state.pupilUnrestIndex}
                </span>
                <span className="text-xs text-slate-400 ml-1">PUI</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  state.pupilUnrestIndex > 6.5
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                }`}>
                  {state.pupilUnrestIndex > 6.5 ? 'ZİHİNSEL TÜKENME' : 'DİNÇ İRİS'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Bilişsel Yük (Cognitive Load):</span>
                <span className="font-mono font-bold text-cyan-300">%{state.cognitiveLoadScore}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    state.cognitiveLoadScore > 75 ? 'bg-amber-400' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${state.cognitiveLoadScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Göz Kapağı Hız Biyomekaniği (Vclose / Vopen) */}
          <div className="bg-[#0b1324] border border-indigo-900/60 rounded-xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-400" />
                KIRPMA HIZ ORANI
              </span>
              <span className="font-mono text-[10px] text-slate-400">Vclose / Vopen</span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <span className={`text-2xl font-black font-mono ${state.blinkVelocityRatio > 1.7 ? 'text-amber-400' : 'text-white'}`}>
                  {state.blinkVelocityRatio}
                </span>
                <span className="text-xs text-slate-400 ml-1">oran</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  state.blinkVelocityRatio > 1.7
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                }`}>
                  {state.blinkVelocityRatio > 1.7 ? 'AĞIR GÖZ KAPAKLARI' : 'ÇEVİK GÖZ'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 truncate flex justify-between">
              <span>Eksik / Yarım Kırpma:</span>
              <span className="font-mono text-slate-300">%{state.incompleteBlinkRatio}</span>
            </div>
          </div>

          {/* 3. FACS Mikro Mimik & Duygu Durum (Valence - Arousal) */}
          <div className="bg-[#0b1324] border border-pink-900/60 rounded-xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-pink-300">
              <span className="flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-pink-400" />
                DUYGU & MİKRO MİMİK
              </span>
              <span className="font-mono text-[10px] text-slate-400">FACS AU Model</span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-white">
                  {state.valence >= 0 ? `+${state.valence}` : state.valence}
                </span>
                <span className="text-xs text-slate-400 ml-1">Valence</span>
              </div>
              <div className="text-right text-[11px] font-mono">
                <span className="text-slate-400">Arousal: </span>
                <span className="text-pink-300 font-bold">{state.arousal}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 truncate">
              {state.roadRageDetected ? (
                <span className="text-rose-400 font-bold">● AU4 Kaş Çatma + Öfke Sinyali</span>
              ) : state.valence > 0.2 ? (
                <span className="text-emerald-400 font-medium">● AU12 Rahat / Tebessüm</span>
              ) : (
                <span>● AU4:{state.actionUnits.au4BrowFurrow} • AU1:{state.actionUnits.au1BrowRaise}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alt Şerit: Kafa Açısı ve Dikkat Skoru */}
      <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">KAFA AÇISI:</span>
          <span className="text-slate-200">
            Yaw: <b className={Math.abs(state.headPose.yaw) > 30 ? 'text-amber-400' : 'text-cyan-400'}>{state.headPose.yaw}°</b>
          </span>
          <span className="text-slate-200">
            Pitch: <b className={Math.abs(state.headPose.pitch) > 25 ? 'text-amber-400' : 'text-cyan-400'}>{state.headPose.pitch}°</b>
          </span>
          <span className="text-slate-200">
            Roll: <b className="text-slate-300">{state.headPose.roll}°</b>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">DİKKAT SEVİYESİ:</span>
          <span className={`font-bold ${state.attentionScore > 75 ? 'text-emerald-400' : state.attentionScore > 45 ? 'text-amber-400' : 'text-rose-400'}`}>
            %{state.attentionScore}
          </span>
        </div>
      </div>
    </div>
  );
};
