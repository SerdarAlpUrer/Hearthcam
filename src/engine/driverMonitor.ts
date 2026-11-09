/**
 * HearthCam - Sürücü Durum ve Canlılık İzleme Motoru (DMS)
 * PERCLOS, Göz Kırpma, Geometrik Esneme (MAR), Kafa Düşmesi, Duygu ve CAN Bus Telemetrisi
 */

import { DriverEmotion, DriverState, CanMessage, GazeDirection } from '../types';

export interface BlendshapeScore {
  categoryName: string;
  score: number;
}

export class DriverMonitorEngine {
  private blinkCount: number = 0;
  private yawnCount: number = 0;
  private eyeClosureHistory: { time: number; closed: boolean }[] = [];
  private eyeClosedStartTime: number | null = null;

  // Esneme (Yawn) durum değişkenleri
  private yawnStartTime: number | null = null;
  private isCurrentlyYawning: boolean = false;
  private lastYawnCompletedTime: number = 0;

  // Bakış Yönü (Gaze Tracking) ve Telefon/Yoldan Ayrılma
  private gazeDownStartTime: number | null = null;
  private currentGazeDirection: GazeDirection = 'CENTER_ROAD';

  // Kafa Pozisyonu ve Düşmesi (Head Nodding) geçmişi
  private pitchHistory: { time: number; pitch: number }[] = [];
  private isHeadNodding: boolean = false;

  private lastCanSentTime: number = 0;
  private isCurrentlyBlinking: boolean = false;
  private lastBlinkTime: number = performance.now();
  private smoothedAsymmetry: number = 4;

  // 1. Kırpma Biyomekaniği Değişkenleri (Vclose / Vopen)
  private prevBlinkScore: number = 0;
  private lastBlinkScoreTime: number = 0;
  private maxClosingVelocity: number = 0;
  private maxOpeningVelocity: number = 0;
  private smoothedBlinkVelocityRatio: number = 1.05;
  private incompleteBlinkCount: number = 0;
  private totalBlinkEvents: number = 0;

  // 2. Pupillometri & Bilişsel Yük Değişkenleri
  private pupilHistory: { time: number; diameter: number }[] = [];
  private baselinePupilDiameter: number = 0.088;
  private smoothedPui: number = 3.5;
  private smoothedCognitiveLoad: number = 28;

  // 3. Kabin İçi Görsel Zeka: Sigara & Yeme-İçme / El-Yüz Teması
  private smokingStartTime: number | null = null;
  private isSmokingOrEating: boolean = false;
  private handToFaceDetected: boolean = false;

  // Kalibrasyon Eşikleri
  private dynamicBlinkThreshold: number = 0.50;
  private readonly PROLONGED_CLOSURE_MS = 1400;
  private readonly YAWN_MAR_THRESHOLD = 0.62;
  private readonly YAWN_JAW_THRESHOLD = 0.68;
  private readonly YAWN_MIN_DURATION_MS = 1800;
  private readonly YAWN_COOLDOWN_MS = 6000;
  private readonly GAZE_DOWN_DISTRACTION_MS = 1800; // 1.8 saniye telefona/aşağıya bakma

  /**
   * Kişisel Göz Açıklığı (Blink Score) Kalibrasyonu:
   * Dinlenme halindeki normal göz kapalılık skoruna göre (örn. kısık göz yapısı)
   * dinamik eşik değerini [0.38 - 0.68] aralığında kişiselleştirir.
   */
  public setBaselineBlinkScore(baselineScore: number): void {
    this.dynamicBlinkThreshold = Math.max(0.38, Math.min(0.68, baselineScore + 0.32));
  }

  public getLatestBlinkScore(): number {
    return this.prevBlinkScore;
  }

  private computeMAR(landmarks: { x: number; y: number; z: number }[]): number {
    if (!landmarks || landmarks.length < 292) return 0;

    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];

    const verticalDist = Math.hypot(topLip.x - bottomLip.x, topLip.y - bottomLip.y);
    const horizontalDist = Math.hypot(leftCorner.x - rightCorner.x, leftCorner.y - rightCorner.y);

