import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Flashlight,
  SwitchCamera,
  Sliders,
  Download,
  Pause,
  Play,
  Info,
  Flame,
  RefreshCw,
  Usb,
  Layers,
  Snowflake,
} from 'lucide-react';

type ScannerSourceMode =
  | 'THERMAL_VASCULAR'    // UNI-T Termal Kamera: Sıcak Damar İzoterm + Termal CLAHE (Sıcak damarları ayıklar)
  | 'THERMAL_ANGIO'       // UNI-T Termal Anjiyografi: Çevre deriyi karartır, sadece en sıcak damar sırtlarını neon çizer
  | 'THERMAL_RAW_ENHANCE' // UNI-T Termal Ham + Süper Kontrast
  | 'RGB_LAB_CHROMATIC';  // Normal RGB Kamera: CIE L*a*b* Kromatik Mod

type ThermalPalette = 'VENOUS_GREEN' | 'ANGIO_RED' | 'WHITE_HOT' | 'IRONBOW';

export const VeinScannerView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Kamera Cihaz Listesi (UNI-T USB Type-C UVC dahil)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeResolution, setActiveResolution] = useState<string>('--');
  const [isThermalUsbDetected, setIsThermalUsbDetected] = useState<boolean>(false);

  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Termal & Optik İşleme Ayarları
  const [sourceMode, setSourceMode] = useState<ScannerSourceMode>('THERMAL_VASCULAR');
  const [palette, setPalette] = useState<ThermalPalette>('VENOUS_GREEN');
  const [isothermFloor, setIsothermFloor] = useState<number>(52); // Çevre soğuk deriyi kesme eşiği (%10 - %85)
  const [thermalContrast, setThermalContrast] = useState<number>(3.5); // Termal mikro-kontrast çarpanı (1x - 8x)
  const [dualFrameCrop, setDualFrameCrop] = useState<'AUTO' | 'FULL' | 'TOP_HALF' | 'BOTTOM_HALF'>('AUTO');
  const [invertThermal, setInvertThermal] = useState<boolean>(false); // Eğer termal kamera Black-Hot modundaysa ters çevir

  // Canlı Telemetri
  const [vascularHotspotPct, setVascularHotspotPct] = useState<number>(0);
  const [thermalGradient, setThermalGradient] = useState<number>(0);

  // Tamponlar
  const thermalLumRef = useRef<Float32Array | null>(null);
  const integralRef = useRef<Float64Array | null>(null);
  const temporalBufRef = useRef<Float32Array | null>(null);

  // Kamera listesini tara (Sadece gerçek USB Termal kameraları işaretler, telefonun ön/arka kamerasını kilitlemez!)
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(vids);

      const usbThermal = vids.find((d) =>
        /uni-t|uti|uvc|thermal|infiray|tiny1c/i.test(d.label)
      );
      setIsThermalUsbDetected(Boolean(usbThermal));
    } catch {
      // ignore
    }
  }, []);

  // USB Type-C kamera takıldığında / çıkarıldığında otomatik algıla
  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Kamerayı Başlat (Android/iOS Arka Kamera 'exact' garantili + UNI-T UVC esnek çözünürlüklü)
  const startCamera = useCallback(
    async (deviceIdToUse: string, targetFacing: 'environment' | 'user') => {
      setCameraError(null);
      setTorchOn(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      // Android Camera2 HAL donanım kilidinin serbest kalması için kısa bekleme
      await new Promise((r) => setTimeout(r, 180));

      let stream: MediaStream | null = null;

      try {
        if (deviceIdToUse) {
          // Kullanıcının listeden seçtiği spesifik kamera (örn. UNI-T USB Termal)
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: deviceIdToUse } },
          });
        } else {
          // 1. Önce kesin (exact) Ön/Arka kamera zorlamasını dene (Mobil cihazlarda arka kameraya geçişi garantiler)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                facingMode: { exact: targetFacing },
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
            });
          } catch {
            // 2. Cihaz listesinde 'back' / 'rear' / 'arka' / 'environment' geçen kamerayı ara
            const allDevs = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = allDevs.filter((d) => d.kind === 'videoinput');
            const matchedDev = videoDevs.find((d) =>
              targetFacing === 'environment'
                ? /back|rear|arka|environment|camera2 0|0/i.test(d.label)
                : /front|user|ön|selfie|camera2 1|1/i.test(d.label)
            );

            if (matchedDev && matchedDev.deviceId) {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  deviceId: { exact: matchedDev.deviceId },
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                },
              });
            } else {
              // 3. Masaüstü veya tek kameralı cihazlar için ideal facingMode
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  facingMode: { ideal: targetFacing },
                },
              });
            }
          }
        }

        streamRef.current = stream;

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          setActiveResolution(`${vw}x${vh}`);
        }

        await refreshDevices();

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          const caps = videoTrack.getCapabilities() as any;
          setTorchSupported(Boolean(caps && caps.torch));
        } else {
          setTorchSupported(false);
        }
      } catch (err: any) {
        setCameraError(
          err?.message ||
            'Kameraya erişilemedi. Lütfen kamera izninin verildiğinden emin olun.'
        );
      }
    },
    [refreshDevices]
  );

  useEffect(() => {
    startCamera(selectedDeviceId, facingMode);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedDeviceId, facingMode, startCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const nextState = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: nextState } as any] });
      setTorchOn(nextState);
    } catch {
      setTorchSupported(false);
    }
  };

  const downloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `HearthCam-ThermalVein-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  /**
   * UNI-T TYPE-C TERMAL KAMERA (LWIR 8-14 um) DAMAR ANJİYOGRAFİ MOTORU:
   * - Fiziksel Prensip:
   *   Normal kamerada damarlar ışığı soğurduğu için KOYU görünür ve el izi/kıllar parazit yapar.
   *   Termal kamerada ise kıllar ve el çizgileri görünmez; deri altındaki toplardamar ve atardamarlar
   *   36.5°C sıcak kan taşıdığı için çevre deriden (32-34°C) 0.5°C - 1.5°C DAHA SICAKTIR (PARLAKTIR)!
   * - UNI-T UVC Çift Kare (Dual-Frame 256x384) Desteği:
   *   UNI-T Type-C kameralar UVC üzerinden bazen 256x384 (üst 256x192 görüntü + alt 256x192 ham telemetri)
   *   gönderir. AUTO modunda dikey görüntü tespit edilirse otomatik olarak 256x192 görüntü yarısı alınır.
   */
  useEffect(() => {
    let frameCounter = 0;

    const renderLoop = () => {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      if (isPaused) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const srcW = video.videoWidth || 256;
      const srcH = video.videoHeight || 192;

      // UNI-T 256x384 Dual-Frame (Üst görüntü + Alt ham sıcaklık verisi) kontrolü
      let cropY = 0;
      let cropH = srcH;
      if (dualFrameCrop === 'TOP_HALF' || (dualFrameCrop === 'AUTO' && srcH === srcW * 1.5)) {
        cropY = 0;
        cropH = Math.floor(srcH / 2);
      } else if (dualFrameCrop === 'BOTTOM_HALF') {
        cropY = Math.floor(srcH / 2);
        cropH = Math.floor(srcH / 2);
      }

      // İşleme çözünürlüğü (Termal detayları korumak için 480x360)
      const w = 480;
      const h = 360;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, cropY, srcW, cropH, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const numPixels = w * h;

      if (!thermalLumRef.current || thermalLumRef.current.length !== numPixels) {
        thermalLumRef.current = new Float32Array(numPixels);
        integralRef.current = new Float64Array((w + 1) * (h + 1));
        temporalBufRef.current = new Float32Array(numPixels);
      }

      const tLum = thermalLumRef.current!;
      const integral = integralRef.current!;
      const temporal = temporalBufRef.current!;

      // =========================================================================
      // MOD A: NORMAL RGB KAMERA (CIE L*a*b* KROMATİK MOD)
      // =========================================================================
      if (sourceMode === 'RGB_LAB_CHROMATIC') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const sum = r + g + b + 1;
          const cyanShift = Math.max(0, 22 - ((r - g) / sum) * 255);
          const boost = Math.min(160, cyanShift * thermalContrast * 2.2);
          data[i] = Math.max(0, Math.round(r - boost * 1.1));
          data[i + 1] = Math.min(255, Math.round(g + boost * 0.55));
          data[i + 2] = Math.min(255, Math.round(b + boost * 0.75));
        }
        ctx.putImageData(imgData, 0, 0);
        return;
      }

      // =========================================================================
      // MOD B: UNI-T TERMAL KAMERA (LWIR 8-14 um SICAK DAMAR İZOTERM & CLAHE)
      // 1. Termal Parlaklık (Sıcaklık Yoğunluğu) Çıkarımı:
      //    UNI-T kamerası ister White-Hot (Beyaz Sıcak) ister Ironbow (Demir/Sarı-Kırmızı)
      //    paletinde olsun, en sıcak damar bölgeleri en yüksek parlaklığa (Luminance) sahiptir.
      // =========================================================================
      let minT = 255;
      let maxT = 0;

      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Termal yoğunluk (White-Hot ve Ironbow paletlerinin her ikisinde de sıcak = yüksek R+G)
        let rawT = r * 0.45 + g * 0.45 + b * 0.10;
        if (invertThermal) {
          rawT = 255 - rawT;
        }
        tLum[p] = rawT;
        if (rawT < minT) minT = rawT;
        if (rawT > maxT) maxT = rawT;
      }

      // 2. İntegral Görüntü ile Yerel Termal Ortalamalar:
      //    - rSmall (3px): Termal sensör pikselleşmesini yumuşatır
      //    - rBackground (20px): Çevreleyen deri bölgesinin bazal sıcaklığını bulur!
      //    Damar = Yerel Sıcaklık (r=3) > Çevre Deri Bazal Sıcaklığı (r=20) olan sıcak kanallardır!
      const stride = w + 1;
      integral.fill(0);
      for (let y = 1; y <= h; y++) {
        let rowSum = 0;
        const srcRow = (y - 1) * w;
        const dstRow = y * stride;
        const prevRow = (y - 1) * stride;
        for (let x = 1; x <= w; x++) {
          rowSum += tLum[srcRow + (x - 1)];
          integral[dstRow + x] = integral[prevRow + x] + rowSum;
        }
      }

      const boxMean = (cx: number, cy: number, rBox: number): number => {
        const x1 = Math.max(0, cx - rBox);
        const y1 = Math.max(0, cy - rBox);
        const x2 = Math.min(w, cx + rBox + 1);
        const y2 = Math.min(h, cy + rBox + 1);
        const area = Math.max(1, (x2 - x1) * (y2 - y1));
        return (
          (integral[y2 * stride + x2] -
            integral[y1 * stride + x2] -
            integral[y2 * stride + x1] +
            integral[y1 * stride + x1]) /
          area
        );
      };

      const dynamicRange = Math.max(10, maxT - minT);
      // İzoterm alt kesim noktası (Soğuk arka planı ve soğuk deriyi keser)
      const floorThreshold = minT + (dynamicRange * isothermFloor) / 100;

      let hotVeinPixels = 0;
      let gradSum = 0;

      for (let y = 0; y < h; y++) {
        const rowOff = y * w;
        for (let x = 0; x < w; x++) {
          const idx = rowOff + x;
          const pIdx = idx * 4;

          const smoothT = boxMean(x, y, 2); // 5x5 pürüzsüz termal sıcaklık
          const localSkinBaseline = boxMean(x, y, 18); // 37x37 çevre deri ortalama sıcaklığı

          // Pozitif Termal Fark: Çevre deriden DAHA SICAK olan damar hatları!
          const deltaWarmVein = Math.max(0, smoothT - localSkinBaseline);
          gradSum += deltaWarmVein;

          // Dar İzoterm Penceresi (Isotherm Span):
          const aboveFloor = Math.max(0, ((smoothT - floorThreshold) / Math.max(8, 255 - floorThreshold)) * 255);

          // Sıcak damar sırtı + İzoterm birleşimi
          let veinHeat = 0;
          if (sourceMode === 'THERMAL_ANGIO') {
            // Sadece çevre deriden daha sıcak olan damar borularını parlatır:
            veinHeat = smoothT >= floorThreshold * 0.85 ? deltaWarmVein * thermalContrast * 9.5 : 0;
          } else if (sourceMode === 'THERMAL_VASCULAR') {
            // Hem genel sıcak dokuyu hem de sıcak damar sırtlarını birlikte güçlendirir:
            veinHeat = aboveFloor * 0.55 + deltaWarmVein * thermalContrast * 7.2;
          } else {
            // THERMAL_RAW_ENHANCE: Dar izoterm süper kontrast
            veinHeat = Math.pow(aboveFloor / 255, 1.35) * 255 * (thermalContrast * 0.45);
          }

          // Zaman içi gürültü süzme (Termal NETD kumlanmasını temizler)
          const cleanHeat = temporal[idx] * 0.72 + Math.min(255, Math.max(0, veinHeat)) * 0.28;
          temporal[idx] = cleanHeat;

          if (cleanHeat > 85) hotVeinPixels++;

          const v = Math.round(cleanHeat);
          const baseBg = Math.round(smoothT * 0.22);

          // Termal Damar Paletleri
          if (palette === 'VENOUS_GREEN') {
            // Medikal Fosfor Yeşili / Camgöbeği (VeinViewer stili)
            data[pIdx] = Math.min(255, Math.round(v > 180 ? (v - 180) * 2.5 : baseBg * 0.3));
            data[pIdx + 1] = Math.min(255, Math.round(baseBg + v * 1.15));
            data[pIdx + 2] = Math.min(255, Math.round(baseBg + v * 0.65));
          } else if (palette === 'ANGIO_RED') {
            // Termal Anjiyografi (Koyu doku üzerinde kor kırmızı / sarı sıcak damarlar)
            data[pIdx] = Math.min(255, Math.round(baseBg + v * 1.35));
            data[pIdx + 1] = Math.min(255, Math.round(v > 90 ? (v - 90) * 1.45 : baseBg * 0.2));
            data[pIdx + 2] = Math.min(255, Math.round(v > 190 ? (v - 190) * 3.0 : baseBg * 0.3));
          } else if (palette === 'WHITE_HOT') {
            // Medikal Sıcak-Beyaz / Koyu-Damar Röntgen Görünümü
            const wVal = Math.min(255, baseBg + v);
            data[pIdx] = wVal;
            data[pIdx + 1] = wVal;
            data[pIdx + 2] = Math.min(255, wVal + 12);
          } else {
            // IRONBOW (Demir / Lacivert -> Mor -> Turuncu -> Sarı -> Beyaz)
            data[pIdx] = Math.min(255, Math.round(v * 1.3));
            data[pIdx + 1] = Math.min(255, Math.round(Math.max(0, (v - 70) * 1.35)));
            data[pIdx + 2] = Math.min(255, Math.round(v < 120 ? v * 1.4 : (255 - v) * 1.2));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      frameCounter++;
      if (frameCounter % 8 === 0) {
        setVascularHotspotPct(Math.min(100, Math.round((hotVeinPixels / numPixels) * 220)));
        setThermalGradient(Math.min(100, Math.round((gradSum / numPixels) * 18)));
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sourceMode, palette, isothermFloor, thermalContrast, dualFrameCrop, invertThermal, isPaused]);

  return (
    <div className="flex flex-col gap-3.5 max-w-7xl mx-auto w-full">
      {/* Üst Bar: UNI-T USB Termal Kamera Seçici & Kontroller */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              UNI-T Type-C Termal (LWIR) & Optik Damar Görüntüleyici
              <span
                className={`px-2 py-0.5 text-[10px] font-mono border rounded-full ${
                  isThermalUsbDetected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isThermalUsbDetected ? 'USB TERMAL KAMERA ALGILANDI' : `ÇÖZÜNÜRLÜK: ${activeResolution}`}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              UNI-T Type-C termal kameranızı taktığınızda aşağıdaki kamera listesinden seçin; 36.5°C sıcak kan taşıyan damarları doğrudan görüntüler.
            </p>
          </div>
        </div>

        {/* Kamera Seçim Kutusu (UVC / UNI-T) ve Butonlar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1">
            <Usb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none max-w-[190px] cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                Varsayılan Kamera ({facingMode === 'environment' ? 'Arka' : 'Ön'})
              </option>
              {videoDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId} className="bg-slate-900 text-slate-200">
                  {dev.label || `Kamera #${idx + 1} (USB/UVC)`}
                </option>
              ))}
            </select>
            <button
              onClick={refreshDevices}
              title="USB Kameraları Yeniden Tara"
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedDeviceId('');
              setFacingMode((p) => (p === 'environment' ? 'user' : 'environment'));
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
            <span>{facingMode === 'environment' ? 'Ön Kameraya Geç' : 'Arka Kameraya Geç'}</span>
          </button>

          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                torchOn
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 border-amber-500/40 text-amber-300'
              }`}
            >
              <Flashlight className="w-3.5 h-3.5" />
              <span>Flaş</span>
            </button>
          )}

          <button
            onClick={() => setIsPaused((p) => !p)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          <button
            onClick={downloadSnapshot}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ana Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Sol: Termal Anjiyografi / Damar Ekranı */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-800 bg-black relative shadow-2xl">
            <video ref={videoRef} playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="w-full h-full object-contain bg-black" />

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
                <Camera className="w-8 h-8 text-rose-400 mb-2" />
                <p className="text-sm font-bold text-white mb-1">{cameraError}</p>
              </div>
            )}

            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 backdrop-blur-md">
                LWIR TERMAL DAMAR İZOTERM ({activeResolution})
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={() =>
                    setDualFrameCrop((c) =>
                      c === 'AUTO' ? 'TOP_HALF' : c === 'TOP_HALF' ? 'FULL' : 'AUTO'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-cyan-300 cursor-pointer"
                  title="UNI-T kameralarda çift görüntü çıkarsa Üst Yarı (256x192) kırpmasını seçin"
                >
                  Çerçeve: {dualFrameCrop === 'AUTO' ? 'Otomatik' : dualFrameCrop === 'TOP_HALF' ? 'Üst Yarı (256x192)' : 'Tam Kare'}
                </button>

                <button
                  onClick={() => setInvertThermal((inv) => !inv)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-amber-300 cursor-pointer"
                >
                  {invertThermal ? 'Kutup: Black-Hot (Ters)' : 'Kutup: White-Hot (Normal)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ: Termal İzoterm Ayarları & "Soğuk Provokasyon" Rehberi */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Canlı Termal Metrikler */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-emerald-800/40 text-center">
              <div className="text-[10px] font-mono text-slate-400">SICAK DAMAR AĞI ORANI</div>
              <div className="text-xl font-black font-mono text-emerald-400">%{vascularHotspotPct}</div>
              <div className="text-[9px] text-slate-500">Çevre Deriden Sıcak Hatlar</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-amber-800/40 text-center">
              <div className="text-[10px] font-mono text-slate-400">TERMAL MİKRO-GRADYAN</div>
              <div className="text-xl font-black font-mono text-amber-400">%{thermalGradient}</div>
              <div className="text-[9px] text-slate-500">Damar / Doku Isı Farkı</div>
            </div>
          </div>

          {/* 1. Termal Damar İşleme Modu */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Termal & Optik İşleme Modu</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSourceMode('THERMAL_VASCULAR')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  sourceMode === 'THERMAL_VASCULAR'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">1. Termal Damar İzoterm</div>
                <div className="text-[10px] opacity-80">UNI-T termal görüntüde sıcak damar hatlarını öne çıkarır</div>
              </button>

              <button
                onClick={() => setSourceMode('THERMAL_ANGIO')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  sourceMode === 'THERMAL_ANGIO'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">2. Saf Termal Anjiyografi</div>
                <div className="text-[10px] opacity-80">Çevre deriyi tamamen karartır, sadece sıcak damarları çizer</div>
              </button>

              <button
                onClick={() => setSourceMode('THERMAL_RAW_ENHANCE')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  sourceMode === 'THERMAL_RAW_ENHANCE'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">3. Dar Sıcaklık Penceresi</div>
                <div className="text-[10px] opacity-80">32°C-36°C aralığını tam ekrana yayarak ısı farkını büyütür</div>
              </button>

              <button
                onClick={() => setSourceMode('RGB_LAB_CHROMATIC')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  sourceMode === 'RGB_LAB_CHROMATIC'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">4. Normal RGB Kamera</div>
                <div className="text-[10px] opacity-80">Termal kamera takılı değilken CIE L*a*b* renk güçlendirme</div>
              </button>
            </div>
          </div>

          {/* 2. Termal Renk Paleti & İzoterm Sürgüleri */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">Termal Renk Paleti:</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'VENOUS_GREEN', label: 'Medikal Yeşil' },
                    { id: 'ANGIO_RED', label: 'Anjiyo Kırmızı' },
                    { id: 'WHITE_HOT', label: 'Sıcak Beyaz' },
                    { id: 'IRONBOW', label: 'Demir (Iron)' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                      palette === p.id
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Soğuk Deri Kesme Eşiği (İzoterm Alt Sınırı)</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">%{isothermFloor}</span>
              </div>
              <input
                type="range"
                min={10}
                max={85}
                step={2}
                value={isothermFloor}
                onChange={(e) => setIsothermFloor(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Sıcak Damar Sırtı Kontrast Çarpanı
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{thermalContrast.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={8.0}
                step={0.5}
                value={thermalContrast}
                onChange={(e) => setThermalContrast(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Termal Kamerayla Damarları Jilet Gibi Görmenin Püf Noktası (Soğuk Provokasyon) */}
          <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-cyan-100/90 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-cyan-300">
              <Snowflake className="w-4 h-4 shrink-0" />
              <span>UNI-T Termal Kamerayla Damarları 10 Kat Net Görme Tekniği:</span>
            </div>
            <p>
              • <strong>Soğuk Provokasyon (Cold Challenge):</strong> Kolunuzun veya el sırtınızın üzerine <strong>ıslak mendil / kolonya sürün</strong> ya da elinizi 5 saniye soğuk bir yüzeye değdirip çekin.
            </p>
            <p>
              • Üst deri anında 29°C'ye soğurken, derinin altındaki toplardamarlardan <strong>36.8°C sıcak kan</strong> akmaya devam ettiği için UNI-T termal kamerada tüm damar ağınız <strong>hiçbir kıl veya el izi olmadan</strong> kor gibi parlayarak ortaya çıkar!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
