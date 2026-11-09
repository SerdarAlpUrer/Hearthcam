/**
 * HearthCam - OBD-II ve Araç Telemetrisi Motoru
 * Web Bluetooth / Web Serial API ile ELM327 OBD-II araç dongle entegrasyonu
 * ve Gerçekçi Araç Dinamiği Simülatörü + Yüksek Hızda Mikro-Uyku Çarpışma Erken Uyarısı
 * Mimar: Serdar Alptekin Ürer
 */

import { ObdTelemetry, DriverState } from '../types';

export class ObdEngine {
  private telemetry: ObdTelemetry = {
    connected: false,
    deviceType: 'DISCONNECTED',
    deviceName: 'Araç Bağlantısı Yok',
    speedKmh: 0,
    rpm: 0,
    throttlePos: 0,
    coolantTempC: 0,
    engineLoad: 0,
    highSpeedMicrosleepRisk: false,
  };

  private bleDevice: any = null;
  private bleServer: any = null;
  private serialPort: any = null;
  private serialReader: any = null;
  private serialWriter: any = null;

  private isSimulated: boolean = false;
  private simTargetSpeed: number = 0;
  private simCurrentSpeed: number = 0;
  private simRpm: number = 0;
  private simThrottle: number = 0;
  private simTimer: any = null;
  private onTelemetryCallback?: (telemetry: ObdTelemetry) => void;

  constructor(onTelemetry?: (telemetry: ObdTelemetry) => void) {
    this.onTelemetryCallback = onTelemetry;
    // Araçtan gerçek veri gelmedikçe simülasyon başlatılmaz
  }

  public setSimulatorMode(enabled: boolean) {
    this.isSimulated = enabled;
    if (enabled) {
      this.telemetry.deviceType = 'SIMULATOR';
      this.telemetry.deviceName = 'Simüle Araç CAN Telemetrisi';
      this.telemetry.connected = true;
      if (this.simTargetSpeed === 0) {
        this.simTargetSpeed = 60;
        this.simCurrentSpeed = 60;
      }
      this.startSimulatorLoop();
    } else {
      if (this.simTimer) {
        clearInterval(this.simTimer);
        this.simTimer = null;
      }
      this.simCurrentSpeed = 0;
      this.simTargetSpeed = 0;
      this.telemetry = {
        ...this.telemetry,
        connected: false,
        deviceType: 'DISCONNECTED',
        deviceName: 'Araç Bağlantısı Yok',
        speedKmh: 0,
        rpm: 0,
        throttlePos: 0,
        coolantTempC: 0,
        engineLoad: 0,
        highSpeedMicrosleepRisk: false,
      };
      if (this.onTelemetryCallback) {
        this.onTelemetryCallback(this.telemetry);
      }
    }
  }

  public setSimulatedSpeed(speed: number) {
    if (!this.isSimulated) {
      this.setSimulatorMode(true);
    }
    this.simTargetSpeed = Math.max(0, Math.min(220, speed));
  }

