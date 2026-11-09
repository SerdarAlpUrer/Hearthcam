import React, { useState } from 'react';
import {
  Car,
  Bluetooth,
  Usb,
  Cpu,
  Activity,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Brain,
  Sliders,
  ChevronDown,
  ChevronUp,
  Camera,
  Terminal,
} from 'lucide-react';
import { CanBusTerminal } from './CanBusTerminal';
import { AppSettings, ObdTelemetry, CanMessage, SmoothingLevel } from '../types';

interface SettingsTelemetryViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  obdTelemetry: ObdTelemetry;
  onConnectBluetooth: () => Promise<void>;
  onConnectSerial: () => Promise<void>;
  onDisconnectObd: () => void;
  onSetSimulatedSpeed: (speed: number) => void;
  canMessages: CanMessage[];
  onClearCanMessages: () => void;
}

export const SettingsTelemetryView: React.FC<SettingsTelemetryViewProps> = ({
  settings,
  onUpdateSettings,
  obdTelemetry,
  onConnectBluetooth,
  onConnectSerial,
  onDisconnectObd,
  onSetSimulatedSpeed,
  canMessages,
  onClearCanMessages,
}) => {
  const [connecting, setConnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCanTerminal, setShowCanTerminal] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  React.useEffect(() => {
    async function loadDevices() {
      try {
        if (navigator.mediaDevices) {
          const devList = await navigator.mediaDevices.enumerateDevices();
          setDevices(devList.filter(d => d.kind === 'videoinput'));
        }
      } catch (e) {}
    }
    loadDevices();
  }, []);

  const handleBt = async () => {
    try {
      setConnecting(true);
      setErrorMsg(null);
      await onConnectBluetooth();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bluetooth bağlantısı kurulamadı.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSerial = async () => {
    try {
      setConnecting(true);
      setErrorMsg(null);
      await onConnectSerial();
    } catch (err: any) {
      setErrorMsg(err.message || 'USB Seri bağlantı kurulamadı.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. OBD-II ve Araç Telemetrisi Ayarları */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">OBD-II Araç Telemetri Ayarları</h3>
              <p className="text-xs text-slate-400">ELM327 Bluetooth / USB Donanım Bağlantısı</p>
            </div>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-mono border ${
              !obdTelemetry.connected
                ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                : obdTelemetry.deviceType === 'SIMULATOR'
                ? 'bg-indigo-950 border-indigo-700 text-indigo-300'
                : 'bg-emerald-950 border-emerald-700 text-emerald-300'
            }`}
          >
            {!obdTelemetry.connected
              ? '○ Araç Bağlı Değil'
              : obdTelemetry.deviceType === 'SIMULATOR'
              ? '● Simülatör (Test Modu)'
              : '● Canlı CAN Bağlı'}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleBt}
            disabled={connecting}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-700/60 text-cyan-300 text-xs font-semibold transition disabled:opacity-50"
          >
            <Bluetooth className="w-4 h-4 text-cyan-400" />
            <span>Bluetooth OBD-II Bağlan</span>
          </button>

          <button
            onClick={handleSerial}
            disabled={connecting}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-700/60 text-indigo-300 text-xs font-semibold transition disabled:opacity-50"
          >
            <Usb className="w-4 h-4 text-indigo-400" />
            <span>USB / Seri ELM327 Bağlan</span>
          </button>
        </div>

        {obdTelemetry.connected && obdTelemetry.deviceType !== 'SIMULATOR' && (
          <div className="mb-4">
            <button
              onClick={onDisconnectObd}
              className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs transition border border-slate-700"
            >
              <span>Bağlantıyı Kes</span>
            </button>
          </div>
        )}

        {/* Hız Simülasyonu (İsteğe Bağlı Test) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Geliştirici / Test Hız Simülasyonu
            </span>
            <button
              onClick={() => {
                if (obdTelemetry.deviceType === 'SIMULATOR') {
                  onDisconnectObd();
                } else {
                  onSetSimulatedSpeed(60);
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition border ${
                obdTelemetry.deviceType === 'SIMULATOR'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {obdTelemetry.deviceType === 'SIMULATOR' ? 'Simülasyonu Kapat' : 'Test Simülasyonunu Aç'}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-1.5">
            {obdTelemetry.deviceType === 'SIMULATOR'
              ? 'Simülasyon aktif: Aşağıdaki kaydırıcıyla test hızını değiştirebilirsiniz.'
              : 'Araç bağlı değilken hız verisi gösterilmez. Yalnızca test senaryoları için simülasyon açılabilir.'}
          </p>

          {obdTelemetry.deviceType === 'SIMULATOR' && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="text-slate-400">Simüle Hız:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {Math.round(obdTelemetry.speedKmh)} km/s
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="180"
                value={obdTelemetry.speedKmh}
                onChange={(e) => onSetSimulatedSpeed(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />

              <div className="flex items-center gap-2 mt-2.5">
                {[0, 50, 90, 130].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onSetSimulatedSpeed(preset)}
                    className="flex-1 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                  >
                    {preset} km/s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. rPPG Algoritma ve Kamera İnce Ayarları */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Biyometrik Motor & Algoritma</h3>
            <p className="text-xs text-slate-400">Fotopletismografi Sinyal İşleme Parametreleri</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Algoritma Seçici */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-300 font-medium">rPPG Renk Ayrıştırma Algoritması:</span>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['POS', 'CHROM', 'GREEN'] as const).map((algo) => (
                <button
                  key={algo}
                  onClick={() => onUpdateSettings({ algorithm: algo })}
                  className={`py-1.5 rounded-lg font-mono text-xs font-bold transition ${
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

          {/* Sinyal Yumuşatma */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-300 font-medium">BPM / Telemetri Yumuşatma Seviyesi:</span>
            <select
              value={settings.smoothingLevel}
              onChange={(e) => onUpdateSettings({ smoothingLevel: e.target.value as SmoothingLevel })}
              className="bg-slate-900 border border-slate-800 text-emerald-400 font-semibold rounded-xl p-2.5 outline-none focus:border-cyan-500"
            >
              <option value="ULTRA_SMOOTH">Ultra Yumuşak (Minimum Titreme)</option>
              <option value="SMOOTH">Yumuşak (Önerilen Sürüş Modu)</option>
              <option value="BALANCED">Dengeli</option>
              <option value="RESPONSIVE">Hızlı / Anlık Tepki</option>
            </select>
          </div>
        </div>

        {/* Kamera Donanım Kaynağı */}
        <div className="flex flex-col gap-1.5 mt-3 text-xs">
          <span className="text-slate-300 font-medium">Aktif Kamera Aygıtı:</span>
          <select
            value={settings.selectedCameraId}
            onChange={(e) => onUpdateSettings({ selectedCameraId: e.target.value })}
            className="bg-slate-900 border border-slate-800 text-slate-200 font-semibold rounded-xl p-2.5 outline-none focus:border-cyan-500"
          >
            <option value="">Varsayılan Kamera</option>
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Kamera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Anahtar Aç/Kapa Düğmeleri */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <button
            onClick={() => onUpdateSettings({ cameraExposureLocked: !settings.cameraExposureLocked })}
            className={`p-3 rounded-xl border flex items-center justify-between transition ${
              settings.cameraExposureLocked
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span>Pozlama Kilidi (AE/AWB)</span>
            {settings.cameraExposureLocked ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onUpdateSettings({ voiceAssistantEnabled: !settings.voiceAssistantEnabled })}
            className={`p-3 rounded-xl border flex items-center justify-between transition ${
              settings.voiceAssistantEnabled
                ? 'bg-cyan-950/60 border-cyan-600 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span>Türkçe Sesli Uyarılar</span>
            {settings.voiceAssistantEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. CAN Bus Canlı Mühendislik Terminali (İsteğe Bağlı Açılır) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <button
          onClick={() => setShowCanTerminal(!showCanTerminal)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">CAN Bus & CAN-FD Canlı Terminali</h3>
              <p className="text-xs text-slate-400">Otomotiv Ağ İletişim Paketleri ve Hex Kayıtları</p>
            </div>
          </div>
          {showCanTerminal ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showCanTerminal && (
          <div className="p-4 border-t border-slate-800">
            <CanBusTerminal messages={canMessages} onClear={onClearCanMessages} />
          </div>
        )}
      </div>
    </div>
  );
};
