import React, { useState } from 'react';
import {
  Film,
  Award,
  Download,
  Trash2,
  Clock,
  Compass,
  Gauge,
  Heart,
  Eye,
  Coffee,
  RotateCcw,
  Video,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { IncidentClip, TripStats } from '../types';

interface BlackboxTripViewProps {
  stats: TripStats;
  clips: IncidentClip[];
  onResetTrip: () => void;
  onClearClips: () => void;
}

export const BlackboxTripView: React.FC<BlackboxTripViewProps> = ({
  stats,
  clips,
  onResetTrip,
  onClearClips,
}) => {
  const [selectedClip, setSelectedClip] = useState<IncidentClip | null>(
    clips.length > 0 ? clips[0] : null
  );

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs} sa ${mins} dk`;
    return `${mins} dk ${secs} sn`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return { text: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-950/60' };
      case 'B':
        return { text: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-950/60' };
      case 'C':
        return { text: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-950/60' };
      default:
        return { text: 'text-rose-500', border: 'border-rose-600', bg: 'bg-rose-950/60' };
    }
  };

  const gradeStyle = getGradeColor(stats.grade);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Sürücü Güvenlik Karnesi Üst Bölümü */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sürücü Güvenlik Karnesi & Seyahat Analitiği</h2>
              <p className="text-xs text-slate-400">Euro NCAP & SAE J3016 Uyumlu Sürüş Performans Değerlendirmesi</p>
            </div>
          </div>

          <button
            onClick={onResetTrip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Karneni Sıfırla</span>
          </button>
        </div>

        {/* Not ve Seyahat Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
          {/* Büyük Not */}
          <div className={`md:col-span-4 rounded-2xl border ${gradeStyle.border} ${gradeStyle.bg} p-5 flex flex-col items-center justify-center text-center shadow-lg`}>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Sürüş Emniyet Notu</span>
            <div className={`text-6xl font-black font-mono my-1 ${gradeStyle.text}`}>{stats.grade}</div>
            <div className="text-2xl font-black font-mono text-white">
              %{stats.safetyScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 px-3 py-1 rounded-full bg-black/50 text-xs font-medium text-slate-300">
              {stats.safetyScore >= 85 ? '✓ Üst Düzey Emniyetli Sürüş' : '⚠️ Geliştirilmesi Gereken Sürüş'}
            </div>
          </div>

          {/* İstatistikler */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Süre</span>
              </div>
              <span className="text-lg font-bold font-mono text-white block">{formatDuration(stats.durationSeconds)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase mb-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mesafe</span>
              </div>
              <span className="text-lg font-bold font-mono text-white block">{stats.distanceKm} km</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase mb-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ort. Hız</span>
              </div>
              <span className="text-lg font-bold font-mono text-white block">{stats.avgSpeedKmh} km/s</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase mb-1">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span>Mola Vakti</span>
              </div>
              <span className="text-lg font-bold font-mono text-amber-400 block">{stats.recommendedBreakInMinutes} dk</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Olay Kara Kutusu (Blackbox) Bölümü */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Olay Kara Kutusu Kayıtları</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                  {clips.length} Klip
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mikro-uyku, telefon dikkati ve ani durumlarda kaydedilen 10 saniyelik video kanıtları
              </p>
            </div>
          </div>

          {clips.length > 0 && (
            <button
              onClick={onClearClips}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 text-xs transition border border-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Temizle</span>
            </button>
          )}
        </div>

        {clips.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
              <Video className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-300">Henüz Kaydedilmiş Bir Olay Yok</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              Sürüş esnasında herhangi bir mikro-uyku, telefona bakış veya acil durum gerçekleştiğinde 10 saniyelik
              video klipleri otomatik olarak buraya kaydedilecektir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Sol: Seçili Video Oynatıcı */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {selectedClip && (
                <>
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                    {selectedClip.videoUrl ? (
                      <video src={selectedClip.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                    ) : selectedClip.thumbnailUrl ? (
                      <img src={selectedClip.thumbnailUrl} alt="Olay" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-500 text-xs font-mono flex items-center justify-center h-full">Video İşleniyor...</div>
                    )}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-bold text-rose-300 border border-rose-800">
                      {selectedClip.reason}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">
                      Hız: {Math.round(selectedClip.metrics.speed)} km/s • Kalp: {selectedClip.metrics.bpm} BPM • PERCLOS: %{selectedClip.metrics.perclos}
                    </span>
                    {selectedClip.videoUrl && (
                      <a
                        href={selectedClip.videoUrl}
                        download={`HearthCam-${selectedClip.id}.webm`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Klibi İndir</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sağ: Olay Klipleri Listesi */}
            <div className="lg:col-span-5 flex flex-col gap-2 max-h-[360px] overflow-y-auto">
              {clips.map((clip) => {
                const isSelected = selectedClip?.id === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClip(clip)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                      isSelected ? 'bg-slate-800/90 border-cyan-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-16 h-12 bg-black rounded-lg overflow-hidden shrink-0 border border-slate-700">
                      {clip.thumbnailUrl ? (
                        <img src={clip.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" />
                      ) : (
                        <Film className="w-4 h-4 text-slate-600 m-auto mt-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 truncate">{clip.reason}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{clip.timestamp}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        {Math.round(clip.metrics.speed)} km/s • {clip.metrics.bpm} BPM
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
