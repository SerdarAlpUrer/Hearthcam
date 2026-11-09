import React, { useState } from 'react';
import { Terminal, Download, ShieldAlert, Cpu, Check, AlertCircle } from 'lucide-react';
import { CanMessage } from '../types';

interface CanBusTerminalProps {
  messages: CanMessage[];
  onClear: () => void;
}

export const CanBusTerminal: React.FC<CanBusTerminalProps> = ({ messages, onClear }) => {
  const [copied, setCopied] = useState(false);

  // CSV olarak dışa aktar (Akademik & Ar-Ge Analizi)
  const exportCsv = () => {
    if (messages.length === 0) return;
    const header = 'Zaman,CAN_ID,Mesaj_Adi,Hex_Veri,BPM,HRV_ms,SpO2,Tansiyon_Sys,Tansiyon_Dia,Damar_Yasi,LF_HF_Orani,Bilisel_Yuk,PUI,Yorgunluk_PERCLOS,Dikkat_Dagilimi,Acil_Durum\n';
    const rows = messages.map(m =>
      `"${m.timestamp}","${m.id}","${m.name}","${m.byteData}",${m.decoded.hr},${m.decoded.hrv},${m.decoded.spO2 || 98},${m.decoded.bpSys || 120},${m.decoded.bpDia || 80},${m.decoded.vascularAge || 30},${m.decoded.lfHfRatio || 1.1},${m.decoded.cognitiveLoad || 25},${m.decoded.pui || 3.2},${m.decoded.fatigueLevel},${m.decoded.distraction},${m.decoded.emergencyTrigger}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hearthcam_can_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
      {/* Başlık ve Eylemler */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm tracking-wide text-slate-200">
            ARAÇ CAN BUS / CAN-FD TELEMETRİ MONİTÖRÜ
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-mono">
            500 kbps CAN-FD
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-40"
            title="Telemetriyi CSV olarak indir"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>CSV Aktar</span>
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Terminal Günlük Penceresi */}
      <div className="my-3 bg-[#070b13] border border-slate-800/80 rounded-lg p-2.5 font-mono text-[11px] h-40 overflow-y-auto flex flex-col-reverse gap-1.5 select-text">
        {messages.length === 0 ? (
          <div className="text-slate-500 py-6 text-center italic">
            CAN Bus telemetrisi bekleniyor... Yüz algılandığında çerçeveler burada yayınlanacaktır.
          </div>
        ) : (
          messages.slice(0, 40).map((msg, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-1 rounded border-l-2 ${
                msg.severity === 'alarm'
                  ? 'border-rose-500 bg-rose-950/30 text-rose-300'
                  : msg.severity === 'warn'
                  ? 'border-amber-500 bg-amber-950/30 text-amber-200'
                  : 'border-cyan-500/60 bg-slate-900/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{msg.timestamp}</span>
                <span className="font-bold text-cyan-300">[{msg.id}]</span>
                <span className="text-slate-400 font-semibold">{msg.name}:</span>
                <span className="text-emerald-400 font-mono tracking-wider">{msg.byteData}</span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>HR: <b className="text-white">{msg.decoded.hr}</b></span>
                <span>PERCLOS: <b className="text-white">%{msg.decoded.fatigueLevel}</b></span>
                {msg.decoded.emergencyTrigger && (
                  <span className="text-rose-400 font-bold animate-pulse">! ACİL MÜDAHALE !</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CAN Protokol Bilgisi */}
      <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between pt-1">
        <span>Ağ: <b>CAN 2.0B / CAN-FD ISO 11898</b></span>
        <span>Hedef ECU: <b>BCM (Body Control) & ADAS Domain Controller</b></span>
        <span>Yayın: <b>1000 ms (Kritik durumlarda Event-Driven 10 ms)</b></span>
      </div>
    </div>
  );
};
