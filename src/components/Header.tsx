import React, { useState } from 'react';
import {
  HeartPulse,
  Car,
  Volume2,
  VolumeX,
  BookOpen,
  Download,
  QrCode,
  X,
  Smartphone,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Award,
  Cpu,
} from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onToggleSimulatorDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onToggleSimulatorDrawer,
}) => {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Gizli Easter Egg: Logoya 5 kez tıklayınca açılan Mimar Doğrulama Modalı
  const [secretClickCount, setSecretClickCount] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [showArchitectModal, setShowArchitectModal] = useState<boolean>(false);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 900) {
      const nextCount = secretClickCount + 1;
      if (nextCount >= 5) {
        setShowArchitectModal(true);
        setSecretClickCount(0);
      } else {
        setSecretClickCount(nextCount);
      }
    } else {
      setSecretClickCount(1);
    }
    setLastClickTime(now);
  };

  const downloadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/HearthCam-DMS.apk`
    : 'https://188.132.215.147:4000/HearthCam-DMS.apk';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="bg-[#0b1324]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo ve Proje Başlığı (Gizli 5 tık ile mimar mührünü açar) */}
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
            title="HearthCam DMS v2.4 (Core Engine)"
            data-architect="Serdar Alptekin Ürer"
            data-pioneer="TIPTEKNO 2014"
            data-signature="0x534155_SERDAR_ALPTEKIN_URER"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-rose-600 p-0.5 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition transform">
              <div className="w-full h-full bg-[#080c14] rounded-[9px] flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-white font-mono">
                  HEARTH<span className="text-cyan-400">CAM</span>
                </h1>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Biyometrik Nabız & DMS
              </p>
            </div>
          </div>

          {/* Orta / Sağ Hızlı Kontroller */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            {/* Hızlı Test Senaryoları Çekmecesi */}
            {onToggleSimulatorDrawer && (
              <button
                onClick={onToggleSimulatorDrawer}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-900/60 font-semibold text-xs transition transform active:scale-95 shadow"
                title="DMS Test Senaryolarını Aç (Uyku, Öfke, Telefon, Sigara)"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">DMS Test</span>
              </button>
            )}

            {/* Sesli Uyarılar Aç/Kapa Hızlı Düğmesi */}
            <button
              onClick={() => onUpdateSettings({ voiceAssistantEnabled: !settings.voiceAssistantEnabled })}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border font-semibold text-xs transition flex items-center gap-1 ${
                settings.voiceAssistantEnabled
                  ? 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={settings.voiceAssistantEnabled ? 'Sesli Uyarı Açık' : 'Sesli Uyarı Kapalı'}
            >
              {settings.voiceAssistantEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{settings.voiceAssistantEnabled ? 'Ses: Açık' : 'Sessiz'}</span>
            </button>

            {/* QR Kod Butonu */}
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition flex items-center gap-1"
              title="QR Kod ile Telefona/Araca İndir"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">QR</span>
            </button>

            {/* Doğrudan APK İndir Butonu */}
            <a
              href="/HearthCam-DMS.apk"
              download="HearthCam-DMS.apk"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition transform active:scale-95"
              title="Android APK İndir (TS10 & Telefon)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>APK</span>
            </a>
          </div>
        </div>
      </header>

      {/* 1. QR Kod İndirme Modalı */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">HearthCam Android APK</h3>
                <p className="text-xs text-slate-400">TS10 Araç Multimedya & Akıllı Telefonlar İçin</p>
              </div>
            </div>

            <div className="my-5 flex flex-col items-center">
              <div className="p-3 bg-white rounded-xl shadow-lg shadow-cyan-500/10">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadUrl)}`}
                  alt="HearthCam APK QR Code"
                  className="w-48 h-48 block"
                />
              </div>
              <p className="text-xs text-slate-300 mt-3 text-center">
                Telefonunuzun veya TS10'un kamerası ile QR kodu okutarak APK'yı anında indirebilirsiniz.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs font-mono mb-4">
              <span className="text-cyan-400 truncate text-[11px] select-all">{downloadUrl}</span>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/HearthCam-DMS.apk"
                download="HearthCam-DMS.apk"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center shadow-lg transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Doğrudan APK Dosyasını İndir
              </a>
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-3">
              * Kurulum için cihazınızda "Bilinmeyen kaynaklardan uygulama yükleme" iznini açmanız gerekebilir.
            </p>
          </div>
        </div>
      )}

      {/* 2. GİZLİ SİSTEM MİMARI MODALI (Logoya 5 Kez Tıklanınca Açılır) */}
      {showArchitectModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#0b1324] via-[#0f172a] to-[#070b13] border-2 border-cyan-500/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative shadow-cyan-500/20 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowArchitectModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Başlık ve Rozet */}
            <div className="flex items-center gap-3 pb-4 border-b border-cyan-800/40">
              <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/30">
                <ShieldCheck className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-500 text-cyan-300 font-bold tracking-wider">
                    DOĞRULANMIŞ SİSTEM MİMARI
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight mt-1">
                  Serdar Alptekin Ürer
                </h2>
                <p className="text-xs text-cyan-400 font-medium">
                  Baş Biyometri & Algoritma Mimarisi
                </p>
              </div>
            </div>

            {/* Bilgi Gövdesi */}
            <div className="my-5 space-y-3.5 text-xs text-slate-300">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block mb-1">
                  Öncü Akademik Kaynak & Patent Temeli
                </span>
                <p className="font-semibold text-slate-200 text-sm">
                  "Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım"
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Serdar Alptekin Ürer & Mehmet Yıldız • TIPTEKNO 2014 Tıp Teknolojileri Ulusal Kongresi
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[10px]">rPPG ÇEKİRDEK:</span>
                  <span className="text-cyan-300 font-bold">1024-FFT + CHROM / POS</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[10px]">DMS & PUPILLOMETRİ:</span>
                  <span className="text-emerald-300 font-bold">MediaPipe 478 Nokta</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[10px]">DAMAR YAŞI (SDPPG):</span>
                  <span className="text-pink-300 font-bold">Takazawa b/a Modeli</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[10px]">OTOMOTİV VERİ YOLU:</span>
                  <span className="text-indigo-300 font-bold">ISO 11898-1 CAN-FD</span>
                </div>
              </div>

              <div className="bg-[#070b13] border border-cyan-950 rounded-lg p-2.5 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between items-center text-slate-500 mb-1">
                  <span>DİJİTAL SİSTEM İMZASI (SHA-256):</span>
                  <span className="text-emerald-400 font-bold">ONAYLANDI</span>
                </div>
                <div className="text-cyan-400 break-all select-all font-semibold">
                  0x534155_SERDAR_ALPTEKIN_URER_TIPTEKNO_2014_HEARTHCAM_PRO_DMS
                </div>
              </div>
            </div>

            {/* Kapat Butonu */}
            <button
              onClick={() => setShowArchitectModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg transition"
            >
              Mühür Doğrulandı • Devam Et
            </button>
          </div>
        </div>
      )}
    </>
  );
};
