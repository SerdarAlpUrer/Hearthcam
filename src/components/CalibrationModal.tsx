import React, { useState, useEffect, useRef } from 'react';
import { Sliders, CheckCircle2, X, Activity, Eye, RefreshCw, ShieldCheck, Save } from 'lucide-react';
import { UserCalibrationProfile, BiometricMetrics } from '../types';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserCalibrationProfile;
  biometrics: BiometricMetrics;
  currentBlinkScore: number;
  isFaceDetected: boolean;
  onSaveProfile: (profile: UserCalibrationProfile) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  biometrics,
  currentBlinkScore,
  isFaceDetected,
  onSaveProfile,
}) => {
  const [age, setAge] = useState<number>(currentProfile.age || 32);
  const [restingSys, setRestingSys] = useState<number>(currentProfile.restingSys || 120);
  const [restingDia, setRestingDia] = useState<number>(currentProfile.restingDia || 80);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  // Canlı değerleri interval sıfırlanmadan okumak için ref
  const latestTelemetryRef = useRef({
    bpm: biometrics.smoothedBpm,
    ptt: biometrics.pttMs,
    blink: currentBlinkScore,
  });

  useEffect(() => {
    latestTelemetryRef.current = {
      bpm: biometrics.smoothedBpm,
      ptt: biometrics.pttMs,
      blink: currentBlinkScore,
    };
  }, [biometrics.smoothedBpm, biometrics.pttMs, currentBlinkScore]);

  const sampledRef = useRef<{ bpm: number[]; ptt: number[]; blink: number[] }>({
    bpm: [],
    ptt: [],
    blink: [],
  });

  const formRef = useRef({ age, restingSys, restingDia });
  useEffect(() => {
    formRef.current = { age, restingSys, restingDia };
  }, [age, restingSys, restingDia]);

  useEffect(() => {
    if (isOpen) {
      setAge(currentProfile.age || 32);
      setRestingSys(currentProfile.restingSys || 120);
      setRestingDia(currentProfile.restingDia || 80);
      setIsScanning(false);
      setProgress(0);
      setJustSaved(false);
    }
  }, [isOpen, currentProfile]);

  useEffect(() => {
    if (!isScanning) return;

    const startTime = performance.now();
    const durationMs = 4000; // 4 saniyelik hızlı ve kesintisiz canlı kalibrasyon

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));

      const { bpm, ptt, blink } = latestTelemetryRef.current;
      if (bpm > 45) sampledRef.current.bpm.push(bpm);
      if (ptt > 5) sampledRef.current.ptt.push(ptt);
      if (blink >= 0) sampledRef.current.blink.push(blink);

      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        const bpmArr = sampledRef.current.bpm;
        const pttArr = sampledRef.current.ptt;
        const blinkArr = sampledRef.current.blink;

        const avgBpm =
          bpmArr.length > 0
            ? Math.round(bpmArr.reduce((a, b) => a + b, 0) / bpmArr.length)
            : bpm || 72;
        const avgPtt =
          pttArr.length > 0
            ? Math.round((pttArr.reduce((a, b) => a + b, 0) / pttArr.length) * 10) / 10
            : ptt || 28;
        const avgBlink =
          blinkArr.length > 0
            ? Math.round((blinkArr.reduce((a, b) => a + b, 0) / blinkArr.length) * 100) / 100
            : 0.14;

        const { age: curAge, restingSys: curSys, restingDia: curDia } = formRef.current;

        const updated: UserCalibrationProfile = {
          isCalibrated: true,
          age: Math.max(18, Math.min(95, curAge || 32)),
          restingSys: Math.max(85, Math.min(190, curSys || 120)),
          restingDia: Math.max(50, Math.min(130, curDia || 80)),
          restingBpm: avgBpm,
          baselinePttMs: avgPtt,
          baselineBlinkScore: Math.max(0.05, Math.min(0.32, avgBlink)),
          calibratedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };

        setIsScanning(false);
        setJustSaved(true);
        onSaveProfile(updated);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isScanning, onSaveProfile]);

  if (!isOpen) return null;

  const startLiveCalibration = () => {
    sampledRef.current = { bpm: [], ptt: [], blink: [] };
    setJustSaved(false);
    setProgress(4);
    setIsScanning(true);
  };

  const handleQuickSave = () => {
    const updated: UserCalibrationProfile = {
      isCalibrated: true,
      age: Math.max(18, Math.min(95, age || 32)),
      restingSys: Math.max(85, Math.min(190, restingSys || 120)),
      restingDia: Math.max(50, Math.min(130, restingDia || 80)),
      restingBpm: biometrics.smoothedBpm > 45 ? biometrics.smoothedBpm : currentProfile.restingBpm || 72,
      baselinePttMs: biometrics.pttMs > 5 ? biometrics.pttMs : currentProfile.baselinePttMs || 28,
      baselineBlinkScore:
        currentBlinkScore > 0.02
          ? Math.max(0.05, Math.min(0.32, Math.round(currentBlinkScore * 100) / 100))
          : currentProfile.baselineBlinkScore || 0.14,
      calibratedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    setJustSaved(true);
    onSaveProfile(updated);
  };

  const resetCalibration = () => {
    const resetProfile: UserCalibrationProfile = {
      isCalibrated: false,
      age: 32,
      restingSys: 120,
      restingDia: 80,
      restingBpm: 72,
      baselinePttMs: 28,
      baselineBlinkScore: 0.14,
    };
    setAge(32);
    setRestingSys(120);
    setRestingDia(80);
    setJustSaved(false);
    onSaveProfile(resetProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Başlık */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Kişisel Biyometrik Kalibrasyon
                {currentProfile.isCalibrated && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    Aktif
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Tansiyon (PTT), Damar Yaşı ve Göz Açıklığı (EAR) referans eşitlemesi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-4 space-y-4">
          {/* Aktif Kalibrasyon Özeti */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
            <div>
              <div className="text-[10px] text-slate-500 font-semibold">CİLT SAFLIĞI</div>
              <div className="text-xs font-bold text-emerald-400 font-mono">%{biometrics.skinPurity}</div>
            </div>
            <div className="border-x border-slate-800">
              <div className="text-[10px] text-slate-500 font-semibold">MİKRO-PTT</div>
              <div className="text-xs font-bold text-cyan-400 font-mono">{biometrics.pttMs} ms</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold">GÖZ EŞİĞİ</div>
              <div className="text-xs font-bold text-violet-400 font-mono">
                {Math.max(0.38, Math.min(0.68, currentProfile.baselineBlinkScore + 0.32)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Kişisel Referans Değerleri */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Yaşınız
              </label>
              <input
                type="number"
                min={18}
                max={95}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[9px] text-slate-500">SDPPG referansı</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Büyük Tansiyon
              </label>
              <input
                type="number"
                min={85}
                max={190}
                value={restingSys}
                onChange={(e) => setRestingSys(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[9px] text-slate-500">Sistolik (mmHg)</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Küçük Tansiyon
              </label>
              <input
                type="number"
                min={50}
                max={130}
                value={restingDia}
                onChange={(e) => setRestingDia(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[9px] text-slate-500">Diyastolik (mmHg)</span>
            </div>
          </div>

          {/* Canlı Tarama Durumu */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Canlı Göz & PTT Referans Taraması
              </span>
              <span className={`text-[11px] font-bold ${isFaceDetected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isFaceDetected ? 'Yüz Algılandı' : 'Kameraya Bakın'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kameraya doğal şekilde bakarken kalibrasyonu başlatın. Sistem 4 saniye içinde kişisel göz
              açıklığınızı, bazal nabzınızı ({currentProfile.restingBpm ?? 72} BPM) ve Alın-Yanak PTT faz
              gecikmenizi ({currentProfile.baselinePttMs ?? 28} ms) kaydeder.
            </p>

            {isScanning && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono font-bold text-cyan-300">
                  <span>Biyometrik ve Optik Bazal Ölçülüyor...</span>
                  <span>%{progress}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {(currentProfile.isCalibrated || justSaved) && !isScanning && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {justSaved ? 'Kalibrasyon Başarıyla Kaydedildi!' : `Bazal Nabız: ${currentProfile.restingBpm ?? 72} BPM · PTT: ${currentProfile.baselinePttMs ?? 28} ms`}
                </span>
                {currentProfile.calibratedAt && (
                  <span className="text-[10px] text-emerald-400/80 font-mono">{currentProfile.calibratedAt}</span>
                )}
              </div>
            )}
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={startLiveCalibration}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {isScanning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Kalibre Ediliyor (%{progress})
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Canlı Kalibrasyonu Başlat
                </>
              )}
            </button>

            <button
              onClick={handleQuickSave}
              disabled={isScanning}
              title="Anlık Değerlerle Hemen Kaydet"
              className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Kaydet</span>
            </button>

            {currentProfile.isCalibrated && (
              <button
                onClick={resetCalibration}
                disabled={isScanning}
                title="Varsayılanlara Sıfırla"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
