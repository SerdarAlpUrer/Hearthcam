export interface ROIBox {
  id: 'forehead' | 'leftCheek' | 'rightCheek';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  landmarkIndices: number[];
  color: string;
  active: boolean;
  snr: number;
  skinPurity?: number; // YCbCr cilt pikseli saflık oranı (%)
  fusionWeight?: number; // SNR ve homojenlik ağırlığı (0 - 1)
}

export interface UserCalibrationProfile {
  age: number;
  restingSys: number;
  restingDia: number;
  restingBpm?: number;
  baselinePttMs?: number;
  baselineBlinkScore: number; // Kişisel doğal göz açıklık / blink skoru referansı
  isCalibrated: boolean;
  calibratedAt?: string;
}

export interface BloodPressureEstimate {
  systolic: number;
  diastolic: number;
  pulsePressure: number;
  vascularStiffness: 'ESNEK / NORMAL' | 'ORTA' | 'SERTLEŞMİŞ';
}

export interface SdppgWaves {
  a: number; // Erken sistolik ivme tepesi
  b: number; // Erken sistolik yavaşlama çukuru
  c: number; // Geç sistolik ivme tepesi
  d: number; // Erken diyastolik yavaşlama çukuru
  e: number; // Dikrotik çentik dalgası
}

export interface BiometricMetrics {
  bpm: number;
  smoothedBpm: number;
  acfBpm: number; // Otokorelasyon doğrulama frekansı
  confidence: number;
  snr: number;
  hrvRmssd: number;
  hrvSdnn: number;
  respirationRate: number;
  spO2: number;
  spO2Confidence: number;
  isHypoxiaRisk: boolean; // SpO2 < 94% kabin havasızlığı / hipoksi riski
  bloodPressure: BloodPressureEstimate;
  arrhythmiaDetected: boolean;
  apneaDetected: boolean; // Solunum duraksaması / apne tespiti
  bvpValue: number;
  bvpHistory: number[];

  // 1. İkinci Türev PPG (SDPPG) ve Damar Yaşı Analizi
  vascularAge: number; // Tahmini damar yaşı (yıl)
  arterialStiffnessIndex: number; // b/a oranı (-1.0 ile +0.6 arası)
  vascularElasticityScore: number; // 0 - 100 damar elastikiyeti
  sdppgWaves?: SdppgWaves;

  // 2. HRV Frekans Alanı Analizi (Otonom Sinir Sistemi)
  hrvLf: number; // Düşük Frekans Gücü (0.04 - 0.15 Hz, Sempatik)
  hrvHf: number; // Yüksek Frekans Gücü (0.15 - 0.40 Hz, Parasempatik / Vagal)
  hrvLfHfRatio: number; // LF / HF Denge Oranı
  autonomicTone: 'PARASYMPATHETIC_DOMINANT' | 'BALANCED' | 'SYMPATHETIC_SURGE';
  earlyDrowsinessProbability: number; // 0 - 100% Göz kapanmadan önceki otonom uyku meyli

  rawSignals: {
    r: number;
    g: number;
    b: number;
  };
  actualFps: number;
  isLowLightMode: boolean; // Düşük ışık / Gece / IR modu
  ambientLuminance: number; // 0 - 255 ortalama yüz parlaklığı
  motionArtifact: boolean; // Baş hareketi parazit tespiti
  pttMs: number; // Alın-Yanak Faz Farkı (Pulse Transit Time - ms)
  skinPurity: number; // YCbCr Cilt Maskeleme Saflığı (%)
}

export type DriverEmotion = 'CALM' | 'FOCUSED' | 'DROWSY' | 'STRESSED' | 'ROAD_RAGE' | 'DISTRACTED' | 'INCAPACITATED' | 'SMOKING_OR_EATING';

export type GazeDirection = 'CENTER_ROAD' | 'DOWN_PHONE' | 'LEFT_MIRROR' | 'RIGHT_MIRROR' | 'UNKNOWN';

export interface DriverState {
  emotion: DriverEmotion;
  perclos: number;
  earLeft: number;
  earRight: number;
  blinkCount: number;
  blinkRatePerMin: number;
  isBlinking: boolean;
  isProlongedClosure: boolean;

  // Gelişmiş Kırpma Biyomekaniği
  blinkClosingVelocity: number; // Kapanma hızı (EAR/sn)
  blinkOpeningVelocity: number; // Açılma hızı (EAR/sn)
  blinkVelocityRatio: number; // Vclose / Vopen (Ağır göz kapağı yorgunluk oranı)
  incompleteBlinkRatio: number; // Tam kapanmayan kuru göz / ekrana kilitlenme oranı
  tbutSeconds?: number; // Son göz kırpmadan beri geçen süre (Gözyaşı Kırılma / Kuru Göz Süresi)

