import React from 'react';
import {
  Cpu,
  RotateCcw,
  Activity,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  LayoutDashboard,
  Smartphone,
  FileText,
  Wind,
  Film,
  Award,
  Car,
  Cigarette,
} from 'lucide-react';
import { AppSettings, SmoothingLevel } from '../types';

interface ControlBarProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onSimulateScenario: (scenario: 'NORMAL' | 'DROWSY' | 'RAGE' | 'DISTRACTED' | 'EMERGENCY' | 'SMOKING') => void;
  onOpenReport: () => void;
  onOpenBreathing: () => void;
  onOpenBlackbox: () => void;
  onOpenTripScorecard: () => void;
  onOpenObd: () => void;
  incidentCount?: number;
  safetyScore?: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  settings,
  onUpdateSettings,
  onSimulateScenario,
  onOpenReport,
  onOpenBreathing,
  onOpenBlackbox,
  onOpenTripScorecard,
  onOpenObd,
  incidentCount = 0,
  safetyScore = 100,
}) => {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2.5 text-xs">
      {/* 1. Üst Sıra: Gelişmiş Modül Eylem Düğmeleri */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Klinik Rapor (PDF) */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 font-semibold shadow transition transform active:scale-95"
            title="Klinik Kardiyovasküler & Damar Yaşı Raporu (Yazdırılabilir PDF)"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Klinik Rapor (PDF)</span>
          </button>

          {/* Kutu Nefesi (Biofeedback) */}
          <button
            onClick={onOpenBreathing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 font-semibold shadow transition transform active:scale-95"
            title="Stres ve Kalp Ritmi Düzenleyici 4-4-4 Kutu Nefesi Egzersizi"
          >
            <Wind className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kutu Nefesi</span>
          </button>

          {/* Olay Kara Kutusu */}
          <button
            onClick={onOpenBlackbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 font-semibold shadow transition transform active:scale-95 relative"
            title="Kritik Olayların 10 Saniyelik Video Kayıtları"
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>Kara Kutu</span>
            {incidentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold">
                {incidentCount}
              </span>
            )}
          </button>

          {/* Sürücü Güvenlik Karnesi */}
          <button
            onClick={onOpenTripScorecard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 font-semibold shadow transition transform active:scale-95"
            title="Euro NCAP Sürüş Karnesi ve Mola Tavsiyeleri"
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sürüş Karnesi</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-900/90 text-emerald-300 font-mono text-[10px]">
              %{safetyScore}
            </span>
          </button>

          {/* OBD-II Araç Telemetrisi */}
          <button
            onClick={onOpenObd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold shadow transition transform active:scale-95"
            title="ELM327 Bluetooth / USB OBD-II ve Araç Telemetri Kontrolü"
          >
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span>OBD-II Telemetri</span>
          </button>
        </div>

        {/* Kompakt Sürüş HUD Modu */}
        <button
          onClick={() => onUpdateSettings({ compactMode: !settings.compactMode })}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
            settings.compactMode
              ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="TS10 ve araç ekranı için sadeleştirilmiş yüksek kontrastlı HUD modu"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
          <span>{settings.compactMode ? 'Detaylı Mod' : 'Sürüş HUD Modu'}</span>
        </button>
      </div>

      {/* 2. Alt Sıra: Algoritma Ayarları & Test Simülasyonları */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Algoritma */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Algoritma:
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {(['POS', 'CHROM', 'GREEN'] as const).map((algo) => (
                <button
                  key={algo}
                  onClick={() => onUpdateSettings({ algorithm: algo })}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition ${
                    settings.algorithm === algo
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {algo}
                </button>
              ))}
            </div>
          </div>

          {/* Veri Yumuşatma Ayarı */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Yumuşatma:
            </span>
            <select
              value={settings.smoothingLevel}
              onChange={(e) => onUpdateSettings({ smoothingLevel: e.target.value as SmoothingLevel })}
              className="bg-slate-900 border border-slate-800 text-emerald-400 font-semibold text-[11px] rounded px-2 py-1 outline-none focus:border-cyan-500"
              title="Verilerin değişim hızını ayarlar. Yumuşak seviyede ani zıplamalar engellenir."
            >
              <option value="ULTRA_SMOOTH">Ultra Yumuşak</option>
              <option value="SMOOTH">Yumuşak (Önerilen)</option>
              <option value="BALANCED">Dengeli</option>
              <option value="RESPONSIVE">Hızlı / Anlık</option>
            </select>
          </div>

          {/* Pozlama Kilidi (AE/AWB Lock) */}
          <button
            onClick={() => onUpdateSettings({ cameraExposureLocked: !settings.cameraExposureLocked })}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition ${
              settings.cameraExposureLocked
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Kameranın otomatik ışık ayarını kilitler, sahte nabız atımlarını önler"
          >
            {settings.cameraExposureLocked ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3" />}
            <span>{settings.cameraExposureLocked ? 'AE Kilitli' : 'AE Otomatik'}</span>
          </button>

          {/* Türkçe Sesli Asistan (TTS) */}
          <button
            onClick={() => onUpdateSettings({ voiceAssistantEnabled: !settings.voiceAssistantEnabled })}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition ${
              settings.voiceAssistantEnabled
                ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Yorgunluk ve dikkat dağınıklığında Türkçe sesli uyarı verir"
          >
            {settings.voiceAssistantEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{settings.voiceAssistantEnabled ? 'Sesli Uyarı' : 'Sessiz'}</span>
          </button>

          {/* Perfüzyon Isı Haritası */}
          <button
            onClick={() => onUpdateSettings({ showPerfusionMap: !settings.showPerfusionMap })}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition ${
              settings.showPerfusionMap
                ? 'bg-rose-950/70 border-rose-600 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Yüzde canlı kılcal damar kan perfüzyon ısı haritasını gösterir"
          >
            <span>{settings.showPerfusionMap ? '🔥 Perfüzyon' : 'Perfüzyon'}</span>
          </button>
        </div>

        {/* DMS Test Simülasyon Butonları */}
        <div className="flex items-center gap-1 border-t md:border-t-0 md:border-l border-slate-800 pt-1.5 md:pt-0 md:pl-2.5">
          <button
            onClick={() => onSimulateScenario('DROWSY')}
            className="px-2 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded text-[11px] font-semibold transition"
            title="Mikro-uyku durumunu simüle et"
          >
            Uyku
          </button>
          <button
            onClick={() => onSimulateScenario('RAGE')}
            className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded text-[11px] font-semibold transition"
            title="Yol öfkesi (Road Rage) simülasyonu"
          >
            Öfke
          </button>
          <button
            onClick={() => onSimulateScenario('SMOKING')}
            className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/50 rounded text-[11px] font-semibold transition flex items-center gap-1"
            title="Kabin içi sigara / yeme-içme simülasyonu"
          >
            <Cigarette className="w-3 h-3 text-purple-400" />
            <span>Sigara</span>
          </button>
          <button
            onClick={() => onSimulateScenario('DISTRACTED')}
            className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded text-[11px] font-semibold transition flex items-center gap-1"
            title="Telefon/Göz ayrılması simülasyonu"
          >
            <Smartphone className="w-3 h-3" />
            <span>Telefon</span>
          </button>
          <button
            onClick={() => onSimulateScenario('NORMAL')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition flex items-center gap-1"
            title="Sıfırla"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

