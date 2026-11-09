import React from 'react';
import { FileText, Wind, HeartPulse, Droplets, ShieldCheck, Activity, Award } from 'lucide-react';
import { PulseWaveform } from './PulseWaveform';
import { BiometricGauges } from './BiometricGauges';
import { BiometricMetrics, AppSettings } from '../types';

interface HealthBiometricsViewProps {
  metrics: BiometricMetrics;
  algorithm: 'POS' | 'CHROM' | 'GREEN';
  onOpenReport: () => void;
  onOpenBreathing: () => void;
}

export const HealthBiometricsView: React.FC<HealthBiometricsViewProps> = ({
  metrics,
  algorithm,
  onOpenReport,
  onOpenBreathing,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Üst Eylem ve Bilgilendirme Bandı */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Kardiyovasküler & Damar Sağlığı Merkezi</h2>
            <p className="text-xs text-slate-400">
              Temassız rPPG Fotopletismografi • İkinci Türev PPG (SDPPG) • HRV Spektral Analizi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenBreathing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 font-semibold text-xs shadow-md transition transform active:scale-95"
          >
            <Wind className="w-4 h-4 text-indigo-400" />
            <span>Kutu Nefesi</span>
          </button>

          <button
            onClick={onOpenReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/25 transition transform active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Klinik Rapor (PDF)</span>
          </button>
        </div>
      </div>

      {/* Canlı BVP Nabız Dalga Formu */}
      <PulseWaveform
        bvpHistory={metrics.bvpHistory}
        bpm={metrics.smoothedBpm}
        confidence={metrics.confidence}
        snr={metrics.snr}
        algorithm={algorithm}
      />

      {/* Biyometrik Göstergeler (6 Vital + SDPPG + HRV) */}
      <BiometricGauges metrics={metrics} />
    </div>
  );
};