  // Pupillometri & Bilişsel Yük
  pupilDiameterNormalized: number; // Ölçekten bağımsız iris/göz bebeği çapı
  pupilUnrestIndex: number; // PUI: Pupillary unrest index (Merkezi sinir sistemi uykululuk metriği)
  cognitiveLoadScore: number; // 0 - 100 Bilişsel Zihinsel Yük

  // FACS Mikro Mimik ve Duygu Analizi + Nörolojik Yüz Asimetrisi (FAST)
  valence: number; // -1.0 (Negatif/Gergin) ile +1.0 (Pozitif/Rahat)
  arousal: number; // 0.0 (Sakin/Uyuşuk) ile 1.0 (Uyarılmış/Öfkeli)
  facialAsymmetryScore?: number; // 0 - 100 Sağ/Sol yüz yarımküre asimetrisi (Nörolojik/FAST taraması)
  actionUnits: {
    au4BrowFurrow: number; // Kaş çatma
    au1BrowRaise: number; // Kaş kaldırma / şaşırma
    au12Smile: number; // Gülümseme / keyif
  };
  roadRageDetected: boolean; // Yol Öfkesi (Road Rage)

  // Kabin İçi Görsel Zeka: Sigara & Yeme-İçme / El-Yüz Teması
  isSmokingOrEating: boolean;
  handToFaceDetected: boolean;

  isYawning: boolean;
  yawnCount: number;
  mouthOpenRatio: number;
  isHeadNodding: boolean;
  phoneDistractionDetected: boolean;
  gazeDirection: GazeDirection;
  gazeDownDurationMs: number;
  stressScore: number;
  attentionScore: number;
  headPose: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  overallStatus: 'ALERT' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  statusReason?: string;
}

export interface IncidentClip {
  id: string;
  timestamp: string;
  reason: string;
  durationSec: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  metrics: {
    speed: number;
    bpm: number;
    perclos: number;
    stressScore: number;
    emotion: DriverEmotion;
  };
}

export interface ObdTelemetry {
  connected: boolean;
  deviceType: 'BLUETOOTH' | 'SERIAL' | 'SIMULATOR' | 'DISCONNECTED';
  deviceName: string;
  speedKmh: number;
  rpm: number;
  throttlePos: number; // 0-100%
  coolantTempC: number;
  engineLoad: number; // 0-100%
  highSpeedMicrosleepRisk: boolean;
}

export interface TripStats {
  startTime: number;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  avgBpm: number;
  avgPerclos: number;
  totalBlinks: number;
  totalYawns: number;
  phoneDistractions: number;
  roadRageEvents: number;
  microsleepEvents: number;
  smokingOrEatingEvents: number;
  safetyScore: number; // 0 - 100 Euro NCAP
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendedBreakInMinutes: number;
}

export interface CanMessage {
  id: string;
  timestamp: string;
  name: string;
  byteData: string;
  decoded: {
    hr: number;
    hrv: number;
    spO2?: number;
    bpSys?: number;
    bpDia?: number;
    fatigueLevel: number;
    distraction: boolean;
    emergencyTrigger: boolean;
    vascularAge?: number;
    lfHfRatio?: number;
    cognitiveLoad?: number;
    pui?: number;
  };
  severity: 'info' | 'warn' | 'alarm';
}

export type SmoothingLevel = 'ULTRA_SMOOTH' | 'SMOOTH' | 'BALANCED' | 'RESPONSIVE';

export interface AppSettings {
  selectedCameraId: string;
  targetFps: number;
  algorithm: 'POS' | 'CHROM' | 'GREEN';
  smoothingLevel: SmoothingLevel; // Kullanıcı ayarlı yumuşatma / gecikme
  activeRois: {
    forehead: boolean;
    leftCheek: boolean;
    rightCheek: boolean;
  };
  showLandmarks: boolean;
  showRoiBoxes: boolean;
  showWaveform: boolean;
  showPerfusionMap: boolean; // Yüzde canlı kan perfüzyon ısı haritası
  showAdvancedBiometrics: boolean; // Gelişmiş SDPPG, LF/HF, PUI biyometrik paneli
  enableAudioAlerts: boolean;
  voiceAssistantEnabled: boolean; // Türkçe Sesli Asistan (TTS)
  compactMode: boolean; // Sürüş / Kompakt Araç HUD Modu
  cameraExposureLocked: boolean; // Kamera Pozlama & Beyaz Dengesi Kilidi
  acfVerificationEnabled: boolean; // Otokorelasyon 2x Harmonik Filtresi
  canLoggingEnabled: boolean;
  obdSimulated: boolean; // OBD-II Gerçek / Simüle Araç Telemetrisi
  blackboxEnabled: boolean; // Olay Kara Kutusu Otomatik Kaydı
}
