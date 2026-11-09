/**
 * HearthCam - Sürücü Güvenlik Karnesi ve Seyahat Analitiği (Trip Analytics)
 * Euro NCAP & SAE J3016 Uyumlu Sürüş Emniyeti Değerlendirmesi
 * Mimar: Serdar Alptekin Ürer
 */

import { TripStats, DriverState, BiometricMetrics } from '../types';

export class TripAnalyticsEngine {
  private startTime: number = Date.now();
  private distanceKm: number = 0;
  private maxSpeedKmh: number = 0;
  private speedSum: number = 0;
  private speedSamplesCount: number = 0;

  private bpmSum: number = 0;
  private bpmSamplesCount: number = 0;

  private perclosSum: number = 0;
  private perclosSamplesCount: number = 0;

  private totalBlinks: number = 0;
  private totalYawns: number = 0;
  private phoneDistractions: number = 0;
  private roadRageEvents: number = 0;
  private microsleepEvents: number = 0;
  private smokingOrEatingEvents: number = 0;

  private prevPhoneDistracted: boolean = false;
  private prevProlongedClosure: boolean = false;
  private prevRoadRage: boolean = false;
  private prevSmoking: boolean = false;
  private lastDistanceUpdateTime: number = Date.now();

  constructor() {
    this.resetTrip();
  }

  public resetTrip() {
    this.startTime = Date.now();
    this.distanceKm = 0;
    this.maxSpeedKmh = 0;
    this.speedSum = 0;
    this.speedSamplesCount = 0;
    this.bpmSum = 0;
    this.bpmSamplesCount = 0;
    this.perclosSum = 0;
    this.perclosSamplesCount = 0;
    this.totalBlinks = 0;
    this.totalYawns = 0;
    this.phoneDistractions = 0;
    this.roadRageEvents = 0;
    this.microsleepEvents = 0;
    this.smokingOrEatingEvents = 0;
    this.lastDistanceUpdateTime = Date.now();
  }

  public update(driverState: DriverState, biometrics: BiometricMetrics, currentSpeedKmh: number) {
    const now = Date.now();

    // Kat edilen mesafeyi ve hareket hızını entegre et (km = hız * saat)
    const dtHours = (now - this.lastDistanceUpdateTime) / (1000 * 3600);
    this.lastDistanceUpdateTime = now;
    if (currentSpeedKmh > 1) {
      this.distanceKm += currentSpeedKmh * dtHours;
      if (currentSpeedKmh > this.maxSpeedKmh) {
        this.maxSpeedKmh = currentSpeedKmh;
      }
      this.speedSum += currentSpeedKmh;
      this.speedSamplesCount++;
    }

    if (biometrics.smoothedBpm > 0) {
      this.bpmSum += biometrics.smoothedBpm;
      this.bpmSamplesCount++;
    }

    this.perclosSum += driverState.perclos;
    this.perclosSamplesCount++;

    this.totalBlinks = driverState.blinkCount;
    this.totalYawns = driverState.yawnCount;

    // Olay geçişlerini (Edge Trigger) say
    if (driverState.phoneDistractionDetected && !this.prevPhoneDistracted) {
      this.phoneDistractions++;
    }
    this.prevPhoneDistracted = driverState.phoneDistractionDetected;

    if (driverState.isProlongedClosure && !this.prevProlongedClosure) {
      this.microsleepEvents++;
    }
    this.prevProlongedClosure = driverState.isProlongedClosure;

    if (driverState.roadRageDetected && !this.prevRoadRage) {
      this.roadRageEvents++;
    }
    this.prevRoadRage = driverState.roadRageDetected;

    if (driverState.isSmokingOrEating && !this.prevSmoking) {
      this.smokingOrEatingEvents++;
    }
    this.prevSmoking = driverState.isSmokingOrEating;
  }

  public getStats(): TripStats {
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    const avgSpeed = this.speedSamplesCount > 0 ? this.speedSum / this.speedSamplesCount : 0;
    const avgBpm = this.bpmSamplesCount > 0 ? Math.round(this.bpmSum / this.bpmSamplesCount) : 72;
    const avgPerclos = this.perclosSamplesCount > 0 ? Math.round(this.perclosSum / this.perclosSamplesCount) : 0;

    // Euro NCAP Emniyet Skoru Hesabı (100 puan üzerinden)
    let score = 100;
    score -= this.microsleepEvents * 18;
    score -= this.phoneDistractions * 6;
    score -= this.roadRageEvents * 8;
    score -= this.smokingOrEatingEvents * 4;
    score -= Math.max(0, (avgPerclos - 12) * 1.5);
    score -= Math.max(0, (this.totalYawns - 1) * 3);

    const safetyScore = Math.max(15, Math.min(100, Math.round(score)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (safetyScore >= 95) grade = 'A+';
    else if (safetyScore >= 85) grade = 'A';
    else if (safetyScore >= 75) grade = 'B';
    else if (safetyScore >= 65) grade = 'C';
    else if (safetyScore >= 50) grade = 'D';
    else grade = 'F';

    // Dinamik Mola Tavsiyesi: 2 saat (120 dk) baz alınır, yorgunluk arttıkça kısalır
    let breakMinutes = 120 - Math.round(durationSeconds / 60);
    if (safetyScore < 70 || this.totalYawns >= 3 || this.microsleepEvents >= 1) {
      breakMinutes = Math.min(breakMinutes, 10);
    } else if (safetyScore < 85) {
      breakMinutes = Math.min(breakMinutes, 35);
    }
    const recommendedBreakInMinutes = Math.max(0, breakMinutes);

    return {
      startTime: this.startTime,
      durationSeconds,
      distanceKm: Math.round(this.distanceKm * 10) / 10,
      avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
      maxSpeedKmh: Math.round(this.maxSpeedKmh * 10) / 10,
      avgBpm,
      avgPerclos,
      totalBlinks: this.totalBlinks,
      totalYawns: this.totalYawns,
      phoneDistractions: this.phoneDistractions,
      roadRageEvents: this.roadRageEvents,
      microsleepEvents: this.microsleepEvents,
      smokingOrEatingEvents: this.smokingOrEatingEvents,
      safetyScore,
      grade,
      recommendedBreakInMinutes,
    };
  }
}
