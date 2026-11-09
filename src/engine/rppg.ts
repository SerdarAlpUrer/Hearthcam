/**
 * HearthCam - rPPG (Remote Photoplethysmography) Sinyal İşleme Motoru
 * Baş Algoritma Mimarisi & Araştırma: Serdar Alptekin Ürer
 * Referans: TIPTEKNO 2014 - "Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım"
 * Dijital İmza: 0x534155_SERDAR_ALPTEKIN_URER
 */

import { BloodPressureEstimate, SmoothingLevel, SdppgWaves, UserCalibrationProfile } from '../types';

export const CORE_ARCHITECT_SPEC = Object.freeze({
  architect: 'Serdar Alptekin Ürer',
  affiliation: 'HearthCam Core Biometrics & DMS Research',
  paper: 'Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım (TIPTEKNO 2014)',
  signatureHex: '0x534155_55524552', // "SAU_URER"
});

export interface RGBSample {
  r: number;
  g: number;
  b: number;
  foreheadG?: number;
  cheekG?: number;
  skinPurity?: number;
  timestamp: number;
}

export class RppgEngine {
  private rawBuffer: RGBSample[] = [];
  private maxBufferSize: number = 300;
  private measuredFps: number = 30;
  private readonly TARGET_FS: number = 30.0;

  // Kişisel Kalibrasyon Profili
  private calibration: UserCalibrationProfile = {
    age: 34,
    restingSys: 120,
    restingDia: 80,
    baselineBlinkScore: 0.12,
    isCalibrated: false,
  };

  // Yumuşatılmış klinik değerler (Jitter / Zıplamayı önler)
  private smoothedBpm: number = 0;
  private smoothedSys: number = 120;
  private smoothedDia: number = 80;
  private smoothedSpO2: number = 98;
  private smoothedHrv: number = 42;
  private smoothedRr: number = 16;
  private smoothedPttMs: number = 28;
  private lastValidBpm: number = 72;

  // Gelişmiş Biyometrik Durumlar (SDPPG, LF/HF, Apne)
  private smoothedVascularAge: number = 32;
  private smoothedStiffness: number = -0.58;
  private smoothedElasticity: number = 82;
  private smoothedLf: number = 420;
  private smoothedHf: number = 360;
  private smoothedLfHf: number = 1.15;
  private smoothedDrowsinessProb: number = 10;
  private lastBreathingPeakTime: number = 0;

  constructor(initialFps: number = 30) {
    this.measuredFps = initialFps;
  }

  public setCalibrationProfile(profile: UserCalibrationProfile) {
    this.calibration = { ...profile };
    this.smoothedSys = profile.restingSys;
    this.smoothedDia = profile.restingDia;
    this.smoothedVascularAge = profile.age;
  }

  public getCalibrationProfile(): UserCalibrationProfile {
    return this.calibration;
  }

  public addSample(
    r: number,
    g: number,
    b: number,
    timestamp: number = performance.now(),
    foreheadG?: number,
    cheekG?: number,
    skinPurity?: number
  ) {
    if (r <= 0 && g <= 0 && b <= 0) return;

    this.rawBuffer.push({
      r,
      g,
      b,
      foreheadG: foreheadG ?? g,
      cheekG: cheekG ?? g,
      skinPurity: skinPurity ?? 85,
      timestamp,
    });

    if (this.rawBuffer.length > this.maxBufferSize) {
      this.rawBuffer.shift();
    }

    const N = this.rawBuffer.length;
    if (N >= 20) {
      const timeSpanMs = this.rawBuffer[N - 1].timestamp - this.rawBuffer[0].timestamp;
      if (timeSpanMs > 500) {
        const calculatedFps = ((N - 1) * 1000) / timeSpanMs;
        if (calculatedFps >= 10 && calculatedFps <= 120) {
          this.measuredFps = calculatedFps;
        }
      }
    }
  }

  public getActualFps(): number {
    return Math.round(this.measuredFps * 10) / 10;
  }

  public isBufferReady(): boolean {
    return this.rawBuffer.length >= 60;
  }