    if (horizontalDist <= 0.001) return 0;
    return verticalDist / horizontalDist;
  }

  /**
   * MediaPipe 478 Landmark İris Analizi ile Bakış Yönü (Gaze Tracking)
   * 468: Sol İris Merkezi, 473: Sağ İris Merkezi
   */
  private computeGaze(landmarks: { x: number; y: number; z: number }[]): GazeDirection {
    if (!landmarks || landmarks.length < 474) return 'CENTER_ROAD';

    const irisL = landmarks[468];
    const irisR = landmarks[473];

    // Sol Göz Kenarları: 33 (dış), 133 (iç), 159 (üst), 145 (alt)
    const eyeOuterL = landmarks[33];
    const eyeInnerL = landmarks[133];
    const eyeTopL = landmarks[159];
    const eyeBottomL = landmarks[145];

    // Sağ Göz Kenarları: 362 (iç), 263 (dış), 386 (üst), 374 (alt)
    const eyeInnerR = landmarks[362];
    const eyeOuterR = landmarks[263];
    const eyeTopR = landmarks[386];
    const eyeBottomR = landmarks[374];

    const eyeWidthL = Math.abs(eyeInnerL.x - eyeOuterL.x) || 0.01;
    const eyeHeightL = Math.abs(eyeBottomL.y - eyeTopL.y) || 0.01;

    const eyeWidthR = Math.abs(eyeOuterR.x - eyeInnerR.x) || 0.01;
    const eyeHeightR = Math.abs(eyeBottomR.y - eyeTopR.y) || 0.01;

    // Normalize dikey ve yatay oranlar
    const ratioYL = (irisL.y - eyeTopL.y) / eyeHeightL;
    const ratioYR = (irisR.y - eyeTopR.y) / eyeHeightR;
    const avgRatioY = (ratioYL + ratioYR) / 2;

    const ratioXL = (irisL.x - Math.min(eyeOuterL.x, eyeInnerL.x)) / eyeWidthL;
    const ratioXR = (irisR.x - Math.min(eyeOuterR.x, eyeInnerR.x)) / eyeWidthR;
    const avgRatioX = (ratioXL + ratioXR) / 2;

    // Aşağıya (Telefona / Kucağa) Bakış Tespiti
    if (avgRatioY > 0.62) {
      return 'DOWN_PHONE';
    }
    // Sola / Aynaya Bakış
    if (avgRatioX < 0.35) {
      return 'LEFT_MIRROR';
    }
    // Sağa / Yan Aynaya Bakış
    if (avgRatioX > 0.68) {
      return 'RIGHT_MIRROR';
    }

    return 'CENTER_ROAD';
  }

  /**
   * MediaPipe İris Landmarkları ile Pupillometri (PUI) ve Bilişsel Yük Analizi
   * 468, 473: İris merkezleri; 469-472, 474-477: İris çevre sınırları
   * 33, 263: Göz dış açıları (ölçek kalibrasyonu)
   */
  private computePupillometry(
    landmarks: { x: number; y: number; z: number }[],
    now: number
  ): { pupilDiameterNormalized: number; pupilUnrestIndex: number; cognitiveLoadScore: number } {
    if (!landmarks || landmarks.length < 478) {
      return { pupilDiameterNormalized: 0.085, pupilUnrestIndex: 3.2, cognitiveLoadScore: 25 };
    }

    const outerL = landmarks[33];
    const outerR = landmarks[263];
    const eyeBaseDist = Math.hypot(outerL.x - outerR.x, outerL.y - outerR.y);
    if (eyeBaseDist < 0.05) {
      return { pupilDiameterNormalized: 0.085, pupilUnrestIndex: 3.2, cognitiveLoadScore: 25 };
    }

    const dLeft = Math.hypot(landmarks[469].x - landmarks[471].x, landmarks[469].y - landmarks[471].y);
    const dRight = Math.hypot(landmarks[474].x - landmarks[476].x, landmarks[474].y - landmarks[476].y);

    const avgIrisDiameter = (dLeft + dRight) / 2;
    const normalizedDiameter = avgIrisDiameter / eyeBaseDist;

    this.pupilHistory.push({ time: now, diameter: normalizedDiameter });
    const cutoff = now - 6000;
    while (this.pupilHistory.length > 0 && this.pupilHistory[0].time < cutoff) {
      this.pupilHistory.shift();
    }

    let pui = 3.5;
    let cogLoad = 25;

    if (this.pupilHistory.length >= 8) {
      let sumD = 0;
      for (const p of this.pupilHistory) sumD += p.diameter;
      const meanD = sumD / this.pupilHistory.length;

      this.baselinePupilDiameter = this.baselinePupilDiameter * 0.98 + meanD * 0.02;

      let varD = 0;
      for (const p of this.pupilHistory) varD += (p.diameter - meanD) ** 2;
      const stdD = Math.sqrt(varD / this.pupilHistory.length);
      pui = Math.round(stdD * 1000 * 10) / 10;

      const dilationRatio = meanD / Math.max(0.01, this.baselinePupilDiameter);
      cogLoad = Math.max(10, Math.min(100, Math.round(35 + (dilationRatio - 1.0) * 220)));
    }

    this.smoothedPui = this.smoothedPui * 0.9 + pui * 0.1;
    this.smoothedCognitiveLoad = this.smoothedCognitiveLoad * 0.9 + cogLoad * 0.1;

    return {
      pupilDiameterNormalized: Math.round(normalizedDiameter * 1000) / 1000,
      pupilUnrestIndex: Math.round(this.smoothedPui * 10) / 10,
      cognitiveLoadScore: Math.round(this.smoothedCognitiveLoad),
    };
  }

  public analyze(
    blendshapes: BlendshapeScore[],
    landmarks: { x: number; y: number; z: number }[],
    bpm: number,
    hrvRmssd: number,
    now: number = performance.now()
  ): { state: DriverState; canMessage: CanMessage | null } {
    const scores = new Map<string, number>();
    for (const b of blendshapes) {
      scores.set(b.categoryName, b.score);
    }

    const blinkL = scores.get('eyeBlinkLeft') || 0;
    const blinkR = scores.get('eyeBlinkRight') || 0;
    const jawOpen = scores.get('jawOpen') || 0;
    const browDownL = scores.get('browDownLeft') || 0;
    const browDownR = scores.get('browDownRight') || 0;
    const smileL = scores.get('mouthSmileLeft') || 0;
    const smileR = scores.get('mouthSmileRight') || 0;

    const avgBlink = (blinkL + blinkR) / 2;
    const isEyesClosed = avgBlink > this.dynamicBlinkThreshold;

    // 1. Kırpma Hızı & Biyomekaniği (Vclose / Vopen)
    const dt = this.lastBlinkScoreTime > 0 ? (now - this.lastBlinkScoreTime) / 1000 : 0.033;
    this.lastBlinkScoreTime = now;
    const deltaBlink = avgBlink - this.prevBlinkScore;
    this.prevBlinkScore = avgBlink;

    if (dt > 0.005 && dt < 0.5) {
      const vel = deltaBlink / dt;
      if (vel > 0) {
        this.maxClosingVelocity = Math.max(this.maxClosingVelocity, vel);
      } else {
        this.maxOpeningVelocity = Math.max(this.maxOpeningVelocity, Math.abs(vel));
      }
    }

    if (!isEyesClosed && this.maxClosingVelocity > 1.0 && this.maxOpeningVelocity > 0.4) {
      const ratio = this.maxClosingVelocity / Math.max(0.4, this.maxOpeningVelocity);
      this.smoothedBlinkVelocityRatio = this.smoothedBlinkVelocityRatio * 0.75 + ratio * 0.25;
      this.maxClosingVelocity = 0;
      this.maxOpeningVelocity = 0;
      this.totalBlinkEvents++;
    }

    // Tam olmayan kırpma (Incomplete Blink / Ekran kuruluğu)
    if (avgBlink > 0.25 && avgBlink < this.dynamicBlinkThreshold && !isEyesClosed) {
      if (Math.random() < 0.15) {
        this.incompleteBlinkCount++;
      }
    }
    const incompleteRatio = this.totalBlinkEvents > 0
      ? Math.min(80, Math.round((this.incompleteBlinkCount / Math.max(1, this.totalBlinkEvents)) * 100))
      : 12;

    // 2. Göz kırpma ve Mikro-uyku sayacı
    if (isEyesClosed) {
      if (!this.eyeClosedStartTime) {
        this.eyeClosedStartTime = now;
      }
      if (!this.isCurrentlyBlinking) {
        this.isCurrentlyBlinking = true;
        this.blinkCount++;
        this.lastBlinkTime = now;
      }
    } else {
      this.eyeClosedStartTime = null;
      this.isCurrentlyBlinking = false;
    }

    const eyeClosureDuration = this.eyeClosedStartTime ? now - this.eyeClosedStartTime : 0;
    const isProlongedClosure = eyeClosureDuration >= this.PROLONGED_CLOSURE_MS;

    // PERCLOS (Son 15 saniyedeki göz kapalılık yüzdesi)
    this.eyeClosureHistory.push({ time: now, closed: isEyesClosed });
    const windowStart = now - 15000;
    while (this.eyeClosureHistory.length > 0 && this.eyeClosureHistory[0].time < windowStart) {
      this.eyeClosureHistory.shift();
    }

    let closedSamples = 0;
    for (const sample of this.eyeClosureHistory) {
      if (sample.closed) closedSamples++;
    }
    const perclos = this.eyeClosureHistory.length > 0
      ? Math.round((closedSamples / this.eyeClosureHistory.length) * 100)
      : 0;

    const blinkRatePerMin = Math.round((this.blinkCount / Math.max(1, now / 60000)));

    // 3. GELİŞMİŞ ESNEME (YAWN) ANALİZİ (Geometrik MAR + Süre + Cooldown Kilidi)
    const mar = this.computeMAR(landmarks);
    const isMouthWideOpen = mar > this.YAWN_MAR_THRESHOLD || jawOpen > this.YAWN_JAW_THRESHOLD;
    const isInCooldown = (now - this.lastYawnCompletedTime) < this.YAWN_COOLDOWN_MS;

    if (isMouthWideOpen && !isInCooldown) {
      if (!this.yawnStartTime) {
        this.yawnStartTime = now;
      } else {
        const duration = now - this.yawnStartTime;
        if (duration >= this.YAWN_MIN_DURATION_MS) {
          if (!this.isCurrentlyYawning) {
            this.isCurrentlyYawning = true;
            this.yawnCount++;
            this.lastYawnCompletedTime = now;
          }
        }
      }
    } else {
      this.yawnStartTime = null;
      this.isCurrentlyYawning = false;
    }

    // 4. Kafa Pozisyonu (Pitch, Yaw, Roll)
    let pitch = 0, yaw = 0, roll = 0;
    if (landmarks.length > 263) {
      const nose = landmarks[1];
      const chin = landmarks[152];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];

      const midEyeX = (leftEye.x + rightEye.x) / 2;
      yaw = Math.round((nose.x - midEyeX) * 220);

      const midEyeY = (leftEye.y + rightEye.y) / 2;
      const eyeToChin = chin.y - midEyeY;
      const eyeToNose = nose.y - midEyeY;
      pitch = Math.round(((eyeToNose / (eyeToChin || 0.1)) - 0.5) * 180);

      const dx = rightEye.x - leftEye.x;
      const dy = rightEye.y - leftEye.y;
      roll = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    }

    // Bakış Yönü (Gaze Tracking) Analizi
    const gazeDirection = this.computeGaze(landmarks);
    this.currentGazeDirection = gazeDirection;

    if (gazeDirection === 'DOWN_PHONE') {
      if (!this.gazeDownStartTime) {
        this.gazeDownStartTime = now;
      }
    } else {
      this.gazeDownStartTime = null;
    }
    const gazeDownDurationMs = this.gazeDownStartTime ? Math.round(now - this.gazeDownStartTime) : 0;
    const isGazeDistracted = gazeDownDurationMs >= this.GAZE_DOWN_DISTRACTION_MS;

    // Mikro-Uyku Kafa Düşmesi (Head Nodding) Tespiti
    this.pitchHistory.push({ time: now, pitch });
    while (this.pitchHistory.length > 0 && this.pitchHistory[0].time < now - 2000) {
      this.pitchHistory.shift();
    }
    if (this.pitchHistory.length >= 5) {
      const minPitch = Math.min(...this.pitchHistory.map(p => p.pitch));
      const maxPitch = Math.max(...this.pitchHistory.map(p => p.pitch));
      if ((maxPitch - minPitch > 20) && (pitch < -10 || perclos > 25)) {
        this.isHeadNodding = true;
      } else {
        this.isHeadNodding = false;
      }
    }

    const phoneDistractionDetected = (Math.abs(roll) > 18 && Math.abs(yaw) > 20) || isGazeDistracted;

    // 5. Pupillometri & Bilişsel Yük Analizi
    const pupilMetrics = this.computePupillometry(landmarks, now);

    // 6. Kabin İçi Görsel Zeka: Sigara & Yeme-İçme / El-Yüz Teması
    const mouthPucker = scores.get('mouthPucker') || 0;
    const mouthRollLower = scores.get('mouthRollLower') || 0;
    const mouthRollUpper = scores.get('mouthRollUpper') || 0;
    const mouthFunnel = scores.get('mouthFunnel') || 0;
    const mouthPressL = scores.get('mouthPressLeft') || 0;
    const mouthPressR = scores.get('mouthPressRight') || 0;

    const smokingGesture = (mouthPucker > 0.38) || 
                           ((mouthRollLower + mouthRollUpper) > 0.55 && (mouthPressL + mouthPressR) > 0.3) ||
                           (mouthFunnel > 0.45 && jawOpen < 0.25);

    if (smokingGesture) {
      if (!this.smokingStartTime) {
        this.smokingStartTime = now;
      }
    } else {
      if (this.smokingStartTime && now - this.smokingStartTime > 900) {
        this.smokingStartTime = null;
      }
    }

    const smokingDuration = this.smokingStartTime ? now - this.smokingStartTime : 0;
    this.isSmokingOrEating = smokingDuration >= 1200;
    this.handToFaceDetected = this.isSmokingOrEating || (mouthPucker > 0.3 && (Math.abs(yaw) > 15 || Math.abs(pitch) > 15));

    // 7. FACS ve Duygu Analizi (Valence & Arousal)
    const browDown = (browDownL + browDownR) / 2;
    const smile = (smileL + smileR) / 2;
    const au4BrowFurrow = Math.round(browDown * 100) / 100;
    const au1BrowRaise = Math.round(Math.max(0, Math.min(1.0, (scores.get('browInnerUp') || 0) * 1.5)) * 100) / 100;
    const au12Smile = Math.round(smile * 100) / 100;

    const valence = Math.max(-1.0, Math.min(1.0, Math.round(((au12Smile * 1.8) - (au4BrowFurrow * 1.4)) * 100) / 100));
    const arousal = Math.max(0.0, Math.min(1.0, Math.round(
      (au4BrowFurrow * 0.45 + (bpm > 85 ? (bpm - 85) / 50 : 0) * 0.35 + (hrvRmssd < 30 ? 0.2 : 0)) * 100
    ) / 100));

    let stressScore = Math.min(100, Math.round(browDown * 55 + (bpm > 95 ? (bpm - 95) : 0) + (hrvRmssd < 28 ? 20 : 0)));
    const roadRageDetected = au4BrowFurrow > 0.42 && bpm > 95 && stressScore > 65;

    const headDeviation = Math.abs(yaw) + Math.abs(pitch);
    let attentionScore = Math.max(0, Math.min(100, Math.round(
      100 - (perclos * 1.2) - (headDeviation > 30 ? (headDeviation - 30) * 1.5 : 0) - (isGazeDistracted ? 40 : 0) - (this.isSmokingOrEating ? 25 : 0)
    )));

    // 8. Duygu ve Durum Kararı
    let emotion: DriverEmotion = 'CALM';
    let statusReason: string | undefined = undefined;

    if (isProlongedClosure || perclos > 45 || this.isHeadNodding || (pitch > 35 && perclos > 30)) {
      emotion = 'DROWSY';
      statusReason = isProlongedClosure
        ? 'Uzun Süreli Göz Kapalılığı (Mikro-Uyku)'
        : this.isHeadNodding
        ? 'Kafa Düşmesi / Uyuklama İrkilmesi'
        : 'Yüksek PERCLOS Yorgunluk Eşiği';
    } else if (roadRageDetected || (stressScore > 75 && bpm > 105)) {
      emotion = 'ROAD_RAGE';
      statusReason = 'Yol Öfkesi (Road Rage) / Şiddetli Mimik ve Taşikardi';
    } else if (isGazeDistracted || phoneDistractionDetected) {
      emotion = 'DISTRACTED';
      statusReason = isGazeDistracted
        ? 'Gözler Yoldan Ayrıldı (Telefona/Aşağıya Bakış > 1.8s)'
        : 'Sürücü Dikkati Dağıldı / Baş Eğimi';
    } else if (this.isSmokingOrEating) {
      emotion = 'SMOKING_OR_EATING';
      statusReason = 'Kabin İçi Dikkat Dağıtıcı: Sigara / Yeme-İçme Tespit Edildi';
    } else if (stressScore > 50 || browDown > 0.45) {
      emotion = 'STRESSED';
      statusReason = 'Sürücü Gerginlik / Stres Seviyesi Yüksek';
    } else if (headDeviation > 35) {
      emotion = 'DISTRACTED';
      statusReason = 'Baş Yan Yönde / Yola Bakmıyor';
    } else if (smile > 0.35) {
      emotion = 'CALM';
    } else {
      emotion = 'FOCUSED';
      statusReason = 'Sürücü Yola Odaklı ve Uyanık';
    }

    if ((bpm > 0 && bpm < 40) || (pitch > 45 && perclos > 80 && eyeClosureDuration > 3000)) {
      emotion = 'INCAPACITATED';
      statusReason = 'ACİL DURUM: Sürücü Tepkisiz / Baygınlık Şüphesi';
    }

    let overallStatus: 'ALERT' | 'WARNING' | 'CRITICAL' | 'EMERGENCY' = 'ALERT';
    if (emotion === 'INCAPACITATED') {
      overallStatus = 'EMERGENCY';
    } else if (emotion === 'DROWSY' && (isProlongedClosure || perclos > 35 || this.isHeadNodding)) {
      overallStatus = 'CRITICAL';
    } else if (emotion === 'DISTRACTED' || emotion === 'ROAD_RAGE' || emotion === 'SMOKING_OR_EATING' || perclos > 22 || this.yawnCount >= 2) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'ALERT';
    }

    const mouthOpenPercentage = Math.round(Math.max(jawOpen, mar * 1.2) * 100);
    const tbutSeconds = Math.min(60, Math.round(((now - this.lastBlinkTime) / 1000) * 10) / 10);

    // Nörolojik Yüz Asimetrisi (FAST Tarama: Sağ-Sol göz, kaş ve ağız simetri farkı)
    const rawAsymmetry =
      (Math.abs(blinkL - blinkR) * 0.4 +
        Math.abs(smileL - smileR) * 0.4 +
        Math.abs(browDownL - browDownR) * 0.2) *
      100;
    this.smoothedAsymmetry = this.smoothedAsymmetry * 0.9 + rawAsymmetry * 0.1;
    const facialAsymmetryScore = Math.min(100, Math.round(this.smoothedAsymmetry));

    const state: DriverState = {
      emotion,
      perclos,
      earLeft: Math.round((1 - blinkL) * 100) / 100,
      earRight: Math.round((1 - blinkR) * 100) / 100,
      blinkCount: this.blinkCount,
      blinkRatePerMin,
      isBlinking: isEyesClosed,
      isProlongedClosure,

      // Kırpma Biyomekaniği
      blinkClosingVelocity: Math.round(this.maxClosingVelocity * 10) / 10,
      blinkOpeningVelocity: Math.round(this.maxOpeningVelocity * 10) / 10,
      blinkVelocityRatio: Math.round(this.smoothedBlinkVelocityRatio * 100) / 100,
      incompleteBlinkRatio: incompleteRatio,
      tbutSeconds,

      // Pupillometri & Bilişsel Yük
      pupilDiameterNormalized: pupilMetrics.pupilDiameterNormalized,
      pupilUnrestIndex: pupilMetrics.pupilUnrestIndex,
      cognitiveLoadScore: pupilMetrics.cognitiveLoadScore,

      // FACS & Duygu
      valence,
      arousal,
      facialAsymmetryScore,
      actionUnits: {
        au4BrowFurrow,
        au1BrowRaise,
        au12Smile,
      },
      roadRageDetected,

      // Kabin İçi Görsel Zeka
      isSmokingOrEating: this.isSmokingOrEating,
      handToFaceDetected: this.handToFaceDetected,

      isYawning: this.isCurrentlyYawning,
      yawnCount: this.yawnCount,
      mouthOpenRatio: mouthOpenPercentage,
      isHeadNodding: this.isHeadNodding,
      phoneDistractionDetected,
      gazeDirection,
      gazeDownDurationMs,
      stressScore,
      attentionScore,
      headPose: { pitch, yaw, roll },
      overallStatus,
      statusReason,
    };

    let canMessage: CanMessage | null = null;
    if (now - this.lastCanSentTime > 1000 || overallStatus === 'CRITICAL' || overallStatus === 'EMERGENCY') {
      this.lastCanSentTime = now;
      canMessage = this.generateCanMessage(state, bpm, hrvRmssd);
    }

    return { state, canMessage };
  }

  private generateCanMessage(state: DriverState, bpm: number, hrv: number): CanMessage {
    let id = '0x2A0';
    let name = 'DMS_DRIVER_STATUS';
    let severity: 'info' | 'warn' | 'alarm' = 'info';

    if (state.overallStatus === 'EMERGENCY') {
      id = '0x2A2';
      name = 'DMS_EMERGENCY_TAKEOVER';
      severity = 'alarm';
    } else if (state.overallStatus === 'CRITICAL') {
      id = '0x2A1';
      name = 'DMS_DROWSINESS_ALERT';
      severity = 'alarm';
    } else if (state.overallStatus === 'WARNING') {
      id = '0x2A0';
      name = 'DMS_ATTENTION_WARN';
      severity = 'warn';
    }

    const statusCode = state.emotion === 'INCAPACITATED' ? 4 : state.emotion === 'DROWSY' ? 2 : state.emotion === 'ROAD_RAGE' ? 3 : 1;
    const hrByte = Math.min(255, Math.max(0, bpm));
    const hrvByte = Math.min(255, Math.max(0, hrv));
    const perclosByte = Math.min(255, Math.max(0, state.perclos));
    const attentionByte = Math.min(255, Math.max(0, state.attentionScore));
    const yawByte = Math.min(255, Math.max(0, state.headPose.yaw + 128));
    const flags = (state.isProlongedClosure ? 0x01 : 0x00) | (state.overallStatus === 'EMERGENCY' ? 0x02 : 0x00);

    const byteData = [
      statusCode.toString(16).padStart(2, '0').toUpperCase(),
      hrByte.toString(16).padStart(2, '0').toUpperCase(),
      hrvByte.toString(16).padStart(2, '0').toUpperCase(),
      perclosByte.toString(16).padStart(2, '0').toUpperCase(),
      attentionByte.toString(16).padStart(2, '0').toUpperCase(),
      (state.yawnCount % 256).toString(16).padStart(2, '0').toUpperCase(),
      yawByte.toString(16).padStart(2, '0').toUpperCase(),
      flags.toString(16).padStart(2, '0').toUpperCase(),
    ].join(' ');

    return {
      id,
      timestamp: new Date().toISOString().substring(11, 23),
      name,
      byteData,
      decoded: {
        hr: bpm,
        hrv,
        fatigueLevel: state.perclos,
        distraction: state.emotion === 'DISTRACTED',
        emergencyTrigger: state.overallStatus === 'EMERGENCY',
        cognitiveLoad: state.cognitiveLoadScore,
        pui: state.pupilUnrestIndex,
      },
      severity,
    };
  }

  public resetCounters() {
    this.blinkCount = 0;
    this.yawnCount = 0;
    this.eyeClosureHistory = [];
    this.yawnStartTime = null;
    this.isCurrentlyYawning = false;
    this.isHeadNodding = false;
    this.smokingStartTime = null;
    this.isSmokingOrEating = false;
    this.handToFaceDetected = false;
    this.incompleteBlinkCount = 0;
    this.totalBlinkEvents = 0;
    this.pupilHistory = [];
  }
}
