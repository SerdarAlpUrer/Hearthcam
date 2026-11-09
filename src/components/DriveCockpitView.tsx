import React, { useState } from 'react';
import {
  Gauge,
  Heart,
  Eye,
  ScanEye,
  Activity,
  Droplets,
  Wind,
  ShieldCheck,
  AlertTriangle,
  Brain,
  Timer,
  Award,
  Coffee,
  Flame,
  Cigarette,
  Layers,
  Sparkles,
  Zap,
  Wind as WindIcon,
  FileText,
  Sliders,
} from 'lucide-react';
import { VideoFeed } from './VideoFeed';
import { BiometricMetrics, DriverState, ObdTelemetry, AppSettings, ROIBox, TripStats, UserCalibrationProfile } from '../types';
import { BlendshapeScore } from '../engine/driverMonitor';

interface DriveCockpitViewProps {
  settings: AppSettings;
  biometrics: BiometricMetrics;
  driverState: DriverState;
  obdTelemetry: ObdTelemetry;
  tripStats?: TripStats;
  fps: number;
  calibrationProfile?: UserCalibrationProfile;
  onRgbSample: (
    sample: { r: number; g: number; b: number; foreheadG?: number; cheekG?: number; skinPurity?: number },
    activeRois: ROIBox[]
  ) => void;
  onLandmarks: (landmarks: { x: number; y: number; z: number }[], blendshapes: BlendshapeScore[]) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onOpenBreathing: () => void;
  onOpenReport: () => void;
  onOpenObd: () => void;
  onOpenCalibration?: () => void;
  onOpenVeinScanner?: () => void;
}

type FilterCategory = 'ALL' | 'CARDIO' | 'DMS';