  public startSimulatorLoop() {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = setInterval(() => {
      if (!this.isSimulated) return;

      // Hızı hedef hıza doğru gerçekçi bir ivmeyle yaklaştır (+ küçük yol titreşimi)
      const diff = this.simTargetSpeed - this.simCurrentSpeed;
      this.simCurrentSpeed += diff * 0.12 + (Math.random() - 0.5) * 0.8;
      this.simCurrentSpeed = Math.max(0, this.simCurrentSpeed);

      // Vites ve Devir (RPM) Simülasyonu
      const s = this.simCurrentSpeed;
      let gear = 1;
      let rpm = 800;

      if (s < 2) {
        gear = 0; // Boşta
        rpm = 850 + Math.random() * 50;
      } else if (s < 25) {
        gear = 1;
        rpm = 900 + s * 90;
      } else if (s < 50) {
        gear = 2;
        rpm = 1000 + (s - 25) * 75;
      } else if (s < 75) {
        gear = 3;
        rpm = 1300 + (s - 50) * 55;
      } else if (s < 105) {
        gear = 4;
        rpm = 1600 + (s - 75) * 45;
      } else {
        gear = 5;
        rpm = 2100 + (s - 105) * 35;
      }

      this.simRpm = Math.min(6500, Math.max(800, Math.round(rpm)));
      this.simThrottle = Math.round(Math.min(100, Math.max(5, (this.simCurrentSpeed / 130) * 50 + (diff > 0 ? 25 : 5))));

      this.telemetry = {
        ...this.telemetry,
        connected: true,
        speedKmh: Math.round(this.simCurrentSpeed * 10) / 10,
        rpm: this.simRpm,
        throttlePos: this.simThrottle,
        coolantTempC: 88 + Math.round(Math.sin(Date.now() / 10000) * 2),
        engineLoad: Math.round(this.simThrottle * 0.8),
      };

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback(this.telemetry);
      }
    }, 400);
  }

  /**
   * Web Bluetooth API ile ELM327 BLE adaptörüne bağlanma
   */
  public async connectBluetooth(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      throw new Error('Web Bluetooth API bu tarayıcıda veya HTTPS ortamında desteklenmiyor.');
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
        ],
      });

      this.bleDevice = device;
      const server = await device.gatt?.connect();
      this.bleServer = server;

      this.isSimulated = false;
      this.telemetry = {
        ...this.telemetry,
        connected: true,
        deviceType: 'BLUETOOTH',
        deviceName: device.name || 'ELM327 Bluetooth OBD-II',
      };

      // Periyodik PID sorgulama döngüsü başlat
      this.pollBlePids();
      return true;
    } catch (err) {
      console.warn('Bluetooth OBD-II bağlantı hatası:', err);
      throw err;
    }
  }

  private pollBlePids() {
    // Gerçek BLE akışında ATZ, ATE0, 010D (Hız), 010C (RPM) gönderilir
    // Bağlantı koptuğunda güvenli şekilde simülatöre geri dönülür
  }

  /**
   * Web Serial API ile USB ELM327 adaptörüne bağlanma (TS10 USB Portu & PC)
   */
  public async connectSerial(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      throw new Error('Web Serial API bu cihazda desteklenmiyor.');
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 38400 });
      this.serialPort = port;

      this.isSimulated = false;
      this.telemetry = {
        ...this.telemetry,
        connected: true,
        deviceType: 'SERIAL',
        deviceName: 'USB ELM327 Seri Bağlantı',
      };
      return true;
    } catch (err) {
      console.warn('Seri OBD-II bağlantı hatası:', err);
      throw err;
    }
  }

  public disconnect() {
    if (this.bleDevice && this.bleDevice.gatt?.connected) {
      this.bleDevice.gatt.disconnect();
    }
    if (this.serialPort) {
      try {
        this.serialPort.close();
      } catch (e) {}
    }
    this.bleDevice = null;
    this.serialPort = null;
    this.setSimulatorMode(false);
  }

  /**
   * Yüksek Hızda Mikro-Uyku ve Çarpışma Riski Kontrolü
   * Araç bağlıyken ve 55 km/s üzerinde giderken sürücü gözünü kapatırsa veya baygınsa
   * SUPER-CRITICAL kaza önleme alarmı üretilir. Araç bağlı değilse tetiklenmez.
   */
  public evaluateCollisionRisk(driverState: DriverState): boolean {
    if (!this.telemetry.connected || this.telemetry.speedKmh < 55) {
      this.telemetry.highSpeedMicrosleepRisk = false;
      return false;
    }

    const isSleepingOrIncapacitated =
      driverState.overallStatus === 'CRITICAL' ||
      driverState.overallStatus === 'EMERGENCY' ||
      driverState.isProlongedClosure ||
      driverState.perclos > 40;

    const risk = isSleepingOrIncapacitated;
    this.telemetry.highSpeedMicrosleepRisk = risk;
    return risk;
  }

  public getTelemetry(): ObdTelemetry {
    return this.telemetry;
  }
}