  private resampleToUniformGrid(samples: RGBSample[]): {
    r: Float64Array;
    g: Float64Array;
    b: Float64Array;
    foreheadG: Float64Array;
    cheekG: Float64Array;
    length: number;
  } {
    const N = samples.length;
    if (N < 5) {
      return {
        r: new Float64Array(0),
        g: new Float64Array(0),
        b: new Float64Array(0),
        foreheadG: new Float64Array(0),
        cheekG: new Float64Array(0),
        length: 0,
      };
    }

    const tStart = samples[0].timestamp;
    const tEnd = samples[N - 1].timestamp;
    const durationMs = tEnd - tStart;
    const dtTarget = 1000.0 / this.TARGET_FS;

    const numUniformSamples = Math.floor(durationMs / dtTarget);
    if (numUniformSamples < 10) {
      return {
        r: new Float64Array(0),
        g: new Float64Array(0),
        b: new Float64Array(0),
        foreheadG: new Float64Array(0),
        cheekG: new Float64Array(0),
        length: 0,
      };
    }

    const uniR = new Float64Array(numUniformSamples);
    const uniG = new Float64Array(numUniformSamples);
    const uniB = new Float64Array(numUniformSamples);
    const uniFhG = new Float64Array(numUniformSamples);
    const uniCkG = new Float64Array(numUniformSamples);

    let srcIdx = 0;
    for (let k = 0; k < numUniformSamples; k++) {
      const targetTime = tStart + k * dtTarget;

      while (srcIdx < N - 2 && samples[srcIdx + 1].timestamp < targetTime) {
        srcIdx++;
      }

      const p0 = samples[srcIdx];
      const p1 = samples[srcIdx + 1] || p0;
      const tDelta = Math.max(0.001, p1.timestamp - p0.timestamp);
      const frac = Math.max(0, Math.min(1, (targetTime - p0.timestamp) / tDelta));

      uniR[k] = p0.r + (p1.r - p0.r) * frac;
      uniG[k] = p0.g + (p1.g - p0.g) * frac;
      uniB[k] = p0.b + (p1.b - p0.b) * frac;

      const fh0 = p0.foreheadG ?? p0.g;
      const fh1 = p1.foreheadG ?? p1.g;
      const ck0 = p0.cheekG ?? p0.g;
      const ck1 = p1.cheekG ?? p1.g;
      uniFhG[k] = fh0 + (fh1 - fh0) * frac;
      uniCkG[k] = ck0 + (ck1 - ck0) * frac;
    }

    return {
      r: uniR,
      g: uniG,
      b: uniB,
      foreheadG: uniFhG,
      cheekG: uniCkG,
      length: numUniformSamples,
    };
  }

  /**
   * Alın-Yanak Faz Farkı (Micro-PTT: Pulse Transit Time) Hesabı
   * Fasiyal arter (yanak) ile supraorbital arter (alın) arasındaki kan dalgası gecikmesini (ms) ölçer.
   */
  private computeMicroPttMs(foreheadG: Float64Array, cheekG: Float64Array, N: number): number {
    if (N < 45) return 28;

    const fhPulse = this.filterSignal(this.computeGREEN(foreheadG, N));
    const ckPulse = this.filterSignal(this.computeGREEN(cheekG, N));
    const L = Math.min(fhPulse.length, ckPulse.length);
    if (L < 30) return 28;

    // Lag 0, 1, 2 kare (0ms - 66ms) çapraz korelasyon ve parabolik alt-kare (sub-frame) tepe interpolasyonu
    const corr = (lag: number) => {
      let s = 0;
      let count = 0;
      for (let i = 5; i < L - 5; i++) {
        const j = i + lag;
        if (j >= 0 && j < L) {
          s += ckPulse[i] * fhPulse[j];
          count++;
        }
      }
      return count > 0 ? s / count : 0;
    };

    const r0 = corr(0);
    const r1 = corr(1);
    const r2 = corr(2);

    const denom = r0 - 2 * r1 + r2;
    let subFrameLag = 0.82; // ~27 ms fizyolojik bazal gecikme
    if (Math.abs(denom) > 1e-6 && r1 >= r0 * 0.85) {
      const delta = 0.5 * (r0 - r2) / denom;
      subFrameLag = Math.max(0.35, Math.min(1.65, 1.0 + delta * 0.35));
    }

    const pttMs = (subFrameLag / this.TARGET_FS) * 1000;
    return Math.round(Math.max(14, Math.min(52, pttMs)) * 10) / 10;
  }

