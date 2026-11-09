import React, { useState } from 'react';
import {
  X,
  Car,
  Bluetooth,
  Usb,
  Gauge,
  Sliders,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Power,
  RotateCcw,
} from 'lucide-react';
import { ObdTelemetry } from '../types';

interface ObdConnectModalProps {
  telemetry: ObdTelemetry;
  onConnectBluetooth: () => Promise<void>;
  onConnectSerial: () => Promise<void>;
  onDisconnect: () => void;
  onSetSimulatedSpeed: (speed: number) => void;
  onClose: () => void;
}

export const ObdConnectModal: React.FC<ObdConnectModalProps> = ({
  telemetry,
  onConnectBluetooth,
  onConnectSerial,
  onDisconnect,
  onSetSimulatedSpeed,
  onClose,
}) => {
  const [connecting, setConnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sliderSpeed, setSliderSpeed] = useState<number>(telemetry.speedKmh);

  const handleBtConnect = async () => {
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

  const handleSerialConnect = async () => {
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

  const handleSpeedChange = (newSpeed: number) => {
    setSliderSpeed(newSpeed);
    onSetSimulatedSpeed(newSpeed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1324] border border-cyan-800/60 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">OBD-II & Araç Telemetrisi</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  !telemetry.connected
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                    : telemetry.deviceType === 'SIMULATOR'
                    ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300'
                    : 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                }`}>
                  {!telemetry.connected
                    ? '○ Bağlı Değil'
                    : telemetry.deviceType === 'SIMULATOR'
                    ? '● Simülatör (Test)'
                    : '● Canlı CAN Bağlı'}
                </span>
              </div>
              <p className="text-xs text-slate-400">ELM327 Bluetooth / USB Dongle veya Dahili Araç Simülatörü</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-3 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Göstergeler HUD (Hız & Devir) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Araç Hızı</span>
            <div className="text-3xl font-black font-mono text-cyan-400 mt-1">
              {telemetry.connected ? Math.round(telemetry.speedKmh) : '--'} <span className="text-xs font-normal">km/s</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Motor Devri</span>
            <div className="text-3xl font-black font-mono text-indigo-400 mt-1">
              {telemetry.connected ? telemetry.rpm : '--'} <span className="text-xs font-normal">RPM</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Gaz Pedalı</span>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
              {telemetry.connected ? `%${telemetry.throttlePos}` : '--'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Hararet</span>
            <div className="text-3xl font-black font-mono text-amber-400 mt-1">
              {telemetry.connected ? `${telemetry.coolantTempC}°C` : '--'}
            </div>
          </div>
        </div>

        {/* Yüksek Hız Çarpışma Riski Uyarısı */}
        {telemetry.highSpeedMicrosleepRisk && (
          <div className="mb-4 p-3 rounded-xl bg-rose-600 border border-rose-400 text-white font-bold text-xs flex items-center justify-between animate-pulse shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>ACİL ÇARPIŞMA UYARISI: {Math.round(telemetry.speedKmh)} km/s Hızda Sürücü Uykuda!</span>
            </div>
            <span className="bg-black/40 px-2 py-1 rounded text-[10px] uppercase font-mono">FRENLEME GEREKLİ</span>
          </div>
        )}

        {/* Bağlantı Düğmeleri (Bluetooth & USB Serial) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block mb-3">
            Fiziksel ELM327 OBD-II Cihaz Bağlantısı
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleBtConnect}
              disabled={connecting}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-700/60 text-cyan-300 text-xs font-semibold transition disabled:opacity-50"
            >
              <Bluetooth className="w-4 h-4 text-cyan-400" />
              <span>Bluetooth OBD-II Bağlan</span>
            </button>

            <button
              onClick={handleSerialConnect}
              disabled={connecting}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-700/60 text-indigo-300 text-xs font-semibold transition disabled:opacity-50"
            >
              <Usb className="w-4 h-4 text-indigo-400" />
              <span>USB / Seri ELM327 Bağlan</span>
            </button>
          </div>

          {telemetry.connected && (
            <button
              onClick={onDisconnect}
              className="w-full mt-3 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs transition border border-slate-700"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Bağlantıyı Kes</span>
            </button>
          )}
        </div>

        {/* İsteğe Bağlı Test Amaçlı Hız Simülasyonu */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Test Hız Simülasyonu
            </span>
            <button
              onClick={() => {
                if (telemetry.deviceType === 'SIMULATOR') {
                  onDisconnect();
                } else {
                  handleSpeedChange(sliderSpeed > 0 ? sliderSpeed : 60);
                }
              }}
              className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition border ${
                telemetry.deviceType === 'SIMULATOR'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {telemetry.deviceType === 'SIMULATOR' ? 'Simülasyonu Durdur' : 'Test Simülasyonunu Aç'}
            </button>
          </div>

          {telemetry.deviceType === 'SIMULATOR' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Simüle Hız:</span>
                <span className="text-cyan-400 font-mono font-bold">{sliderSpeed} km/s</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={sliderSpeed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0 km/s (Duruş)</span>
                <span>60 km/s (Şehir İçi)</span>
                <span>120 km/s (Otoyol)</span>
                <span>180 km/s (Yüksek Hız)</span>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {[0, 50, 90, 130].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSpeedChange(preset)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition border ${
                      sliderSpeed === preset
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {preset} km/s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
