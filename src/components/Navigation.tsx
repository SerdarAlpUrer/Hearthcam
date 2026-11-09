import React from 'react';
import { Car, HeartPulse, ScanEye, Film, Settings } from 'lucide-react';

export type TabType = 'drive' | 'health' | 'vein' | 'blackbox' | 'settings';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  incidentCount: number;
  bpm: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  incidentCount,
  bpm,
}) => {
  const tabs = [
    {
      id: 'drive' as TabType,
      label: 'Kokpit',
      icon: Car,
    },
    {
      id: 'health' as TabType,
      label: 'Kardiyo',
      icon: HeartPulse,
      badge: bpm > 0 ? `${bpm}` : undefined,
    },
    {
      id: 'vein' as TabType,
      label: 'Damar Tarama',
      icon: ScanEye,
      badge: 'RGB',
    },
    {
      id: 'blackbox' as TabType,
      label: 'Kayıtlar',
      icon: Film,
      badge: incidentCount > 0 ? `${incidentCount}` : undefined,
    },
    {
      id: 'settings' as TabType,
      label: 'Ayarlar',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* 1. MASAÜSTÜ & TS10 YATAY EKRAN İÇİN ZARİF SEGMENT ÇUBUĞU */}
      <nav
        aria-label="Ana Gezinme"
        className="hidden md:flex items-center justify-center bg-slate-900/80 border border-slate-800/80 rounded-2xl p-1 shadow-lg backdrop-blur-md max-w-2xl mx-auto w-full my-1"
      >
        <div className="grid grid-cols-5 w-full gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-mono px-1 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2. MOBİL TELEFONLAR İÇİN SABİT ALT GEZİNME BARI */}
      <nav
        aria-label="Mobil Gezinme"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1324]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1 flex items-center justify-around shadow-2xl"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] transition-all relative ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-cyan-950/80 border border-cyan-800/70 shadow' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-0.5">{tab.label}</span>

              {tab.badge && (
                <span className="absolute top-1 right-3 text-[9px] font-mono px-1 rounded-full bg-rose-600 text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
