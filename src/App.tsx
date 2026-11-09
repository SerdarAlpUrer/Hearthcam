import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DriveCockpitView } from './components/DriveCockpitView';
import { HealthBiometricsView } from './components/HealthBiometricsView';
import { VeinScannerView } from './components/VeinScannerView';
import { BlackboxTripView } from './components/BlackboxTripView';
import { SettingsTelemetryView } from './components/SettingsTelemetryView';
import { QuickSimulatorDrawer } from './components/QuickSimulatorDrawer';
import { HealthReportModal } from './components/HealthReportModal';
import { BreathingGuideModal } from './components/BreathingGuideModal';
import { BlackboxModal } from './components/BlackboxModal';
import { TripScorecardModal } from './components/TripScorecardModal';
import { ObdConnectModal } from './components/ObdConnectModal';
import { CalibrationModal } from './components/CalibrationModal';

import { RppgEngine } from './engine/rppg';
import { DriverMonitorEngine, BlendshapeScore } from './engine/driverMonitor';
import { BlackboxRecorder } from './engine/blackboxRecorder';
import { ObdEngine } from './engine/obdEngine';
import { TripAnalyticsEngine } from './engine/tripAnalytics';
import {
  BiometricMetrics,
  DriverState,
  CanMessage,
  AppSettings,
  IncidentClip,
  ObdTelemetry,
  TripStats,
  UserCalibrationProfile,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('drive');
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState<boolean>(false);

  const [settings, setSettings] = useState<AppSettings>({
    selectedCameraId: '',
    targetFps: 30,
    algorithm: 'POS',
    smoothingLevel: 'SMOOTH',
    activeRois: {
      forehead: true,
      leftCheek: true,
      rightCheek: true,
    },
    showLandmarks: true,
    showRoiBoxes: true,
    showWaveform: true,
    showPerfusionMap: true,
    showAdvancedBiometrics: true,
    enableAudioAlerts: true,
    voiceAssistantEnabled: true,
    compactMode: false,
    cameraExposureLocked: true,
    acfVerificationEnabled: true,
    canLoggingEnabled: true,
    obdSimulated: false,
    blackboxEnabled: true,
  });

  const [biometrics, setBiometrics] = useState<BiometricMetrics>({
    bpm: 0,
    smoothedBpm: 0,
    acfBpm: 0,
    confidence: 0,
    snr: 0,
    hrvRmssd: 0,
    hrvSdnn: 0,
    respirationRate: 0,
    spO2: 98,
    spO2Confidence: 95,
    isHypoxiaRisk: false,
    bloodPressure: { systolic: 120, diastolic: 80, pulsePressure: 40, vascularStiffness: 'ESNEK / NORMAL' },
    arrhythmiaDetected: false,
    apneaDetected: false,
    bvpValue: 0,
    bvpHistory: [],
    vascularAge: 32,
    arterialStiffnessIndex: -0.58,
    vascularElasticityScore: 82,
    hrvLf: 420,
    hrvHf: 360,
    hrvLfHfRatio: 1.15,
    autonomicTone: 'BALANCED',
    earlyDrowsinessProbability: 8,
    rawSignals: { r: 0, g: 0, b: 0 },
    actualFps: 30,
    isLowLightMode: false,
    ambientLuminance: 128,
    motionArtifact: false,
    pttMs: 28,
    skinPurity: 88,
  });

  const [driverState, setDriverState] = useState<DriverState>({
    emotion: 'FOCUSED',
    perclos: 0,
    earLeft: 1.0,
    earRight: 1.0,
    blinkCount: 0,
    blinkRatePerMin: 0,
    isBlinking: false,
    isProlongedClosure: false,
    blinkClosingVelocity: 1.2,
    blinkOpeningVelocity: 1.1,
    blinkVelocityRatio: 1.05,
    incompleteBlinkRatio: 10,
    pupilDiameterNormalized: 0.085,
    pupilUnrestIndex: 3.2,
    cognitiveLoadScore: 25,
    valence: 0.2,
    arousal: 0.25,
    actionUnits: {
      au4BrowFurrow: 0.05,
      au1BrowRaise: 0.1,
      au12Smile: 0.15,
    },
    roadRageDetected: false,
    isSmokingOrEating: false,
    handToFaceDetected: false,
    isYawning: false,
    yawnCount: 0,
    mouthOpenRatio: 0,
    isHeadNodding: false,
    phoneDistractionDetected: false,
    gazeDirection: 'CENTER_ROAD',
    gazeDownDurationMs: 0,
    stressScore: 15,
    attentionScore: 95,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    overallStatus: 'ALERT',
    statusReason: 'Sürücü Yola Odaklı ve Uyanık',
  });

  const [canMessages, setCanMessages] = useState<CanMessage[]>([]);
  const [fps, setFps] = useState<number>(30);

  // Modallar
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showBreathingModal, setShowBreathingModal] = useState<boolean>(false);
  const [showBlackboxModal, setShowBlackboxModal] = useState<boolean>(false);
  const [showTripModal, setShowTripModal] = useState<boolean>(false);
  const [showObdModal, setShowObdModal] = useState<boolean>(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);

  // Kişisel Biyometrik & Göz Açıklığı Kalibrasyon Profili
  const [calibrationProfile, setCalibrationProfile] = useState<UserCalibrationProfile>(() => {
    try {
      const saved = localStorage.getItem('hearthcam_calibration_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      isCalibrated: false,
      age: 32,
      restingSys: 120,
      restingDia: 80,
      restingBpm: 72,
      baselinePttMs: 28,
      baselineBlinkScore: 0.14,
    };
  });

  // Olay Kara Kutusu Klipleri
  const [clips, setClips] = useState<IncidentClip[]>([]);

  // OBD-II Araç Telemetrisi
  const [obdTelemetry, setObdTelemetry] = useState<ObdTelemetry>({
    connected: false,
    deviceType: 'DISCONNECTED',
    deviceName: 'Araç Bağlantısı Yok',
    speedKmh: 0,
    rpm: 0,
    throttlePos: 0,
    coolantTempC: 0,
    engineLoad: 0,
    highSpeedMicrosleepRisk: false,
  });

  // Sürücü Güvenlik Karnesi (Trip Analytics)
  const [tripStats, setTripStats] = useState<TripStats>({
    startTime: Date.now(),
    durationSeconds: 1,
    distanceKm: 0,
    avgSpeedKmh: 0,
    maxSpeedKmh: 0,
    avgBpm: 0,
    avgPerclos: 0,
    totalBlinks: 0,
    totalYawns: 0,
    phoneDistractions: 0,
    roadRageEvents: 0,
    microsleepEvents: 0,
    smokingOrEatingEvents: 0,
    safetyScore: 100,
    grade: 'A+',
    recommendedBreakInMinutes: 120,
  });

  // Motor Referansları
  const rppgEngineRef = useRef<RppgEngine>(new RppgEngine(30));
  const driverMonitorRef = useRef<DriverMonitorEngine>(new DriverMonitorEngine());
  const blackboxRecorderRef = useRef<BlackboxRecorder>(
    new BlackboxRecorder((clip) => setClips((prev) => [clip, ...prev.slice(0, 24)]))
  );
  const obdEngineRef = useRef<ObdEngine>(
    new ObdEngine((telemetry) => setObdTelemetry(telemetry))
  );
  const tripAnalyticsRef = useRef<TripAnalyticsEngine>(new TripAnalyticsEngine());

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBeepTimeRef = useRef<number>(0);
  const lastSpokenTimeRef = useRef<number>(0);
  const lastSpokenPhraseRef = useRef<string>('');
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const prevHeadPoseRef = useRef<{ pitch: number; yaw: number }>({ pitch: 0, yaw: 0 });
  const motionSpeedRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(0);

  // Türkçe Sesli Sürücü Asistanı (TTS)
  const speakVoiceAlert = useCallback((phrase: string, force: boolean = false) => {
    if (!settings.voiceAssistantEnabled && !force) return;
    const now = performance.now();
    if (now - lastSpokenTimeRef.current < 5000) return;
    if (phrase === lastSpokenPhraseRef.current && now - lastSpokenTimeRef.current < 10000) return;

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.lang = 'tr-TR';
        utter.rate = 1.05;
        utter.onend = () => {
          activeUtteranceRef.current = null;
        };
        utter.onerror = () => {
          activeUtteranceRef.current = null;
        };
        activeUtteranceRef.current = utter;
        window.speechSynthesis.speak(utter);
        lastSpokenTimeRef.current = now;
        lastSpokenPhraseRef.current = phrase;
      } catch (e) {
        console.warn('TTS konuşma hatası:', e);
      }
    }
  }, [settings.voiceAssistantEnabled]);

  const playAlertSound = useCallback((frequency: number = 880, duration: number = 0.25) => {
    if (!settings.enableAudioAlerts) return;
    const now = performance.now();
    if (now - lastBeepTimeRef.current < 900) return;
    lastBeepTimeRef.current = now;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Ses çalınamadı:', e);
    }
  }, [settings.enableAudioAlerts]);

  useEffect(() => {
    rppgEngineRef.current.setCalibrationProfile(calibrationProfile);
    driverMonitorRef.current.setBaselineBlinkScore(calibrationProfile.baselineBlinkScore);
  }, [calibrationProfile]);

  const handleSaveCalibration = useCallback((profile: UserCalibrationProfile) => {
    setCalibrationProfile(profile);
    try {
      localStorage.setItem('hearthcam_calibration_v1', JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, []);

  const handleRgbSample = useCallback((sample: {
    r: number;
    g: number;
    b: number;
    foreheadG?: number;
    cheekG?: number;
    skinPurity?: number;
  }) => {
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    const engine = rppgEngineRef.current;
    engine.addSample(
      sample.r,
      sample.g,
      sample.b,
      now,
      sample.foreheadG,
      sample.cheekG,
      sample.skinPurity
    );

    if (now - lastProcessTimeRef.current >= 250) {
      lastProcessTimeRef.current = now;
      const result = engine.process(settings.algorithm, settings.smoothingLevel, motionSpeedRef.current);
      setBiometrics(result);
    }
  }, [settings.algorithm, settings.smoothingLevel]);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasElementRef.current = canvas;
    blackboxRecorderRef.current.initStream(canvas);
  }, []);

  const handleLandmarks = useCallback((
    landmarks: { x: number; y: number; z: number }[],
    blendshapes: BlendshapeScore[]
  ) => {
    const monitor = driverMonitorRef.current;
    const { state, canMessage } = monitor.analyze(
      blendshapes,
      landmarks,
      biometrics.smoothedBpm,
      biometrics.hrvRmssd
    );

    const deltaMotion = Math.abs(state.headPose.yaw - prevHeadPoseRef.current.yaw) +
                        Math.abs(state.headPose.pitch - prevHeadPoseRef.current.pitch);
    prevHeadPoseRef.current = { yaw: state.headPose.yaw, pitch: state.headPose.pitch };
    motionSpeedRef.current = deltaMotion;

    setDriverState(state);

    const currentSpeed = obdTelemetry.connected ? obdTelemetry.speedKmh : 0;
    tripAnalyticsRef.current.update(state, biometrics, currentSpeed);
    setTripStats(tripAnalyticsRef.current.getStats());

    const collisionRisk = obdEngineRef.current.evaluateCollisionRisk(state);

    if (canMessage) {
      canMessage.decoded.spO2 = biometrics.spO2;
      canMessage.decoded.bpSys = biometrics.bloodPressure.systolic;
      canMessage.decoded.bpDia = biometrics.bloodPressure.diastolic;
      canMessage.decoded.vascularAge = biometrics.vascularAge;
      canMessage.decoded.lfHfRatio = biometrics.hrvLfHfRatio;
      canMessage.decoded.cognitiveLoad = state.cognitiveLoadScore;
      canMessage.decoded.pui = state.pupilUnrestIndex;
      setCanMessages(prev => [canMessage, ...prev.slice(0, 50)]);
    }

    // Kara Kutu Olay Kaydı
    if (settings.blackboxEnabled) {
      if (collisionRisk) {
        blackboxRecorderRef.current.triggerIncident('HIZLI SÜRÜŞTE MİKRO-UYKU (ÇARPIŞMA RİSKİ)', {
          speed: currentSpeed,
          bpm: biometrics.smoothedBpm,
          perclos: state.perclos,
          stressScore: state.stressScore,
          emotion: state.emotion,
        }, canvasElementRef.current);
      } else if (state.overallStatus === 'CRITICAL' || state.overallStatus === 'EMERGENCY') {
        blackboxRecorderRef.current.triggerIncident(state.statusReason || 'Kritik Mikro-Uyku', {
          speed: currentSpeed,
          bpm: biometrics.smoothedBpm,
          perclos: state.perclos,
          stressScore: state.stressScore,
          emotion: state.emotion,
        }, canvasElementRef.current);
      } else if (state.gazeDirection === 'DOWN_PHONE' && state.gazeDownDurationMs >= 2200) {
        blackboxRecorderRef.current.triggerIncident('Gözler Telefonda / Yoldan Ayrıldı (>2.2s)', {
          speed: currentSpeed,
          bpm: biometrics.smoothedBpm,
          perclos: state.perclos,
          stressScore: state.stressScore,
          emotion: state.emotion,
        }, canvasElementRef.current);
      } else if (state.isSmokingOrEating) {
        blackboxRecorderRef.current.triggerIncident('Kabin İçi Sigara / Yeme-İçme Eylemi', {
          speed: currentSpeed,
          bpm: biometrics.smoothedBpm,
          perclos: state.perclos,
          stressScore: state.stressScore,
          emotion: state.emotion,
        }, canvasElementRef.current);
      }
    }

    // Sesli Alarmlar
    if (collisionRisk) {
      playAlertSound(1400, 0.7);
      speakVoiceAlert('Acil çarpışma uyarısı! Yüksek hızda mikro-uyku tespit edildi, derhal frene basınız!', true);
    } else if (state.overallStatus === 'EMERGENCY') {
      playAlertSound(1200, 0.6);
      speakVoiceAlert('Acil durum! Sürücü tepkisiz, lütfen güvenli yere çekiniz.', true);
    } else if (state.overallStatus === 'CRITICAL') {
      playAlertSound(880, 0.4);
      speakVoiceAlert('Dikkat! Ağır yorgunluk ve uyku hali tespit edildi, lütfen mola veriniz.');
    } else if (state.isSmokingOrEating) {
      playAlertSound(600, 0.25);
      speakVoiceAlert('Kabin içi dikkat dağınıklığı: Lütfen sürüş esnasında sigara veya yiyecek tüketmeyiniz.');
    } else if (state.gazeDirection === 'DOWN_PHONE' && state.gazeDownDurationMs >= 1800) {
      playAlertSound(650, 0.3);
      speakVoiceAlert('Lütfen gözlerinizi yoldan ayırmayınız!');
    } else if (state.roadRageDetected) {
      playAlertSound(700, 0.3);
      speakVoiceAlert('Yol öfkesi ve yüksek kalp hızı tespit edildi. Lütfen derin nefes alıp sakin kalınız.');
    } else if (biometrics.earlyDrowsinessProbability >= 80 && state.overallStatus === 'ALERT') {
      speakVoiceAlert('Otonom sinir sistemi uyuşukluğu tespit edildi. Mikro-uyku öncesi erken uyarı!');
    } else if (state.overallStatus === 'WARNING' && state.emotion === 'DISTRACTED') {
      playAlertSound(600, 0.25);
      speakVoiceAlert('Lütfen yola odaklanınız.');
    }
  }, [biometrics, obdTelemetry.speedKmh, settings.blackboxEnabled, playAlertSound, speakVoiceAlert]);

  const handleSimulateScenario = (scenario: 'NORMAL' | 'DROWSY' | 'RAGE' | 'DISTRACTED' | 'EMERGENCY' | 'SMOKING') => {
    if (scenario === 'NORMAL') {
      driverMonitorRef.current.resetCounters();
      setDriverState(prev => ({
        ...prev,
        emotion: 'FOCUSED',
        perclos: 5,
        stressScore: 20,
        attentionScore: 95,
        overallStatus: 'ALERT',
        gazeDirection: 'CENTER_ROAD',
        gazeDownDurationMs: 0,
        isProlongedClosure: false,
        isSmokingOrEating: false,
        handToFaceDetected: false,
        blinkVelocityRatio: 1.05,
        pupilUnrestIndex: 3.2,
        cognitiveLoadScore: 25,
        valence: 0.35,
        arousal: 0.30,
        roadRageDetected: false,
        statusReason: 'Sürücü Yola Odaklı ve Uyanık',
      }));
      setBiometrics(prev => ({
        ...prev,
        hrvLfHfRatio: 1.15,
        autonomicTone: 'BALANCED',
        earlyDrowsinessProbability: 8,
        smoothedBpm: 72,
        spO2: 98,
        isHypoxiaRisk: false,
      }));
    } else if (scenario === 'DROWSY') {
      setDriverState(prev => ({
        ...prev,
        emotion: 'DROWSY',
        perclos: 65,
        isProlongedClosure: true,
        attentionScore: 25,
        blinkVelocityRatio: 2.35,
        pupilUnrestIndex: 8.8,
        cognitiveLoadScore: 85,
        valence: -0.4,
        arousal: 0.15,
        overallStatus: 'CRITICAL',
        statusReason: 'Uzun Süreli Göz Kapalılığı (Mikro-Uyku)',
      }));
      setBiometrics(prev => ({
        ...prev,
        hrvLfHfRatio: 0.45,
        autonomicTone: 'PARASYMPATHETIC_DOMINANT',
        earlyDrowsinessProbability: 92,
        smoothedBpm: 58,
      }));
      playAlertSound(750, 0.5);
      speakVoiceAlert('Dikkat! Ağır yorgunluk ve uyku hali tespit edildi, lütfen mola veriniz.');

      if (settings.blackboxEnabled) {
        blackboxRecorderRef.current.triggerIncident('Mikro-Uyku (Göz Kapalı)', {
          speed: obdTelemetry.connected ? obdTelemetry.speedKmh : 0,
          bpm: 58,
          perclos: 65,
          stressScore: 30,
          emotion: 'DROWSY',
        }, canvasElementRef.current);
      }
    } else if (scenario === 'DISTRACTED') {
      setDriverState(prev => ({
        ...prev,
        emotion: 'DISTRACTED',
        gazeDirection: 'DOWN_PHONE',
        gazeDownDurationMs: 2500,
        attentionScore: 40,
        cognitiveLoadScore: 78,
        incompleteBlinkRatio: 45,
        overallStatus: 'WARNING',
        statusReason: 'Gözler Telefonda / Yoldan Ayrıldı (>1.8s)',
      }));
      playAlertSound(650, 0.3);
      speakVoiceAlert('Lütfen gözlerinizi yoldan ayırmayınız!');
      if (settings.blackboxEnabled) {
        blackboxRecorderRef.current.triggerIncident('Gözler Telefonda > 2.5s', {
          speed: obdTelemetry.connected ? obdTelemetry.speedKmh : 0,
          bpm: biometrics.smoothedBpm,
          perclos: 20,
          stressScore: 45,
          emotion: 'DISTRACTED',
        }, canvasElementRef.current);
      }
    } else if (scenario === 'SMOKING') {
      setDriverState(prev => ({
        ...prev,
        emotion: 'SMOKING_OR_EATING',
        isSmokingOrEating: true,
        handToFaceDetected: true,
        attentionScore: 55,
        overallStatus: 'WARNING',
        statusReason: 'Kabin İçi Dikkat Dağıtıcı: Sigara / Yeme-İçme Tespit Edildi',
      }));
      playAlertSound(600, 0.25);
      speakVoiceAlert('Kabin içi dikkat dağınıklığı: Lütfen sürüş esnasında sigara veya yiyecek tüketmeyiniz.');
      if (settings.blackboxEnabled) {
        blackboxRecorderRef.current.triggerIncident('Kabin İçi Sigara / Yeme-İçme', {
          speed: obdTelemetry.connected ? obdTelemetry.speedKmh : 0,
          bpm: biometrics.smoothedBpm,
          perclos: 12,
          stressScore: 35,
          emotion: 'SMOKING_OR_EATING',
        }, canvasElementRef.current);
      }
    } else if (scenario === 'RAGE') {
      setDriverState(prev => ({
        ...prev,
        emotion: 'ROAD_RAGE',
        stressScore: 92,
        attentionScore: 50,
        roadRageDetected: true,
        valence: -0.85,
        arousal: 0.95,
        overallStatus: 'WARNING',
        statusReason: 'Yüksek Kalp Hızı ve Stres (Yol Öfkesi)',
      }));
      setBiometrics(prev => ({
        ...prev,
        hrvLfHfRatio: 3.4,
        autonomicTone: 'SYMPATHETIC_SURGE',
        earlyDrowsinessProbability: 2,
        smoothedBpm: 114,
      }));
      playAlertSound(700, 0.35);
      speakVoiceAlert('Yol öfkesi ve aşırı stres tespit edildi. Lütfen sakinleşiniz.');
    } else if (scenario === 'EMERGENCY') {
      setDriverState(prev => ({
        ...prev,
        emotion: 'INCAPACITATED',
        perclos: 90,
        attentionScore: 0,
        overallStatus: 'EMERGENCY',
        statusReason: 'ACİL DURUM: Sürücü Tepkisiz / Baygınlık Şüphesi',
      }));
      setBiometrics(prev => ({
        ...prev,
        smoothedBpm: 34,
        respirationRate: 6,
        apneaDetected: true,
      }));
      playAlertSound(1200, 0.8);
      speakVoiceAlert('Acil durum! Sürücü tepkisiz, lütfen güvenli yere çekiniz.', true);
      if (settings.blackboxEnabled) {
        blackboxRecorderRef.current.triggerIncident('ACİL DURUM (Tepkisiz Sürücü)', {
          speed: obdTelemetry.connected ? obdTelemetry.speedKmh : 0,
          bpm: 34,
          perclos: 90,
          stressScore: 90,
          emotion: 'INCAPACITATED',
        }, canvasElementRef.current);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans pb-20 md:pb-6">
      {/* 1. Üst Bar */}
      <Header
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        onToggleSimulatorDrawer={() => setShowSimulatorDrawer(prev => !prev)}
      />

      {/* 2. Masaüstü & TS10 İçin Üst Segment Gezinme Barı */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 pt-2">
        <Navigation
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          incidentCount={clips.length}
          bpm={biometrics.smoothedBpm}
        />
      </div>

      {/* 3. Ana Sekme İçeriği */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-2 flex flex-col gap-4">
        {/* SEKME 1: SÜRÜŞ KOKPİTİ (Kardiyo, Kayıtlar ve Ayarlar sekmelerine geçildiğinde de arka planda kamera ve rPPG veri akışını kesintisiz sürdürür) */}
        {activeTab !== 'vein' && (
          <div className={activeTab === 'drive' ? 'block' : 'hidden'}>
            <DriveCockpitView
              settings={settings}
              biometrics={biometrics}
              driverState={driverState}
              obdTelemetry={obdTelemetry}
              tripStats={tripStats}
              fps={fps}
              calibrationProfile={calibrationProfile}
              onRgbSample={handleRgbSample}
              onLandmarks={handleLandmarks}
              onCanvasReady={handleCanvasReady}
              onOpenBreathing={() => setShowBreathingModal(true)}
              onOpenReport={() => setShowReportModal(true)}
              onOpenObd={() => setShowObdModal(true)}
              onOpenCalibration={() => setShowCalibrationModal(true)}
              onOpenVeinScanner={() => setActiveTab('vein')}
            />
          </div>
        )}

        {/* SEKME 2: SAĞLIK & KARDİYO */}
        {activeTab === 'health' && (
          <HealthBiometricsView
            metrics={biometrics}
            algorithm={settings.algorithm}
            onOpenReport={() => setShowReportModal(true)}
            onOpenBreathing={() => setShowBreathingModal(true)}
          />
        )}

        {/* SEKME 3: OPTİK DAMAR & HEMOGLOBİN TARAYICI (ARKA/ÖN KAMERA + FLAŞ) */}
        {activeTab === 'vein' && <VeinScannerView />}

        {/* SEKME 3: KARA KUTU & SEYAHAT KARNESİ */}
        {activeTab === 'blackbox' && (
          <BlackboxTripView
            stats={tripStats}
            clips={clips}
            onResetTrip={() => {
              tripAnalyticsRef.current.resetTrip();
              setTripStats(tripAnalyticsRef.current.getStats());
            }}
            onClearClips={() => {
              blackboxRecorderRef.current.clearClips();
              setClips([]);
            }}
          />
        )}

        {/* SEKME 4: AYARLAR & TELEMETRİ */}
        {activeTab === 'settings' && (
          <SettingsTelemetryView
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
            obdTelemetry={obdTelemetry}
            onConnectBluetooth={async () => {
              await obdEngineRef.current.connectBluetooth();
            }}
            onConnectSerial={async () => {
              await obdEngineRef.current.connectSerial();
            }}
            onDisconnectObd={() => {
              obdEngineRef.current.disconnect();
            }}
            onSetSimulatedSpeed={(spd) => {
              obdEngineRef.current.setSimulatedSpeed(spd);
            }}
            canMessages={canMessages}
            onClearCanMessages={() => setCanMessages([])}
          />
        )}
      </main>

      {/* Hızlı DMS Test Senaryosu Çekmecesi */}
      <QuickSimulatorDrawer
        isOpen={showSimulatorDrawer}
        onClose={() => setShowSimulatorDrawer(false)}
        onSimulate={handleSimulateScenario}
      />

      {/* ================= MODALLER ================= */}

      {/* 1. Klinik Sağlık & Damar Yaşı Raporu Modalı */}
      {showReportModal && (
        <HealthReportModal
          metrics={biometrics}
          driverState={driverState}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* 2. Biyo-Geri Bildirim Kutu Nefesi Modalı */}
      {showBreathingModal && (
        <BreathingGuideModal
          metrics={biometrics}
          onClose={() => setShowBreathingModal(false)}
        />
      )}

      {/* 3. Olay Kara Kutusu Modalı */}
      {showBlackboxModal && (
        <BlackboxModal
          clips={clips}
          onClearClips={() => {
            blackboxRecorderRef.current.clearClips();
            setClips([]);
          }}
          onClose={() => setShowBlackboxModal(false)}
        />
      )}

      {/* 4. Sürücü Güvenlik Karnesi Modalı */}
      {showTripModal && (
        <TripScorecardModal
          stats={tripStats}
          onResetTrip={() => {
            tripAnalyticsRef.current.resetTrip();
            setTripStats(tripAnalyticsRef.current.getStats());
          }}
          onClose={() => setShowTripModal(false)}
        />
      )}

      {/* 5. OBD-II Bağlantı ve Araç Telemetrisi Modalı */}
      {showObdModal && (
        <ObdConnectModal
          telemetry={obdTelemetry}
          onConnectBluetooth={async () => {
            await obdEngineRef.current.connectBluetooth();
          }}
          onConnectSerial={async () => {
            await obdEngineRef.current.connectSerial();
          }}
          onDisconnect={() => {
            obdEngineRef.current.disconnect();
          }}
          onSetSimulatedSpeed={(spd) => {
            obdEngineRef.current.setSimulatedSpeed(spd);
          }}
          onClose={() => setShowObdModal(false)}
        />
      )}

      {/* 6. Kişisel Biyometrik & Göz Açıklığı Kalibrasyon Modalı */}
      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        currentProfile={calibrationProfile}
        biometrics={biometrics}
        currentBlinkScore={driverMonitorRef.current.getLatestBlinkScore()}
        isFaceDetected={biometrics.smoothedBpm > 0 || driverState.attentionScore > 0}
        onSaveProfile={handleSaveCalibration}
      />

      <footer className="hidden md:block border-t border-slate-900 bg-[#070b13] px-4 py-3 text-center text-xs text-slate-500 font-mono">
        HearthCam Biometrics & DMS • Serdar Alptekin Ürer rPPG Mimarisi • WebAssembly, MediaPipe & Web Audio Tabanlı
      </footer>
    </div>
  );
};

export default App;
