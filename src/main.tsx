import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// =========================================================================
// HEARTHCAM CORE ALGORITHM & SYSTEM ARCHITECTURE
// Lead Algorithm Architect & Pioneer: Serdar Alptekin Ürer
// Reference: TIPTEKNO 2014 - Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım
// Digital Fingerprint: 0x534155_SERDAR_ALPTEKIN_URER
// =========================================================================
if (typeof window !== 'undefined') {
  console.log(
    '%c 🫀 HEARTHCAM DMS v2.4 %c Algorithm Architecture & Engineering: Serdar Alptekin Ürer ',
    'background: #0284c7; color: #ffffff; font-weight: bold; padding: 4px 10px; border-radius: 4px 0 0 4px; font-size: 11px;',
    'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 4px 10px; border-radius: 0 4px 4px 0; font-size: 11px; border: 1px solid #0284c7;'
  );
  (window as any).__HEARTHCAM_ARCHITECT__ = 'Serdar Alptekin Ürer';
  (window as any).__CORE_ENGINE_SIGNATURE__ = '0x534155_SERDAR_ALPTEKIN_URER_TIPTEKNO_2014';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