export const DriveCockpitView: React.FC<DriveCockpitViewProps> = ({
  settings,
  biometrics,
  driverState,
  obdTelemetry,
  tripStats,
  fps,
  calibrationProfile,
  onRgbSample,
  onLandmarks,
  onCanvasReady,
  onOpenBreathing,
  onOpenReport,
  onOpenObd,
  onOpenCalibration,
  onOpenVeinScanner,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('ALL');

  // Sadeleştirilmiş ve net durum belirteci
  const getStatusBadge = () => {
    switch (driverState.overallStatus) {
      case 'EMERGENCY':
        return {
          pill: 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse',
          dot: 'bg-rose-500 animate-ping',
          text: 'ACİL DURUM: SÜRÜCÜ TEPKİSİZ',
        };
      case 'CRITICAL':
        return {
          pill: 'bg-red-950/90 border-red-500 text-red-200 animate-pulse',
          dot: 'bg-red-500 animate-ping',
          text: 'DİKKAT: AĞIR YORGUNLUK / MİKRO-UYKU',
        };
      case 'WARNING':
        if (driverState.isSmokingOrEating) {
          return {
            pill: 'bg-purple-950/90 border-purple-500 text-purple-200',
            dot: 'bg-purple-400',
            text: 'KABİN İÇİ: SİGARA / YEME-İÇME',
          };
        }
        if (driverState.roadRageDetected) {
          return {
            pill: 'bg-rose-950/90 border-rose-500 text-rose-200',
            dot: 'bg-rose-400',
            text: 'YOL ÖFKESİ & YÜKSEK STRES',
          };
        }
        if (driverState.gazeDirection === 'DOWN_PHONE') {
          return {
            pill: 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse',
            dot: 'bg-amber-400',
            text: 'UYARI: GÖZLER TELEFONDA',
          };
        }
        return {
          pill: 'bg-amber-950/90 border-amber-500 text-amber-200',
          dot: 'bg-amber-400',
          text: 'DİKKAT DAĞINIKLIĞI',
        };
      default:
        return {
          pill: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300',
          dot: 'bg-emerald-400',
          text: 'SÜRÜCÜ YOLA ODAKLI & UYANIK',
        };
    }
  };

  const status = getStatusBadge();

  // 12 Modern Micro Kart Tanımı
  const allCards = [
    // 1. Araç Hızı
    {
      id: 'speed',
      category: 'DMS' as const,
      icon: Gauge,
      iconColor: 'text-cyan-400',
      tag: obdTelemetry.connected ? 'CAN-BUS' : 'OBD',
      title: 'HIZ & DEVİR',
      value: obdTelemetry.connected ? Math.round(obdTelemetry.speedKmh) : '--',
      unit: 'km/s',
      sub: obdTelemetry.connected
        ? (obdTelemetry.deviceType === 'SIMULATOR' ? `${obdTelemetry.rpm} RPM (Sim)` : `${obdTelemetry.rpm} RPM`)
        : 'Araç Verisi Yok',
      borderColor: 'border-cyan-800/40 hover:border-cyan-500/50',
      glow: 'shadow-cyan-950/20',
    },
    // 2. Kalp Hızı (BPM)
    {
      id: 'bpm',
      category: 'CARDIO' as const,
      icon: Heart,
      iconColor: 'text-rose-500 animate-pulse',
      tag: biometrics.confidence > 70 ? 'STABİL' : 'rPPG',
      title: 'NABIZ (BPM)',
      value: biometrics.smoothedBpm > 0 ? biometrics.smoothedBpm : '--',
      unit: 'BPM',
      sub: biometrics.confidence > 0 ? `%${biometrics.confidence} Güven • ACF:${biometrics.acfBpm}` : 'Ölçülüyor...',
      borderColor: 'border-rose-800/40 hover:border-rose-500/50',
      glow: 'shadow-rose-950/20',
    },
    // 3. Kan Basıncı (Tansiyon)
    {
      id: 'bp',
      category: 'CARDIO' as const,
      icon: Activity,
      iconColor: 'text-pink-400',
      tag: calibrationProfile?.isCalibrated ? 'PTT KALİBRE' : 'PTT+PWA',
      title: 'TANSİYON',
      value: biometrics.smoothedBpm > 0 ? `${biometrics.bloodPressure.systolic}/${biometrics.bloodPressure.diastolic}` : '--/--',
      unit: 'mmHg',
      sub: `PTT: ${biometrics.pttMs} ms • PP: ${biometrics.bloodPressure.pulsePressure} mmHg`,
      borderColor: 'border-pink-800/40 hover:border-pink-500/50',
      glow: 'shadow-pink-950/20',
    },
    // 4. SpO2 Oksijen
    {
      id: 'spo2',
      category: 'CARDIO' as const,
      icon: Droplets,
      iconColor: 'text-sky-400',
      tag: 'OPTİK',
      title: 'SpO2 OKSİJEN',
      value: `%${biometrics.spO2}`,
      unit: '',
      sub: biometrics.isHypoxiaRisk ? 'Hipoksi Uyarısı!' : 'Optimal Oksijen',
      borderColor: 'border-sky-800/40 hover:border-sky-500/50',
      glow: 'shadow-sky-950/20',
    },
    // 5. Sürücü Yol Odağı
    {
      id: 'attention',
      category: 'DMS' as const,
      icon: Eye,
      iconColor: 'text-cyan-400',
      tag: 'GÖZ',
      title: 'YOL ODAĞI',
      value: `%${driverState.attentionScore}`,
      unit: '',
      sub: driverState.gazeDirection === 'DOWN_PHONE'
        ? 'Gözler Telefonda!'
        : driverState.gazeDirection === 'LEFT_MIRROR'
        ? 'Sol Ayna'
        : driverState.gazeDirection === 'RIGHT_MIRROR'
        ? 'Sağ Ayna'
        : 'Yola Odaklı',
      progressBar: driverState.attentionScore,
      progressColor: driverState.attentionScore < 50 ? 'bg-rose-500' : 'bg-emerald-500',
      borderColor: 'border-cyan-800/40 hover:border-cyan-500/50',
      glow: 'shadow-cyan-950/20',
    },
    // 6. PERCLOS (Yorgunluk)
    {
      id: 'perclos',
      category: 'DMS' as const,
      icon: ScanEye,
      iconColor: 'text-amber-400',
      tag: 'NCAP',
      title: 'PERCLOS (UYKU)',
      value: `%${driverState.perclos}`,
      unit: '',
      sub: driverState.isProlongedClosure
        ? 'GÖZ KAPALI (UYKU)!'
        : `Kırpma: ${driverState.blinkRatePerMin}/dk (${driverState.blinkCount} top)`,
      progressBar: Math.min(100, driverState.perclos * 2),
      progressColor: driverState.perclos > 40 ? 'bg-rose-500' : driverState.perclos > 20 ? 'bg-amber-400' : 'bg-cyan-500',
      borderColor: 'border-amber-800/40 hover:border-amber-500/50',
      glow: 'shadow-amber-950/20',
    },
    // 7. HRV / Sinirsel Denge
    {
      id: 'hrv',
      category: 'CARDIO' as const,
      icon: Timer,
      iconColor: 'text-indigo-400',
      tag: 'RMSSD',
      title: 'HRV STRES',
      value: biometrics.hrvRmssd > 0 ? biometrics.hrvRmssd : '--',
      unit: 'ms',
      sub: `LF/HF: ${biometrics.hrvLfHfRatio.toFixed(2)} • Stres: ${driverState.stressScore}/100`,
      borderColor: 'border-indigo-800/40 hover:border-indigo-500/50',
      glow: 'shadow-indigo-950/20',
    },
    // 8. Solunum Hızı (RR)
    {
      id: 'respiration',
      category: 'CARDIO' as const,
      icon: Wind,
      iconColor: 'text-teal-400',
      tag: 'RİTM',
      title: 'SOLUNUM (RR)',
      value: biometrics.respirationRate > 0 ? biometrics.respirationRate : '--',
      unit: '/dk',
      sub: biometrics.apneaDetected ? 'Apne / Düzensiz' : 'Ritmik Solunum',
      borderColor: 'border-teal-800/40 hover:border-teal-500/50',
      glow: 'shadow-teal-950/20',
    },
    // 9. Biyolojik Damar Yaşı
    {
      id: 'vascularAge',
      category: 'CARDIO' as const,
      icon: Award,
      iconColor: 'text-purple-400',
      tag: 'SDPPG',
      title: 'DAMAR YAŞI',
      value: biometrics.vascularAge,
      unit: 'Yaş',
      sub: `ASI: ${biometrics.arterialStiffnessIndex.toFixed(2)} (Arteriyel)`,
      borderColor: 'border-purple-800/40 hover:border-purple-500/50',
      glow: 'shadow-purple-950/20',
    },
    // 10. Bilişsel Yük & Pupillometri
    {
      id: 'cognitive',
      category: 'DMS' as const,
      icon: Brain,
      iconColor: 'text-violet-400',
      tag: 'PUI',
      title: 'BİLİŞSEL YÜK',
      value: `%${driverState.cognitiveLoadScore}`,
      unit: '',
      sub: `PUI: ${driverState.pupilUnrestIndex.toFixed(1)} Pupillometri`,
      borderColor: 'border-violet-800/40 hover:border-violet-500/50',
      glow: 'shadow-violet-950/20',
    },
    // 11. Sürüş Emniyet Skoru
    {
      id: 'safety',
      category: 'DMS' as const,
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      tag: tripStats?.grade ?? 'A+',
      title: 'EMNİYET SKORU',
      value: `%${tripStats?.safetyScore ?? 100}`,
      unit: '',
      sub: `Mesafe: ${tripStats?.distanceKm ?? 0} km • ${Math.floor((tripStats?.durationSeconds ?? 0) / 60)} dk`,
      borderColor: 'border-emerald-800/40 hover:border-emerald-500/50',
      glow: 'shadow-emerald-950/20',
    },
    // 12. Kabin & Davranış
    {
      id: 'cabin',
      category: 'DMS' as const,
      icon: Coffee,
      iconColor: driverState.roadRageDetected ? 'text-rose-400' : driverState.isSmokingOrEating ? 'text-purple-400' : 'text-orange-400',
      tag: 'FACS+FAST',
      title: 'KABİN & SİMETRİ',
      value: driverState.roadRageDetected
        ? 'Öfkeli'
        : driverState.isSmokingOrEating
        ? 'Sigara/Yeme'
        : driverState.yawnCount > 0
        ? `${driverState.yawnCount} Esneme`
        : 'Simetrik',
      unit: '',
      sub: `Asimetri: %${driverState.facialAsymmetryScore ?? 4} • TBUT: ${driverState.tbutSeconds ?? 2.4}sn`,
      borderColor: 'border-orange-800/40 hover:border-orange-500/50',
      glow: 'shadow-orange-950/20',
    },
  ];

  const visibleCards = allCards.filter(card => {
    if (filter === 'ALL') return true;
    return card.category === filter;
  });

  return (
    <div className="flex flex-col gap-3.5 max-w-7xl mx-auto w-full">
      {/* 1. Üst Durum ve Hızlı Filtre Barı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        {/* Sol: Canlı Durum Hapı */}
        <div className="flex items-center gap-2">
          <div className={`px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wide flex items-center gap-2 shadow-lg transition-all duration-300 ${status.pill}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span>{status.text}</span>
          </div>

          {driverState.statusReason && driverState.overallStatus !== 'ALERT' && (
            <span className="hidden md:inline-block text-[11px] font-mono text-slate-400 truncate max-w-xs">
              • {driverState.statusReason}
            </span>
          )}
        </div>

        {/* Sağ: Modern Segment Filtre Düğmeleri & Hızlı Eylemler */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="bg-slate-900/90 border border-slate-800/80 p-0.5 rounded-xl flex items-center gap-1 shadow">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                filter === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü (12)
            </button>

            <button
              onClick={() => setFilter('CARDIO')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                filter === 'CARDIO'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kardiyo (6)
            </button>

            <button
              onClick={() => setFilter('DMS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                filter === 'DMS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sürüş (6)
            </button>
          </div>

          {onOpenVeinScanner && (
            <button
              onClick={onOpenVeinScanner}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
              title="Optik Damar & Hemoglobin Tarayıcı (Arka Kamera + Flaş)"
            >
              <ScanEye className="w-3.5 h-3.5" />
              <span>Damar Tarama</span>
            </button>
          )}

          {onOpenCalibration && (
            <button
              onClick={onOpenCalibration}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition shadow cursor-pointer ${
                calibrationProfile?.isCalibrated
                  ? 'bg-emerald-950/80 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-cyan-500/40 text-cyan-300'
              }`}
              title="Kişisel Biyometrik & Göz Açıklığı Kalibrasyonu"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{calibrationProfile?.isCalibrated ? 'Kalibre ✓' : 'Kalibre Et'}</span>
            </button>
          )}

          <button
            onClick={onOpenBreathing}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition shadow"
            title="Kutu Nefesi Rehberi"
          >
            <WindIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenReport}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 transition shadow"
            title="Klinik PDF Raporu"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Yüksek Hız Çarpışma Riski Uyarısı (Acil Durumda Fırlar) */}
      {obdTelemetry.connected && obdTelemetry.highSpeedMicrosleepRisk && (
        <div className="p-3.5 rounded-2xl bg-rose-600 border-2 border-white text-white font-black text-sm flex items-center justify-between animate-bounce shadow-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>ACİL ÇARPIŞMA UYARISI: {Math.round(obdTelemetry.speedKmh)} km/s Hızda Sürücü Uykuda!</span>
          </div>
          <span className="bg-black/60 px-2.5 py-1 rounded text-xs font-mono uppercase">
            FRENLEYİN
          </span>
        </div>
      )}

      {/* 3. Ana Gösterge Alanı (Sol: Kamera, Sağ: Yüksek Yoğunluklu Modern Mikro Kartlar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Sol Kolon: Kamera & Canlı Sinyal Bandı */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <div className="w-full aspect-[4/3] sm:aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden border border-slate-800/90 bg-black shadow-2xl relative">
            <VideoFeed
              settings={settings}
              onRgbSample={onRgbSample}
              onLandmarks={onLandmarks}
              fps={fps}
              onCanvasReady={onCanvasReady}
            />
          </div>

          {/* Kamera Altı Mini Telemetri Bandı */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 shadow">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SNR: {biometrics.snr.toFixed(1)} dB</span>
              <span className="opacity-40">•</span>
              <span className="text-emerald-400">Cilt: %{biometrics.skinPurity}</span>
              <span className="opacity-40">•</span>
              <span className="text-cyan-300">PTT: {biometrics.pttMs} ms</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">{settings.algorithm}</span>
              <span className="opacity-40">•</span>
              <span>{fps > 0 ? `${fps} FPS` : '30 FPS'}</span>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Yüksek Yoğunluklu, Modern & Küçük Kartlar Grid'i */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {visibleCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className={`min-h-[86px] p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-slate-900/95 via-[#0b1220]/90 to-slate-950/95 border ${card.borderColor} shadow-lg ${card.glow} backdrop-blur-md flex flex-col justify-between transition-all duration-200 hover:translate-y-[-1px] group`}
                >
                  {/* Üst Başlık Satırı */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 group-hover:text-slate-300">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${card.iconColor}`} />
                      <span className="truncate">{card.title}</span>
                    </span>
                    {card.tag && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-white/5 border border-white/10 text-slate-400 shrink-0">
                        {card.tag}
                      </span>
                    )}
                  </div>

                  {/* Orta Satır: Değer ve Birim */}
                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-2xl font-black font-mono tracking-tight text-white drop-shadow-sm truncate">
                      {card.value}
                    </span>
                    {card.unit && (
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 shrink-0">
                        {card.unit}
                      </span>
                    )}
                  </div>

                  {/* Alt Satır: Açıklama veya Mini İlerleme Çubuğu */}
                  {card.progressBar !== undefined ? (
                    <div className="flex flex-col gap-1">
                      <div className="w-full bg-slate-800/90 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${card.progressColor || 'bg-cyan-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, card.progressBar))}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {card.sub}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                      {card.sub}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
