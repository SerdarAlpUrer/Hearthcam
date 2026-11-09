import React, { useState } from 'react';
import {
  X,
  Video,
  Download,
  Trash2,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  Gauge,
  Heart,
  Eye,
  Film,
} from 'lucide-react';
import { IncidentClip } from '../types';

interface BlackboxModalProps {
  clips: IncidentClip[];
  onClearClips: () => void;
  onClose: () => void;
}

export const BlackboxModal: React.FC<BlackboxModalProps> = ({
  clips,
  onClearClips,
  onClose,
}) => {
  const [selectedClip, setSelectedClip] = useState<IncidentClip | null>(
    clips.length > 0 ? clips[0] : null
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const getReasonBadge = (reason: string) => {
    if (reason.includes('Uyku') || reason.includes('Kapanma')) {
      return { bg: 'bg-rose-950/80 border-rose-600 text-rose-300', label: '🔴 MİKRO-UYKU' };
    }
    if (reason.includes('Telefon') || reason.includes('Göz')) {
      return { bg: 'bg-amber-950/80 border-amber-600 text-amber-300', label: '📱 GÖZ TELEFONDA' };
    }
    if (reason.includes('Sigara') || reason.includes('Yeme')) {
      return { bg: 'bg-purple-950/80 border-purple-600 text-purple-300', label: '🚬 SİGARA / YEME' };
    }
    if (reason.includes('Öfke') || reason.includes('Rage')) {
      return { bg: 'bg-red-950/80 border-red-600 text-red-300', label: '😡 YOL ÖFKESİ' };
    }
    return { bg: 'bg-cyan-950/80 border-cyan-600 text-cyan-300', label: '⚠️ SÜRÜCÜ DİKKAT' };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-cyan-800/60 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Üst Başlık Çubuğu */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Olay Kara Kutusu (Incident Blackbox)</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {clips.length} Kayıtlı Olay
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kritik mikro-uyku, dikkat dağınıklığı ve acil durum anlarının 10 saniyelik video kayıtları
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {clips.length > 0 && (
              <button
                onClick={onClearClips}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 text-xs transition border border-slate-700"
                title="Kara kutu kayıtlarını temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Temizle</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* İçerik Izgarası */}
        {clips.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
              <Video className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-300">Henüz Kayıtlı Bir Olay Yok</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Sürüş esnasında mikro-uyku, gözlerin telefona kayması veya kafa düşmesi gibi kritik bir durum
              algılandığında kara kutu otomatik olarak 10 saniyelik video klibi buraya kaydedecektir.
            </p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Sol: Video Oynatıcı ve Telemetri Detayı */}
            <div className="lg:col-span-8 p-4 flex flex-col gap-3 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800">
              {selectedClip && (
                <>
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                    {selectedClip.videoUrl ? (
                      <video
                        src={selectedClip.videoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-contain"
                      />
                    ) : selectedClip.thumbnailUrl ? (
                      <img
                        src={selectedClip.thumbnailUrl}
                        alt="Olay Karesi"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs font-mono">Video Verisi İşleniyor...</div>
                    )}

                    {/* Canlı Olay Rozeti */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow ${getReasonBadge(selectedClip.reason).bg}`}>
                        {getReasonBadge(selectedClip.reason).label}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-mono text-slate-300">
                      {selectedClip.timestamp}
                    </div>
                  </div>

                  {/* Telemetri Kutuları */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Araç Hızı</span>
                      </div>
                      <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                        {Math.round(selectedClip.metrics.speed)} <span className="text-xs font-normal">km/s</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>Kalp Hızı</span>
                      </div>
                      <div className="text-xl font-black font-mono text-rose-400 mt-1">
                        {selectedClip.metrics.bpm} <span className="text-xs font-normal">BPM</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>PERCLOS</span>
                      </div>
                      <div className="text-xl font-black font-mono text-amber-400 mt-1">
                        %{selectedClip.metrics.perclos}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Klip Süresi</span>
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                        {selectedClip.durationSec} <span className="text-xs font-normal">sn</span>
                      </div>
                    </div>
                  </div>

                  {/* İndirme Butonu */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400 font-mono">ID: {selectedClip.id}</span>
                    {selectedClip.videoUrl && (
                      <a
                        href={selectedClip.videoUrl}
                        download={`HearthCam-${selectedClip.id}.webm`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Video Klibi İndir (WebM)</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sağ: Olay Klipleri Listesi */}
            <div className="lg:col-span-4 p-3 overflow-y-auto max-h-[500px] flex flex-col gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-1">
                Kayıt Listesi (En Yeniden Eskiye)
              </span>
              {clips.map((clip) => {
                const badge = getReasonBadge(clip.reason);
                const isSelected = selectedClip?.id === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClip(clip)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Küçük Thumbnail */}
                    <div className="w-16 h-12 rounded-lg bg-black overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                      {clip.thumbnailUrl ? (
                        <img src={clip.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" />
                      ) : (
                        <Film className="w-4 h-4 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{clip.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium truncate mt-1">
                        {clip.reason}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {Math.round(clip.metrics.speed)} km/s • {clip.metrics.bpm} BPM
                      </div>
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
