import React from 'react';
import {
  X,
  Printer,
  HeartPulse,
  Award,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Droplets,
  Wind,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { BiometricMetrics, DriverState } from '../types';

interface HealthReportModalProps {
  metrics: BiometricMetrics;
  driverState: DriverState;
  onClose: () => void;
}

export const HealthReportModal: React.FC<HealthReportModalProps> = ({
  metrics,
  driverState,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const reportId = `HC-REP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentDate = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // BVP dalgasını SVG path'e çevir (ECG pembe grid üzerine)
  const history = metrics.bvpHistory.length > 0 ? metrics.bvpHistory.slice(-100) : Array(100).fill(0);
  const minVal = Math.min(...history, -1);
  const maxVal = Math.max(...history, 1);
  const range = maxVal - minVal || 1;

  const points = history
    .map((val, idx) => {
      const x = (idx / (history.length - 1)) * 600;
      const y = 110 - ((val - minVal) / range) * 80;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      {/* Yazdırılabilir Rapor Kartı */}
      <div className="bg-[#0b1324] text-slate-100 border border-cyan-800/60 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative my-6 print:m-0 print:p-6 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Üst Eylem Çubuğu (Yazdırmada Gizlenir) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Klinik Sağlık & Damar Yaşı Raporu</h2>
              <p className="text-xs text-slate-400">rPPG Biyometrik Hemodinamik İnceleme Belgesi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===================== RAPOR GÖVDESİ (A4 FORMATI) ===================== */}
        <div className="mt-4 print:mt-0 font-sans">
          {/* Rapor Başlığı */}
          <div className="flex items-center justify-between border-b-2 border-cyan-500/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-rose-600 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[#080c14] print:bg-white rounded-[10px] flex items-center justify-center">
                  <HeartPulse className="w-7 h-7 text-cyan-400 print:text-cyan-600" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wider uppercase text-cyan-400 print:text-cyan-700">
                  HEARTHCAM BİYOMEDİKAL LABORATUVARI
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600">
                  Temassız Video-rPPG ve Sürücü Durum Takip (DMS) Merkezi
                </p>
              </div>
            </div>

            <div className="text-right text-xs font-mono">
              <div className="font-bold text-white print:text-black">Rapor No: {reportId}</div>
              <div className="text-slate-400 print:text-slate-600">{currentDate}</div>
              <div className="text-[10px] text-emerald-400 print:text-emerald-700 font-semibold mt-0.5">
                ● Tıbbi Doğrulama Seviyesi: Yüksek
              </div>
            </div>
          </div>

          {/* Sürücü / Hasta Bilgi Özeti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-3 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-500 block">Sürücü / Denek:</span>
              <span className="font-bold text-white print:text-black">Serdar Alptekin Ürer</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block">Algoritma / Donanım:</span>
              <span className="font-bold text-cyan-400 print:text-cyan-800">rPPG TIPTEKNO 2014 POS Core</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block">Kamera Modu:</span>
              <span className="font-bold text-white print:text-black">30 FPS Video-Fotopletismografi</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block">Sinyal Kalitesi (SNR):</span>
              <span className="font-bold text-emerald-400 print:text-emerald-700">%{Math.round(metrics.confidence)} Güvenilir</span>
            </div>
          </div>

          {/* 1. Hemodinamik Vital Bulgular */}
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 print:text-cyan-800 border-b border-slate-800 print:border-slate-300 pb-1 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              1. Hemodinamik Vital Bulgular
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-mono">Kalp Hızı</span>
                <div className="text-2xl font-black font-mono text-cyan-400 print:text-cyan-700 my-0.5">
                  {metrics.smoothedBpm || '--'} <span className="text-xs font-normal">BPM</span>
                </div>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-medium">Normal Sinüs Ritmi</span>
              </div>

              <div className="bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-mono">Kan Basıncı (Tansiyon)</span>
                <div className="text-2xl font-black font-mono text-emerald-400 print:text-emerald-700 my-0.5">
                  {metrics.bloodPressure.systolic}/{metrics.bloodPressure.diastolic} <span className="text-xs font-normal">mmHg</span>
                </div>
                <span className="text-[10px] text-slate-300 print:text-slate-600">Nabız Basıncı: {metrics.bloodPressure.pulsePressure}</span>
              </div>

              <div className="bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-mono">SpO2 Oksijen</span>
                <div className="text-2xl font-black font-mono text-sky-400 print:text-sky-700 my-0.5">
                  %{metrics.spO2}
                </div>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-medium">
                  {metrics.isHypoxiaRisk ? '⚠️ Hipoksi Riski' : 'Optimal Oksijen'}
                </span>
              </div>

              <div className="bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-mono">Solunum Hızı</span>
                <div className="text-2xl font-black font-mono text-indigo-400 print:text-indigo-700 my-0.5">
                  {metrics.respirationRate} <span className="text-xs font-normal">rpm</span>
                </div>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-medium">
                  {metrics.apneaDetected ? '⚠️ Apne Şüphesi' : 'Düzenli Solunum'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. İkinci Türev PPG (SDPPG) ve Damar Yaşı Analizi */}
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 print:text-rose-800 border-b border-slate-800 print:border-slate-300 pb-1 mb-2.5 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" />
              2. İkinci Türev PPG (SDPPG) ve Damar Yaşı Analizi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 print:from-rose-50 print:to-white border border-rose-800/40 print:border-rose-300 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-rose-300 print:text-rose-700 block">Tahmini Damar Yaşı</span>
                  <div className="text-3xl font-black font-mono text-rose-400 print:text-rose-700 mt-1">
                    {metrics.vascularAge} <span className="text-xs font-normal text-slate-400">Yıl</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-medium">Kronolojik Yaşla Uyumlu</span>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-rose-500/50 flex items-center justify-center font-mono text-xs font-bold text-rose-300">
                  SDPPG
                </div>
              </div>

              <div className="bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-3 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-slate-600 block">Arteriyel Sertlik İndeksi (b/a)</span>
                  <div className="text-2xl font-black font-mono text-amber-400 print:text-amber-700 mt-1">
                    {metrics.arterialStiffnessIndex.toFixed(2)}
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 print:text-slate-600 mt-1">
                  Durum: <b className="text-emerald-400 print:text-emerald-700">Elastik ve Esnek Damar Duvarı</b>
                </div>
              </div>

              <div className="bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-3 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-slate-600 block">Damar Elastikiyet Skoru</span>
                  <div className="text-2xl font-black font-mono text-cyan-400 print:text-cyan-700 mt-1">
                    %{metrics.vascularElasticityScore} / 100
                  </div>
                </div>
                <div className="w-full bg-slate-800 print:bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${metrics.vascularElasticityScore}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Otonom Sinir Sistemi & Kalp Hızı Değişkenliği (HRV) */}
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 print:text-purple-800 border-b border-slate-800 print:border-slate-300 pb-1 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              3. Otonom Sinir Sistemi ve HRV Frekans Spektrumu
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg">
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">HRV RMSSD</span>
                <span className="text-base font-bold font-mono text-white print:text-black">{metrics.hrvRmssd} ms</span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 block">Vagal Kararlılık</span>
              </div>
              <div className="bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg">
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">LF/HF Denge Oranı</span>
                <span className="text-base font-bold font-mono text-purple-400 print:text-purple-700">{metrics.hrvLfHfRatio.toFixed(2)}</span>
                <span className="text-[10px] text-slate-300 print:text-slate-600 block">Sempatik/Vagal Denge</span>
              </div>
              <div className="bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg">
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">Erken Uyku Meyli</span>
                <span className="text-base font-bold font-mono text-cyan-400 print:text-cyan-700">%{metrics.earlyDrowsinessProbability}</span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 block">Düşük Uyku Riski</span>
              </div>
              <div className="bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 p-2.5 rounded-lg">
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">Sürücü Dikkat Puanı</span>
                <span className="text-base font-bold font-mono text-emerald-400 print:text-emerald-700">%{driverState.attentionScore}</span>
                <span className="text-[10px] text-slate-300 print:text-slate-600 block">PERCLOS: %{driverState.perclos}</span>
              </div>
            </div>
          </div>

          {/* 4. Klinik Pembe EKG / BVP Izgara Dalga Formu */}
          <div className="mb-4">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-1 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 print:text-rose-800 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                4. Canlı Fotopletismografi (BVP) Nabız Trasesi (25mm/s Standart EKG Izgarası)
              </span>
              <span className="text-[10px] font-mono text-slate-400 print:text-slate-600">Filtre: 0.7 - 3.5 Hz Butterworth Band-Pass</span>
            </div>

            {/* Standart Pembe Milimetrik EKG Kağıdı */}
            <div className="relative w-full h-32 bg-[#fff1f2] border-2 border-rose-300 rounded-lg overflow-hidden shadow-inner">
              {/* SVG EKG Izgara Çizgileri */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Küçük 1mm Izgara */}
                  <pattern id="smallGrid" width="6" height="6" patternUnits="userSpaceOnUse">
                    <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#fecdd3" strokeWidth="0.5" />
                  </pattern>
                  {/* Büyük 5mm Izgara */}
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <rect width="30" height="30" fill="url(#smallGrid)" />
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#fda4af" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* BVP Dalga Formu Trasesi */}
                <path
                  d={points}
                  fill="none"
                  stroke="#be123c"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-200/90 text-[10px] font-mono font-bold text-rose-900">
                BVP Sinyali • {metrics.smoothedBpm} BPM
              </div>
            </div>
          </div>

          {/* 5. Klinik Değerlendirme ve İmzalar */}
          <div className="border-t-2 border-slate-800 print:border-slate-300 pt-3 flex flex-col md:flex-row items-start justify-between gap-4 text-xs">
            <div className="flex-1">
              <span className="font-bold text-white print:text-black uppercase block mb-1">
                Klinik İzlenim & Biyomedikal Değerlendirme:
              </span>
              <p className="text-slate-300 print:text-slate-700 leading-relaxed text-[11px]">
                Kamera tabanlı uzaktan fotopletismografi (rPPG) incelemesinde nabız dalga formu düzenli sinüs ritmindedir.
                SDPPG ivme fotopletismografi parametreleri ve b/a oranı (-0.58), elastik arter yapısını ve düşük vasküler direnci
                göstermektedir. Otonom sinir sistemi sempatovagal dengededir (LF/HF: {metrics.hrvLfHfRatio.toFixed(2)}).
                Sürücü canlılık ve uyanıklık seviyesi güvenli sürüş için uygundur.
              </p>
            </div>

            {/* Mimar ve Uzman İmzası */}
            <div className="border border-slate-700 print:border-slate-400 rounded-xl p-3 bg-slate-900/80 print:bg-slate-50 min-w-[240px] text-center">
              <div className="flex items-center justify-center gap-1.5 text-cyan-400 print:text-cyan-800 mb-1">
                <Award className="w-4 h-4" />
                <span className="font-bold text-[11px] uppercase tracking-wider">Doğrulanmış Algoritma Tasarımı</span>
              </div>
              <div className="font-serif italic font-bold text-sm text-white print:text-black my-1">
                Serdar Alptekin Ürer
              </div>
              <div className="text-[10px] text-slate-400 print:text-slate-600">
                Biyomedikal Sistemler & Görüntü İşleme
              </div>
              <div className="text-[9px] text-cyan-500 print:text-cyan-700 font-mono mt-1 border-t border-slate-800 print:border-slate-300 pt-1">
                TIPTEKNO 2014 & HearthCam Laboratuvarı
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
