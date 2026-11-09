import React from 'react';
import {
  X,
  Award,
  ShieldCheck,
  Clock,
  Compass,
  Gauge,
  Heart,
  Eye,
  AlertTriangle,
  Coffee,
  RotateCcw,
  Smartphone,
  Flame,
} from 'lucide-react';
import { TripStats } from '../types';

interface TripScorecardModalProps {
  stats: TripStats;
  onResetTrip: () => void;
  onClose: () => void;
}

export const TripScorecardModal: React.FC<TripScorecardModalProps> = ({
  stats,
  onResetTrip,
  onClose,
}) => {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs} sa ${mins} dk`;
    }
    return `${mins} dk ${secs} sn`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
        return { text: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-950/60' };
      case 'A':
        return { text: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-950/60' };
      case 'B':
        return { text: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-950/60' };
      case 'C':
        return { text: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-950/60' };
      case 'D':
        return { text: 'text-orange-400', border: 'border-orange-500', bg: 'bg-orange-950/60' };
      default:
        return { text: 'text-rose-500', border: 'border-rose-600', bg: 'bg-rose-950/60' };
    }
  };

  const gradeStyle = getGradeColor(stats.grade);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-cyan-800/60 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Başlık Çubuğu */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sürücü Güvenlik Karnesi & Seyahat Analitiği</h2>
              <p className="text-xs text-slate-400">Euro NCAP & SAE J3016 Uyumlu Sürüş Performans Değerlendirmesi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ana Skor ve Karne Rozeti */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4">
          {/* Sol: Büyük Not Rozeti */}
          <div className={`md:col-span-5 rounded-2xl border ${gradeStyle.border} ${gradeStyle.bg} p-6 flex flex-col items-center justify-center text-center shadow-lg`}>
            <span className="text-[11px] uppercase font-mono tracking-widest text-slate-400">Sürüş Güvenlik Notu</span>
            <div className={`text-7xl font-black font-mono my-2 ${gradeStyle.text}`}>
              {stats.grade}
            </div>
            <div className="text-2xl font-black font-mono text-white">
              %{stats.safetyScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="mt-3 px-3 py-1 rounded-full bg-black/50 text-xs font-medium text-slate-300">
              {stats.safetyScore >= 85 ? '✓ Üst Düzey Emniyetli Sürüş' : stats.safetyScore >= 70 ? '⚠️ Orta Derece Risk' : '🛑 Kritik Risk Düzeyi'}
            </div>
          </div>

          {/* Sağ: Seyahat İstatistikleri (Mesafe, Süre, Hız) */}
          <div className="md:col-span-7 grid grid-cols-2 gap-2.5">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Seyahat Süresi</span>
                <span className="text-base font-bold text-white font-mono">{formatDuration(stats.durationSeconds)}</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Kat Edilen Yol</span>
                <span className="text-base font-bold text-white font-mono">{stats.distanceKm} km</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Ortalama Hız</span>
                <span className="text-base font-bold text-white font-mono">{stats.avgSpeedKmh} km/s</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Ortalama Kalp</span>
                <span className="text-base font-bold text-white font-mono">{stats.avgBpm} BPM</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Emniyet Sütunu Performans Çubukları */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 my-4 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Euro NCAP Sürüş Değerlendirme Kriterleri
          </span>

          {/* 1. Yola Odaklanma */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Yola Odaklanma & Bakış Disiplini</span>
              <span className="text-cyan-400 font-bold font-mono">
                %{Math.max(20, 100 - stats.phoneDistractions * 12)}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(20, 100 - stats.phoneDistractions * 12)}%` }}
              />
            </div>
          </div>

          {/* 2. Uyanıklık & PERCLOS */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Uyanıklık Seviyesi (PERCLOS & Kırpma)</span>
              <span className="text-emerald-400 font-bold font-mono">
                %{Math.max(15, 100 - stats.microsleepEvents * 25 - stats.totalYawns * 5)}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(15, 100 - stats.microsleepEvents * 25 - stats.totalYawns * 5)}%` }}
              />
            </div>
          </div>

          {/* 3. Stres ve Ritim Kararlılığı */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Fizyolojik Sakinlik & Duygusal Denge</span>
              <span className="text-purple-400 font-bold font-mono">
                %{Math.max(25, 100 - stats.roadRageEvents * 20)}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(25, 100 - stats.roadRageEvents * 20)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Olay Sayaçları ve Mola Tavsiyesi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Esneme Sayısı</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">{stats.totalYawns}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Telefon Dikkati</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">{stats.phoneDistractions}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Mikro-Uyku</span>
            <span className="text-xl font-bold font-mono text-rose-500 mt-1 block">{stats.microsleepEvents}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Sigara / Yeme</span>
            <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">{stats.smokingOrEatingEvents}</span>
          </div>
        </div>

        {/* Dinamik Mola Kartı */}
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-800/60 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-900/80 text-cyan-300">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono text-cyan-300 font-bold block">Önerilen Mola Zamanı</span>
              <p className="text-sm text-slate-200 mt-0.5">
                {stats.recommendedBreakInMinutes === 0
                  ? '🛑 Lütfen ilk güvenli dinlenme alanında aracı durdurup mola veriniz!'
                  : `Yaklaşık ${stats.recommendedBreakInMinutes} dakika sonra mola vermeniz tavsiye edilir.`}
              </p>
            </div>
          </div>

          <button
            onClick={onResetTrip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 shrink-0"
            title="Seyahat sayacını sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Karneni Sıfırla</span>
          </button>
        </div>
      </div>
    </div>
  );
};
