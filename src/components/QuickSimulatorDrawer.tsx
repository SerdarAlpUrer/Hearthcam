import React from 'react';
import { Sparkles, RotateCcw, Smartphone, Cigarette, Flame, AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface QuickSimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (scenario: 'NORMAL' | 'DROWSY' | 'RAGE' | 'DISTRACTED' | 'EMERGENCY' | 'SMOKING') => void;
}

export const QuickSimulatorDrawer: React.FC<QuickSimulatorDrawerProps> = ({
  isOpen,
  onClose,
  onSimulate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-16 right-4 z-50 bg-[#0f172a]/95 backdrop-blur-xl border border-cyan-800/80 rounded-2xl p-4 shadow-2xl max-w-sm w-[90%] sm:w-80 animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs text-white uppercase tracking-wider">
            DMS Test Senaryoları
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          onClick={() => {
            onSimulate('DROWSY');
            onClose();
          }}
          className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 font-semibold text-left transition flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Mikro-Uyku</span>
        </button>

        <button
          onClick={() => {
            onSimulate('RAGE');
            onClose();
          }}
          className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold text-left transition flex items-center gap-2"
        >
          <Flame className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Yol Öfkesi</span>
        </button>

        <button
          onClick={() => {
            onSimulate('SMOKING');
            onClose();
          }}
          className="p-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 font-semibold text-left transition flex items-center gap-2"
        >
          <Cigarette className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Sigara / Yeme</span>
        </button>

        <button
          onClick={() => {
            onSimulate('DISTRACTED');
            onClose();
          }}
          className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 font-semibold text-left transition flex items-center gap-2"
        >
          <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Telefon</span>
        </button>

        <button
          onClick={() => {
            onSimulate('EMERGENCY');
            onClose();
          }}
          className="p-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-600 font-semibold text-left transition flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Tepkisiz Sürücü</span>
        </button>

        <button
          onClick={() => {
            onSimulate('NORMAL');
            onClose();
          }}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-left transition flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Sıfırla (Uyanık)</span>
        </button>
      </div>
    </div>
  );
};