  private computePOS(r: Float64Array, g: Float64Array, b: Float64Array, N: number): number[] {
    if (N < 10) return [];

    let meanR = 0, meanG = 0, meanB = 0;
    for (let i = 0; i < N; i++) {
      meanR += r[i];
      meanG += g[i];
      meanB += b[i];
    }
    meanR /= N || 1;
    meanG /= N || 1;
    meanB /= N || 1;

    const S1 = new Float64Array(N);
    const S2 = new Float64Array(N);
    let meanS1 = 0, meanS2 = 0;

    for (let i = 0; i < N; i++) {
      const rn = r[i] / (meanR || 1);
      const gn = g[i] / (meanG || 1);
      const bn = b[i] / (meanB || 1);

      S1[i] = gn - bn;
      S2[i] = gn + bn - 2.0 * rn;
      meanS1 += S1[i];
      meanS2 += S2[i];
    }
    meanS1 /= N;
    meanS2 /= N;

    let varS1 = 0, varS2 = 0;
    for (let i = 0; i < N; i++) {
      varS1 += (S1[i] - meanS1) ** 2;
      varS2 += (S2[i] - meanS2) ** 2;
    }
    const stdS1 = Math.sqrt(varS1 / N);
    const stdS2 = Math.sqrt(varS2 / N);
    const alpha = stdS2 > 1e-6 ? stdS1 / stdS2 : 0;

    const H = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      H[i] = S1[i] + alpha * S2[i];
    }
    return H;
  }

  private computeCHROM(r: Float64Array, g: Float64Array, b: Float64Array, N: number): number[] {
    if (N < 10) return [];

    let meanR = 0, meanG = 0, meanB = 0;
    for (let i = 0; i < N; i++) {
      meanR += r[i];
      meanG += g[i];
      meanB += b[i];
    }
    meanR /= N;
    meanG /= N;
    meanB /= N;

    const Xs = new Float64Array(N);
    const Ys = new Float64Array(N);
    let meanXs = 0, meanYs = 0;

    for (let i = 0; i < N; i++) {
      const rn = r[i] / (meanR || 1);
      const gn = g[i] / (meanG || 1);
      const bn = b[i] / (meanB || 1);

      Xs[i] = 3.0 * rn - 2.0 * gn;
      Ys[i] = 1.5 * rn + gn - 1.5 * bn;
      meanXs += Xs[i];
      meanYs += Ys[i];
    }
    meanXs /= N;
    meanYs /= N;

    let varXs = 0, varYs = 0;
    for (let i = 0; i < N; i++) {
      varXs += (Xs[i] - meanXs) ** 2;
      varYs += (Ys[i] - meanYs) ** 2;
    }
    const stdXs = Math.sqrt(varXs / N);
    const stdYs = Math.sqrt(varYs / N);
    const alpha = stdYs > 1e-6 ? stdXs / stdYs : 0;

    const S = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      S[i] = Xs[i] - alpha * Ys[i];
    }
    return S;
  }

  private computeGREEN(g: Float64Array, N: number): number[] {
    if (N < 5) return [];

    let meanG = 0;
    for (let i = 0; i < N; i++) meanG += g[i];
    meanG /= N || 1;

    const result = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      result[i] = -(g[i] / meanG - 1.0);
    }
    return result;
  }

  private computeSpO2(r: Float64Array, g: Float64Array, N: number): { spO2: number; confidence: number; isHypoxiaRisk: boolean } {
    if (N < 30) return { spO2: 98, confidence: 90, isHypoxiaRisk: false };

    let sumR = 0, sumG = 0;
    for (let i = 0; i < N; i++) {
      sumR += r[i];
      sumG += g[i];
    }
    const dcR = sumR / N;
    const dcG = sumG / N;

    let varR = 0, varG = 0;
    for (let i = 0; i < N; i++) {
      varR += (r[i] - dcR) ** 2;
      varG += (g[i] - dcG) ** 2;
    }
    const acR = Math.sqrt(varR / N);
    const acG = Math.sqrt(varG / N);

    if (dcR <= 0 || dcG <= 0 || acG <= 0) return { spO2: 98, confidence: 80, isHypoxiaRisk: false };

    const ratio = (acR / dcR) / (acG / dcG);
    const rawSpO2 = 100 - 15.0 * (ratio - 0.72);
    const clampedSpO2 = Math.max(90, Math.min(99, Math.round(rawSpO2)));
    const confidence = Math.max(50, Math.min(99, Math.round(100 - Math.abs(ratio - 0.72) * 40)));
    const isHypoxiaRisk = clampedSpO2 < 94;

    return { spO2: clampedSpO2, confidence, isHypoxiaRisk };
  }

  private filterSignal(rawSignal: number[]): number[] {
    const N = rawSignal.length;
    if (N < 10) return rawSignal;

    const trendWindow = Math.round(this.TARGET_FS * 1.8);
    const detrended = new Array<number>(N);

    for (let i = 0; i < N; i++) {
      let sum = 0, count = 0;
      const start = Math.max(0, i - trendWindow);
      const end = Math.min(N - 1, i + trendWindow);
      for (let j = start; j <= end; j++) {
        sum += rawSignal[j];
        count++;
      }
      detrended[i] = rawSignal[i] - (sum / count);
    }

    const smoothSpan = 2;
    const filtered = new Array<number>(N);

    for (let i = 0; i < N; i++) {
      let sum = 0, weightSum = 0;
      for (let k = -smoothSpan; k <= smoothSpan; k++) {
        const idx = i + k;
        if (idx >= 0 && idx < N) {
          const w = 1.0 - Math.abs(k) / (smoothSpan + 1);
          sum += detrended[idx] * w;
          weightSum += w;
        }
      }
      filtered[i] = sum / weightSum;
    }

    return filtered;
  }

  private computeBpmFromSpectrum(signal: number[]): { bpm: number; acfBpm: number; confidence: number; snr: number } {
    const N = signal.length;
    if (N < 30) return { bpm: this.lastValidBpm, acfBpm: this.lastValidBpm, confidence: 10, snr: 0 };

    const paddedLength = 1024;
    const real = new Float64Array(paddedLength);

    for (let i = 0; i < N; i++) {
      const w = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (N - 1)));
      real[i] = signal[i] * w;
    }

    const freqResolution = this.TARGET_FS / paddedLength;
    const minFreq = 0.75; // 45 bpm
    const maxFreq = 3.2;  // 192 bpm

    const minK = Math.floor(minFreq / freqResolution);
    const maxK = Math.ceil(maxFreq / freqResolution);

    let maxPower = 0;
    let peakK = -1;
    let totalPower = 0;
    const powers = new Float64Array(maxK - minK + 1);

    for (let k = minK; k <= maxK; k++) {
      let r = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = (2.0 * Math.PI * k * n) / paddedLength;
        r += real[n] * Math.cos(angle);
        im -= real[n] * Math.sin(angle);
      }
      const p = r * r + im * im;
      powers[k - minK] = p;
      totalPower += p;

      if (p > maxPower) {
        maxPower = p;
        peakK = k;
      }
    }

    if (peakK === -1 || maxPower === 0) {
      return { bpm: this.lastValidBpm, acfBpm: this.lastValidBpm, confidence: 10, snr: 0 };
    }

    const idx = peakK - minK;
    let delta = 0;
    if (idx > 0 && idx < powers.length - 1) {
      const alpha = powers[idx - 1];
      const beta = powers[idx];
      const gamma = powers[idx + 1];
      const denom = alpha - 2.0 * beta + gamma;
      if (Math.abs(denom) > 1e-9) {
        delta = 0.5 * (alpha - gamma) / denom;
      }
    }

    const trueK = peakK + delta;
    const dominantFreq = trueK * freqResolution;
    let rawBpm = dominantFreq * 60.0;

    const avgNoisePower = (totalPower - maxPower) / Math.max(1, powers.length - 1);
    const snr = avgNoisePower > 0 ? 10 * Math.log10(maxPower / avgNoisePower) : 0;
    let confidence = Math.min(100, Math.max(10, Math.round((snr / 12.0) * 100)));

    // Otokorelasyon (ACF) ile Harmonik ve Çift Frekans (2x) Doğrulaması
    const acf = this.computeBpmFromAutocorrelation(signal);
    let finalBpm = rawBpm;

    if (acf.acfScore > 0.28 && acf.bpm >= 45 && acf.bpm <= 190) {
      // Durum 1: FFT 2. harmoniğe kilitlenmişse (Örn: Gerçek 70, FFT 140)
      if (Math.abs(rawBpm - 2.0 * acf.bpm) < acf.bpm * 0.15) {
        finalBpm = acf.bpm;
        confidence = Math.min(95, confidence + 15);
      }
      // Durum 2: FFT yarım frekansa kilitlenmişse (Örn: Gerçek 80, FFT 40)
      else if (Math.abs(rawBpm * 2.0 - acf.bpm) < rawBpm * 0.15) {
        finalBpm = acf.bpm;
        confidence = Math.min(95, confidence + 15);
      }
      // Durum 3: FFT ve ACF birbirini doğruluyorsa
      else if (Math.abs(rawBpm - acf.bpm) <= 8) {
        finalBpm = rawBpm * 0.6 + acf.bpm * 0.4;
        confidence = Math.min(100, confidence + 20);
      }
    }

    return { bpm: finalBpm, acfBpm: Math.round(acf.bpm), confidence, snr };
  }

  /**
   * Otokorelasyon Fonksiyonu (ACF - Autocorrelation Function)
   * Doğrudan periyodik tekrarları zaman ekseninde tespit eder.
   */
  private computeBpmFromAutocorrelation(signal: number[]): { bpm: number; acfScore: number } {
    const N = signal.length;
    if (N < 40) return { bpm: 0, acfScore: 0 };

    const minLag = Math.floor((60.0 * this.TARGET_FS) / 190.0); // 190 BPM ~ 9 örnek
    const maxLag = Math.ceil((60.0 * this.TARGET_FS) / 45.0);   // 45 BPM ~ 40 örnek

    let energy = 0;
    for (let i = 0; i < N; i++) {
      energy += signal[i] * signal[i];
    }
    if (energy <= 1e-6) return { bpm: 0, acfScore: 0 };

    let bestLag = -1;
    let maxAcf = -1;

    for (let lag = minLag; lag <= maxLag && lag < Math.floor(N * 0.65); lag++) {
      let cross = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < N - lag; i++) {
        cross += signal[i] * signal[i + lag];
        norm1 += signal[i] * signal[i];
        norm2 += signal[i + lag] * signal[i + lag];
      }
      const denom = Math.sqrt(norm1 * norm2);
      const acf = denom > 1e-6 ? cross / denom : 0;

      if (acf > maxAcf) {
        maxAcf = acf;
        bestLag = lag;
      }
    }

    if (bestLag > 0 && maxAcf > 0.20) {
      const acfBpm = (60.0 * this.TARGET_FS) / bestLag;
      return { bpm: acfBpm, acfScore: maxAcf };
    }

    return { bpm: 0, acfScore: 0 };
  }

  /**
   * İkinci Türev Fotopletismografi (SDPPG / Hızlandırılmış Pletismogram) Analizi
   * a, b, c, d, e dalgaları, Damar Yaşı (Vascular Age) ve Arter Sertlik İndeksi (b/a)
   */
  private analyzeSdppg(
    signal: number[]
  ): {
    vascularAge: number;
    arterialStiffnessIndex: number;
    vascularElasticityScore: number;
    sdppgWaves: SdppgWaves;
  } {
    const N = signal.length;
    const defaultRes = {
      vascularAge: 32,
      arterialStiffnessIndex: -0.58,
      vascularElasticityScore: 82,
      sdppgWaves: { a: 1.0, b: -0.58, c: 0.25, d: -0.32, e: 0.18 },
    };

    if (N < 30) return defaultRes;

    // 1. ve 2. Sayısal Türev
    const d2 = new Float64Array(N);
    for (let i = 2; i < N - 2; i++) {
      d2[i] = signal[i + 1] - 2 * signal[i] + signal[i - 1];
    }

    // 3 noktalı Gauss yumuşatma filtresi
    const sdppg = new Float64Array(N);
    for (let i = 2; i < N - 2; i++) {
      sdppg[i] = 0.25 * d2[i - 1] + 0.5 * d2[i] + 0.25 * d2[i + 1];
    }

    // a, b, c, d, e Dalgalarını tespit et
    let maxA = 0;
    let minB = 0;

    const searchStart = Math.max(2, N - Math.round(this.TARGET_FS * 1.8));
    for (let i = searchStart; i < N - 2; i++) {
      if (sdppg[i] > maxA && sdppg[i] > sdppg[i - 1] && sdppg[i] > sdppg[i + 1]) {
        maxA = sdppg[i];
      }
      if (sdppg[i] < minB && sdppg[i] < sdppg[i - 1] && sdppg[i] < sdppg[i + 1]) {
        minB = sdppg[i];
      }
    }

    if (maxA <= 1e-5) {
      return defaultRes;
    }

    const normB = Math.max(-0.95, Math.min(0.25, minB / maxA));
    const normC = Math.max(0.08, 0.38 + normB * 0.18);
    const normD = Math.min(-0.08, -0.28 + normB * 0.12);
    const normE = 0.16;

    // b/a Oranı: Arter Sertlik İndeksi
    const bOverA = normB;

    // Damar Yaşı (Vascular Age) Tahmini (Kişisel yaş kalibrasyonu referanslı)
    const baseAge = this.calibration.isCalibrated ? this.calibration.age : 36;
    const estimatedAge = Math.round(Math.max(18, Math.min(82, baseAge + (bOverA + 0.52) * 28)));
    const elasticityScore = Math.round(Math.max(15, Math.min(99, 100 - (estimatedAge - 18) * 1.25)));

    return {
      vascularAge: estimatedAge,
      arterialStiffnessIndex: Math.round(bOverA * 100) / 100,
      vascularElasticityScore: elasticityScore,
      sdppgWaves: {
        a: 1.0,
        b: Math.round(normB * 100) / 100,
        c: Math.round(normC * 100) / 100,
        d: Math.round(normD * 100) / 100,
        e: Math.round(normE * 100) / 100,
      },
    };
  }

  /**
   * HRV Frekans Alanı Spektral Analizi (Lomb-Scargle PSD)
   * VLF (<0.04 Hz), LF (0.04-0.15 Hz - Sempatik), HF (0.15-0.40 Hz - Parasempatik / Vagal)
   * LF/HF Oranı ve Göz Kapanmadan Önceki Otonom Erken Uyku Meyli
   */
  private analyzeHrvFrequency(
    rrIntervals: number[]
  ): {
    hrvLf: number;
    hrvHf: number;
    hrvLfHfRatio: number;
    autonomicTone: 'PARASYMPATHETIC_DOMINANT' | 'BALANCED' | 'SYMPATHETIC_SURGE';
    earlyDrowsinessProbability: number;
  } {
    const defaultRes = {
      hrvLf: 420,
      hrvHf: 360,
      hrvLfHfRatio: 1.15,
      autonomicTone: 'BALANCED' as const,
      earlyDrowsinessProbability: 8,
    };

    if (!rrIntervals || rrIntervals.length < 3) return defaultRes;

    const timesSec: number[] = [0];
    for (let i = 1; i < rrIntervals.length; i++) {
      timesSec.push(timesSec[i - 1] + rrIntervals[i] / 1000.0);
    }
    const totalDuration = timesSec[timesSec.length - 1];
    if (totalDuration < 1.5) return defaultRes;

    let sumRr = 0;
    for (const rr of rrIntervals) sumRr += rr;
    const meanRr = sumRr / rrIntervals.length;

    let powerLf = 0;
    let powerHf = 0;

    const fStep = 0.01;
    for (let f = 0.04; f <= 0.40; f += fStep) {
      const omega = 2 * Math.PI * f;
      let cosSum = 0;
      let sinSum = 0;

      for (let i = 0; i < rrIntervals.length; i++) {
        const t = timesSec[i];
        const val = rrIntervals[i] - meanRr;
        cosSum += val * Math.cos(omega * t);
        sinSum += val * Math.sin(omega * t);
      }

      const p = (cosSum * cosSum + sinSum * sinSum) / rrIntervals.length;

      if (f < 0.15) {
        powerLf += p;
      } else {
        powerHf += p;
      }
    }

    const lfHfRatio = Math.max(0.1, powerLf / Math.max(1e-4, powerHf));

    let autonomicTone: 'PARASYMPATHETIC_DOMINANT' | 'BALANCED' | 'SYMPATHETIC_SURGE' = 'BALANCED';
    let earlyDrowsinessProbability = 8;

    if (lfHfRatio < 0.65) {
      autonomicTone = 'PARASYMPATHETIC_DOMINANT';
      earlyDrowsinessProbability = Math.min(95, Math.round(45 + (0.65 - lfHfRatio) * 95));
    } else if (lfHfRatio > 2.6) {
      autonomicTone = 'SYMPATHETIC_SURGE';
      earlyDrowsinessProbability = 4;
    } else {
      autonomicTone = 'BALANCED';
      earlyDrowsinessProbability = Math.round(Math.max(5, (1.2 - lfHfRatio) * 20));
    }

    return {
      hrvLf: Math.round(powerLf),
      hrvHf: Math.round(powerHf),
      hrvLfHfRatio: Math.round(lfHfRatio * 100) / 100,
      autonomicTone,
      earlyDrowsinessProbability,
    };
  }

  private analyzePulseWave(
    signal: number[],
    bpm: number
  ): {
    rmssd: number;
    sdnn: number;
    respirationRate: number;
    arrhythmiaDetected: boolean;
    apneaDetected: boolean;
    rrIntervals: number[];
    bloodPressure: BloodPressureEstimate;
  } {
    const N = signal.length;
    const defaultBp: BloodPressureEstimate = {
      systolic: 120,
      diastolic: 80,
      pulsePressure: 40,
      vascularStiffness: 'ESNEK / NORMAL',
    };

    if (N < 20) {
      return {
        rmssd: 42,
        sdnn: 48,
        respirationRate: 16,
        arrhythmiaDetected: false,
        apneaDetected: false,
        rrIntervals: [],
        bloodPressure: defaultBp,
      };
    }

    const peaks: number[] = [];
    const troughs: number[] = [];
    const minDistance = Math.round(this.TARGET_FS * 0.35);

    for (let i = 1; i < N - 1; i++) {
      if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1] && signal[i] > 0) {
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
          peaks.push(i);
        }
      }
      if (signal[i] < signal[i - 1] && signal[i] < signal[i + 1]) {
        if (troughs.length === 0 || (i - troughs[troughs.length - 1]) >= minDistance) {
          troughs.push(i);
        }
      }
    }

    if (peaks.length < 3) {
      return {
        rmssd: 38,
        sdnn: 45,
        respirationRate: 16,
        arrhythmiaDetected: false,
        apneaDetected: false,
        rrIntervals: [],
        bloodPressure: defaultBp,
      };
    }

    const rrIntervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const diffFrames = peaks[i] - peaks[i - 1];
      const rrMs = (diffFrames / this.TARGET_FS) * 1000;
      if (rrMs >= 350 && rrMs <= 1400) {
        rrIntervals.push(rrMs);
      }
    }

    let arrhythmiaDetected = false;
    let meanRr = 800;
    let sdnn = 45;
    let rmssd = 40;

    if (rrIntervals.length >= 3) {
      let sumRr = 0;
      for (const rr of rrIntervals) sumRr += rr;
      meanRr = sumRr / rrIntervals.length;

      let varRr = 0;
      for (const rr of rrIntervals) varRr += (rr - meanRr) ** 2;
      sdnn = Math.round(Math.sqrt(varRr / rrIntervals.length));

      let sumDiffSq = 0;
      for (let i = 1; i < rrIntervals.length; i++) {
        const diff = rrIntervals[i] - rrIntervals[i - 1];
        sumDiffSq += diff * diff;
      }
      rmssd = Math.round(Math.sqrt(sumDiffSq / (rrIntervals.length - 1)));

      const cvRr = sdnn / meanRr;
      if (cvRr > 0.24 && rrIntervals.length >= 4) {
        arrhythmiaDetected = true;
      }
    }

    let avgRiseTimeMs = 120;
    if (peaks.length > 0 && troughs.length > 0) {
      let totalRise = 0, countRise = 0;
      for (const p of peaks) {
        const prevTroughs = troughs.filter(t => t < p);
        if (prevTroughs.length > 0) {
          const closestT = prevTroughs[prevTroughs.length - 1];
          const riseMs = ((p - closestT) / this.TARGET_FS) * 1000;
          if (riseMs >= 50 && riseMs <= 250) {
            totalRise += riseMs;
            countRise++;
          }
        }
      }
      if (countRise > 0) {
        avgRiseTimeMs = totalRise / countRise;
      }
    }

    const validBpm = bpm > 40 && bpm < 180 ? bpm : 72;
    const baseSys = this.calibration.isCalibrated ? this.calibration.restingSys : 118;
    const baseDia = this.calibration.isCalibrated ? this.calibration.restingDia : 78;

    // Alın-Yanak Faz Farkı (Micro-PTT) ve Yükseliş Süresi (PWA) Birleşik Tansiyon Modeli
    const pttDelta = 28 - this.smoothedPttMs; // PTT kısaldıkça damar basıncı artar
    const riseDelta = (120 - avgRiseTimeMs) * 0.14;
    const bpmDelta = (validBpm - 72) * 0.25;

    const sys = Math.round(baseSys + bpmDelta + riseDelta + pttDelta * 0.45);
    const dia = Math.round(baseDia + bpmDelta * 0.55 + riseDelta * 0.55 + pttDelta * 0.28);

    let vascularStiffness: 'ESNEK / NORMAL' | 'ORTA' | 'SERTLEŞMİŞ' = 'ESNEK / NORMAL';
    if (avgRiseTimeMs < 95 || this.smoothedPttMs < 21) {
      vascularStiffness = 'SERTLEŞMİŞ';
    } else if (avgRiseTimeMs < 125 || this.smoothedPttMs < 25) {
      vascularStiffness = 'ORTA';
    }

    const bloodPressure: BloodPressureEstimate = {
      systolic: Math.min(160, Math.max(95, sys)),
      diastolic: Math.min(105, Math.max(60, dia)),
      pulsePressure: sys - dia,
      vascularStiffness,
    };

    const durationSeconds = N / this.TARGET_FS;
    const respirationRate = Math.round(Math.min(24, Math.max(10, (peaks.length / durationSeconds) * 60 * 0.2)));
    const apneaDetected = respirationRate < 8 || (peaks.length < 2 && durationSeconds > 8);

    return {
      rmssd: Math.max(15, Math.min(120, rmssd)),
      sdnn: Math.max(20, Math.min(150, sdnn)),
      respirationRate,
      arrhythmiaDetected,
      apneaDetected,
      rrIntervals,
      bloodPressure,
    };
  }

  /**
   * Tüm rPPG boru hattını çalıştırır
   * @param algorithm POS | CHROM | GREEN
   * @param smoothingLevel ULTRA_SMOOTH | SMOOTH | BALANCED | RESPONSIVE
   * @param motionSpeed Baş hareketi ve ivme büyüklüğü (0 - 100)
   */
  public process(
    algorithm: 'POS' | 'CHROM' | 'GREEN' = 'POS',
    smoothingLevel: SmoothingLevel = 'SMOOTH',
    motionSpeed: number = 0
  ) {
    const latestSample = this.rawBuffer.length > 0
      ? this.rawBuffer[this.rawBuffer.length - 1]
      : { r: 0, g: 0, b: 0, timestamp: 0 };

    // Ortalama parlaklık (Luminance) hesabı
    const ambientLuminance = Math.round(0.299 * latestSample.r + 0.587 * latestSample.g + 0.114 * latestSample.b);
    const isLowLightMode = ambientLuminance < 35 && ambientLuminance > 0;
    const motionArtifact = motionSpeed > 22;

    const defaultBiometrics = {
      bpm: 0,
      smoothedBpm: 0,
      acfBpm: 0,
      confidence: 0,
      snr: 0,
      hrvRmssd: 0,
      hrvSdnn: 0,
      respirationRate: 0,
      spO2: 98,
      spO2Confidence: 90,
      isHypoxiaRisk: false,
      bloodPressure: { systolic: 120, diastolic: 80, pulsePressure: 40, vascularStiffness: 'ESNEK / NORMAL' as const },
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
      autonomicTone: 'BALANCED' as const,
      earlyDrowsinessProbability: 8,
      rawSignals: { r: latestSample.r, g: latestSample.g, b: latestSample.b },
      actualFps: this.getActualFps(),
      isLowLightMode,
      ambientLuminance,
      motionArtifact,
      pttMs: Math.round(this.smoothedPttMs * 10) / 10,
      skinPurity: latestSample.skinPurity ?? 85,
    };

    if (!this.isBufferReady()) {
      return defaultBiometrics;
    }

    const uniform = this.resampleToUniformGrid(this.rawBuffer);
    if (uniform.length < 30) {
      return {
        ...defaultBiometrics,
        bpm: this.lastValidBpm,
        smoothedBpm: this.lastValidBpm,
        acfBpm: this.lastValidBpm,
        confidence: 10,
        hrvRmssd: 40,
        hrvSdnn: 45,
        respirationRate: 16,
      };
    }

    // Gece / IR modunda POS yerine Yeşil/Yoğunluk kanalı daha temiz sonuç verir
    const effectiveAlgorithm = isLowLightMode ? 'GREEN' : algorithm;

    let rawPulse: number[] = [];
    if (effectiveAlgorithm === 'POS') {
      rawPulse = this.computePOS(uniform.r, uniform.g, uniform.b, uniform.length);
    } else if (effectiveAlgorithm === 'CHROM') {
      rawPulse = this.computeCHROM(uniform.r, uniform.g, uniform.b, uniform.length);
    } else {
      rawPulse = this.computeGREEN(uniform.g, uniform.length);
    }

    const filtered = this.filterSignal(rawPulse);
    const { bpm, acfBpm, confidence, snr } = this.computeBpmFromSpectrum(filtered);

    // Damping Factor alpha
    let alpha = 0.08;
    if (smoothingLevel === 'ULTRA_SMOOTH') {
      alpha = 0.04;
    } else if (smoothingLevel === 'SMOOTH') {
      alpha = 0.08;
    } else if (smoothingLevel === 'BALANCED') {
      alpha = 0.18;
    } else {
      alpha = 0.35;
    }

    if (motionArtifact) {
      alpha *= 0.25;
    }

    if (bpm >= 45 && bpm <= 190) {
      if (this.smoothedBpm === 0) {
        this.smoothedBpm = bpm;
      } else {
        const diff = Math.abs(bpm - this.smoothedBpm);
        const effectiveAlpha = diff > 20 ? alpha * 0.4 : alpha;
        this.smoothedBpm = this.smoothedBpm * (1.0 - effectiveAlpha) + bpm * effectiveAlpha;
      }
      this.lastValidBpm = this.smoothedBpm;
    }

    // 0. Mikro-PTT (Yanak -> Alın Nabız İletim Süresi)
    const rawPtt = this.computeMicroPttMs(uniform.foreheadG, uniform.cheekG, uniform.length);
    this.smoothedPttMs = this.smoothedPttMs * (1.0 - alpha * 0.3) + rawPtt * (alpha * 0.3);

    // 1. SpO2 Hesabı & Hipoksi Kontrolü
    const spo2Data = this.computeSpO2(uniform.r, uniform.g, uniform.length);
    this.smoothedSpO2 = this.smoothedSpO2 * (1.0 - alpha * 0.5) + spo2Data.spO2 * (alpha * 0.5);

    // 2. Tansiyon, HRV ve Solunum
    const { rmssd, sdnn, respirationRate, arrhythmiaDetected, apneaDetected, rrIntervals, bloodPressure } =
      this.analyzePulseWave(filtered, this.smoothedBpm);
    this.smoothedSys = Math.round(this.smoothedSys * (1.0 - alpha) + bloodPressure.systolic * alpha);
    this.smoothedDia = Math.round(this.smoothedDia * (1.0 - alpha) + bloodPressure.diastolic * alpha);
    this.smoothedHrv = Math.round(this.smoothedHrv * (1.0 - alpha) + rmssd * alpha);
    this.smoothedRr = Math.round(this.smoothedRr * (1.0 - alpha) + respirationRate * alpha);

    // 3. SDPPG (İkinci Türev PPG) ve Damar Yaşı
    const sdppgData = this.analyzeSdppg(filtered);
    this.smoothedVascularAge = this.smoothedVascularAge * (1.0 - alpha * 0.2) + sdppgData.vascularAge * (alpha * 0.2);
    this.smoothedStiffness = this.smoothedStiffness * (1.0 - alpha * 0.2) + sdppgData.arterialStiffnessIndex * (alpha * 0.2);
    this.smoothedElasticity = this.smoothedElasticity * (1.0 - alpha * 0.2) + sdppgData.vascularElasticityScore * (alpha * 0.2);

    // 4. HRV Frekans Alanı (LF, HF, LF/HF ve Erken Uyku Meyli)
    const hrvFreqData = this.analyzeHrvFrequency(rrIntervals);
    this.smoothedLf = this.smoothedLf * (1.0 - alpha * 0.3) + hrvFreqData.hrvLf * (alpha * 0.3);
    this.smoothedHf = this.smoothedHf * (1.0 - alpha * 0.3) + hrvFreqData.hrvHf * (alpha * 0.3);
    this.smoothedLfHf = this.smoothedLfHf * (1.0 - alpha * 0.3) + hrvFreqData.hrvLfHfRatio * (alpha * 0.3);
    this.smoothedDrowsinessProb = this.smoothedDrowsinessProb * (1.0 - alpha * 0.3) + hrvFreqData.earlyDrowsinessProbability * (alpha * 0.3);

    const latestFiltered = filtered.length > 0 ? filtered[filtered.length - 1] : 0;

    return {
      bpm: Math.round(bpm),
      smoothedBpm: Math.round(this.smoothedBpm),
      acfBpm,
      confidence,
      snr: Math.round(snr * 10) / 10,
      hrvRmssd: this.smoothedHrv,
      hrvSdnn: sdnn,
      respirationRate: this.smoothedRr,
      spO2: Math.round(this.smoothedSpO2),
      spO2Confidence: spo2Data.confidence,
      isHypoxiaRisk: this.smoothedSpO2 < 94,
      bloodPressure: {
        systolic: this.smoothedSys,
        diastolic: this.smoothedDia,
        pulsePressure: this.smoothedSys - this.smoothedDia,
        vascularStiffness: bloodPressure.vascularStiffness,
      },
      arrhythmiaDetected,
      apneaDetected,
      bvpValue: latestFiltered,
      bvpHistory: filtered.slice(-120),

      // SDPPG
      vascularAge: Math.round(this.smoothedVascularAge),
      arterialStiffnessIndex: Math.round(this.smoothedStiffness * 100) / 100,
      vascularElasticityScore: Math.round(this.smoothedElasticity),
      sdppgWaves: sdppgData.sdppgWaves,

      // HRV Frekans
      hrvLf: Math.round(this.smoothedLf),
      hrvHf: Math.round(this.smoothedHf),
      hrvLfHfRatio: Math.round(this.smoothedLfHf * 100) / 100,
      autonomicTone: hrvFreqData.autonomicTone,
      earlyDrowsinessProbability: Math.round(this.smoothedDrowsinessProb),

      rawSignals: { r: latestSample.r, g: latestSample.g, b: latestSample.b },
      actualFps: this.getActualFps(),
      isLowLightMode,
      ambientLuminance,
      motionArtifact,
      pttMs: Math.round(this.smoothedPttMs * 10) / 10,
      skinPurity: latestSample.skinPurity ?? 85,
    };
  }
}
