import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { ROI_LANDMARKS, RoiExtractor } from '../engine/roiExtractor';
import { BlendshapeScore } from '../engine/driverMonitor';
import { ROIBox, AppSettings } from '../types';

interface VideoFeedProps {
  settings: AppSettings;
  onRgbSample: (
    sample: {
      r: number;
      g: number;
      b: number;
      foreheadG?: number;
      cheekG?: number;
      skinPurity?: number;
    },
    activeRois: ROIBox[]
  ) => void;
  onLandmarks: (landmarks: { x: number; y: number; z: number }[], blendshapes: BlendshapeScore[]) => void;
  fps: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  settings,
  onRgbSample,
  onLandmarks,
  fps,
  onCanvasReady,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const roiExtractorRef = useRef<RoiExtractor>(new RoiExtractor());
  const animationFrameIdRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Performans optimizasyonu: Yüz tespitini her karede çalıştırmak yerine 90ms'de bir (11 Hz) çalıştır.
  // Geri kalan tüm karelerde (30-60 FPS) doğrudan RGB sinyalini oku!
  const lastLandmarkDetectionTimeRef = useRef<number>(0);
  const cachedLandmarksRef = useRef<{ x: number; y: number; z: number }[] | null>(null);
  const cachedBlendshapesRef = useRef<BlendshapeScore[]>([]);
  const cachedRoiBoxesRef = useRef<any>(null);

  // 1. Kameraları Listele
  useEffect(() => {
    async function getCameras() {
      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDevice) {
          setSelectedDevice(videoDevs[0].deviceId);
        }
      } catch (err) {
        console.error('Kamera listesi alınamadı:', err);
      }
    }
    getCameras();
  }, [selectedDevice]);

  // 2. MediaPipe FaceLandmarker Başlat (Mobil Uyumlu & Bellek Sızıntısı Korumalı)
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        setIsLoadingModel(true);
        setModelError(null);

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        if (isCancelled) return;

        // Mobilde (Android / iOS) WebGL bellek sızıntısını ve kilitlenmeyi önlemek için CPU SIMD tercih et
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const preferredDelegate = isMobile ? 'CPU' : 'GPU';

        let landmarker: FaceLandmarker;
        try {
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: preferredDelegate,
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });
        } catch (e) {
          console.warn('Tercih edilen MediaPipe delegesi açılamadı, CPU deneniyor:', e);
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });
        }

        if (isCancelled) return;

        faceLandmarkerRef.current = landmarker;
        setIsLoadingModel(false);
      } catch (err: any) {
        console.error('MediaPipe yüklenemedi:', err);
        if (!isCancelled) {
          setModelError('Yapay zeka modeli yüklenemedi.');
          setIsLoadingModel(false);
        }
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  // 3. Kamera Başlat
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDevice
          ? {
              deviceId: { exact: selectedDevice },
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30, min: 24 },
            }
          : {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30, min: 24 },
              facingMode: 'user',
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Kamera Otomatik Pozlama ve Beyaz Dengesini Kilitleme Girişimi
      const track = stream.getVideoTracks()[0];
      if (track && 'getCapabilities' in track) {
        try {
          const capabilities = (track as any).getCapabilities();
          const advancedConstraints: any = {};
          if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
            advancedConstraints.exposureMode = 'continuous';
          }
          if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
            advancedConstraints.whiteBalanceMode = 'continuous';
          }
          if (Object.keys(advancedConstraints).length > 0) {
            await (track as any).applyConstraints({ advanced: [advancedConstraints] });
          }
        } catch (e) {
          console.warn('Donanımsal kamera pozlama kilidi uygulanamadı:', e);
        }
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraActive(true);
      if (canvasRef.current && onCanvasReady) {
        onCanvasReady(canvasRef.current);
      }
    } catch (err: any) {
      console.error('Kamera başlatılamadı:', err);
      setModelError('Kamera erişim izni reddedildi veya kamera kullanımda.');
      setIsCameraActive(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (!isLoadingModel && !modelError && !isCameraActive) {
      startCamera();
    }
  }, [isLoadingModel, modelError, isCameraActive, startCamera]);

  // 4. Ultra Yüksek FPS ve Düşük Gecikmeli Render Döngüsü
  useEffect(() => {
    if (!isCameraActive || isLoadingModel || !faceLandmarkerRef.current) return;

    let lastVideoTime = -1;

    const renderLoop = () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const landmarker = faceLandmarkerRef.current;

        if (video && canvas && landmarker && video.readyState >= 2) {
          // Mobil cihazlarda aşırı ısınma ve donmayı önlemek için işleme çözünürlüğünü 480p'ye sabitle
          const maxDim = 480;
          const rawW = video.videoWidth || 640;
          const rawH = video.videoHeight || 480;
          let width = rawW;
          let height = rawH;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          if (!ctxRef.current || ctxRef.current.canvas !== canvas) {
            ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
          }
          const ctx = ctxRef.current;

          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);

            const currentTime = video.currentTime;
            if (currentTime !== lastVideoTime) {
              lastVideoTime = currentTime;
              const now = performance.now();

              // YÜZ TESPİTİ SEVİYESİ (Ağır Yapay Zeka Çıkarımı):
              // Her karede çalıştırmak yerine 90ms'de bir (~11 FPS) çalıştırıyoruz.
              // Zaman damgasının kesinlikle artan olduğunu garantiye alıyoruz.
              if (now - lastLandmarkDetectionTimeRef.current >= 90) {
                const safeTimestamp = Math.max(now, lastLandmarkDetectionTimeRef.current + 1);
                lastLandmarkDetectionTimeRef.current = safeTimestamp;

                try {
                  const detections = landmarker.detectForVideo(video, safeTimestamp);
                  if (detections && detections.faceLandmarks && detections.faceLandmarks.length > 0) {
                    cachedLandmarksRef.current = detections.faceLandmarks[0];
                    cachedBlendshapesRef.current = detections.faceBlendshapes && detections.faceBlendshapes.length > 0
                      ? detections.faceBlendshapes[0].categories
                      : [];

                    // ROI kutularını güncelle
                    const extractor = roiExtractorRef.current;
                    cachedRoiBoxesRef.current = {
                      forehead: extractor.getBoundingBox(ROI_LANDMARKS.forehead, cachedLandmarksRef.current, width, height, 0.15),
                      leftCheek: extractor.getBoundingBox(ROI_LANDMARKS.leftCheek, cachedLandmarksRef.current, width, height, 0.20),
                      rightCheek: extractor.getBoundingBox(ROI_LANDMARKS.rightCheek, cachedLandmarksRef.current, width, height, 0.20),
                    };

                    onLandmarks(cachedLandmarksRef.current, cachedBlendshapesRef.current);
                  } else {
                    cachedLandmarksRef.current = null;
                    cachedRoiBoxesRef.current = null;
                  }
                } catch (detectErr) {
                  // Çıkarım hatası olursa render döngüsünü ASLA durdurma, sonraki kareye devam et
                  console.warn('MediaPipe detect hatası (atlandı):', detectErr);
                }
              }

              // SİNYAL İŞLEME SEVİYESİ (Hızlı Piksel Örnekleme):
              // Yüz tespit edilirse, güncel video karesinden anında RGB örneği al (Tam Kamera FPS'inde!)
              if (cachedRoiBoxesRef.current) {
                const extractor = roiExtractorRef.current;
                const boxes = cachedRoiBoxesRef.current;

                const rois: { id: 'forehead' | 'leftCheek' | 'rightCheek'; label: string; active: boolean; box: any; color: string }[] = [
                  { id: 'forehead', label: 'ALIN ROI', active: settings.activeRois.forehead, box: boxes.forehead, color: '#06b6d4' },
                  { id: 'leftCheek', label: 'SOL YANAK ROI', active: settings.activeRois.leftCheek, box: boxes.leftCheek, color: '#10b981' },
                  { id: 'rightCheek', label: 'SAĞ YANAK ROI', active: settings.activeRois.rightCheek, box: boxes.rightCheek, color: '#ec4899' },
                ];

                const extractedRoisData = rois.map(r => {
                  if (r.active && r.box) {
                    const rgb = extractor.extractAverageRgb(ctx, r.box);
                    return { id: r.id, active: r.active, rgb };
                  }
                  return {
                    id: r.id,
                    active: false,
                    rgb: { r: 0, g: 0, b: 0, count: 0, skinPurity: 0, spatialVariance: 999 },
                  };
                });

                const fusedRgb = extractor.fuseRois(extractedRoisData);
                onRgbSample(
                  fusedRgb,
                  rois.map((r, idx) => ({
                    id: r.id,
                    label: r.label,
                    x: r.box?.x || 0,
                    y: r.box?.y || 0,
                    width: r.box?.width || 0,
                    height: r.box?.height || 0,
                    landmarkIndices: ROI_LANDMARKS[r.id],
                    color: r.color,
                    active: r.active,
                    snr: 0,
                    skinPurity: extractedRoisData[idx].rgb.skinPurity,
                    fusionWeight: fusedRgb.weights[r.id] || 0,
                  }))
                );

                // Canlı Kan Perfüzyon Isı Haritası (Spatial Perfusion Heatmap)
                if (settings.showPerfusionMap) {
                  const pulsePhase = Math.sin((now / 1000) * (Math.PI * 2 * 1.2)) * 0.5 + 0.5;
                  for (const r of rois) {
                    if (r.active && r.box) {
                      const cx = r.box.x + r.box.width / 2;
                      const cy = r.box.y + r.box.height / 2;
                      const radius = Math.max(r.box.width, r.box.height) * 0.70;

                      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
                      const alphaVal = 0.12 + pulsePhase * 0.22;
                      grad.addColorStop(0, `rgba(244, 63, 94, ${alphaVal.toFixed(2)})`);
                      grad.addColorStop(0.55, `rgba(6, 182, 212, ${(alphaVal * 0.5).toFixed(2)})`);
                      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                      ctx.save();
                      ctx.fillStyle = grad;
                      ctx.beginPath();
                      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                      ctx.fill();
                      ctx.restore();
                    }
                  }
                }

                // Kullanıcı açtıysa görsel kutuları çiz
                if (settings.showRoiBoxes) {
                  for (const r of rois) {
                    if (r.active && r.box) {
                      ctx.fillStyle = `${r.color}20`;
                      ctx.fillRect(r.box.x, r.box.y, r.box.width, r.box.height);
                      ctx.strokeStyle = r.color;
                      ctx.lineWidth = 1.5;
                      ctx.strokeRect(r.box.x, r.box.y, r.box.width, r.box.height);
                    }
                  }
                }

                // Kullanıcı açtıysa yüz noktalarını seyrek çiz (FPS düşürmemek için her 8 noktada bir)
                if (settings.showLandmarks && cachedLandmarksRef.current) {
                  ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
                  const lms = cachedLandmarksRef.current;
                  for (let i = 0; i < lms.length; i += 8) {
                    const pt = lms[i];
                    ctx.fillRect(pt.x * width, pt.y * height, 2, 2);
                  }

                  // İris & Pupillometri (Göz Bebeği / PUI) Merkez ve Çemberlerini Çiz
                  if (lms.length >= 478) {
                    const irisL = lms[468];
                    const irisR = lms[473];
                    const rL = Math.hypot(lms[469].x - lms[471].x, lms[469].y - lms[471].y) * width * 0.5;
                    const rR = Math.hypot(lms[474].x - lms[476].x, lms[474].y - lms[476].y) * width * 0.5;

                    ctx.strokeStyle = '#06b6d4';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.arc(irisL.x * width, irisL.y * height, Math.max(3, rL), 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(irisR.x * width, irisR.y * height, Math.max(3, rR), 0, 2 * Math.PI);
                    ctx.stroke();

                    // İris merkez noktaları
                    ctx.fillStyle = '#10b981';
                    ctx.fillRect(irisL.x * width - 1.5, irisL.y * height - 1.5, 3, 3);
                    ctx.fillRect(irisR.x * width - 1.5, irisR.y * height - 1.5, 3, 3);
                  }
                }
              } else {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
                ctx.fillRect(20, 20, width - 40, 40);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText('YÜZ ARANIYOR: Lütfen kameraya doğrudan ve aydınlık bir ortamda bakın', 35, 45);
              }
            }
          }
        }
      } catch (loopErr) {
        console.error('Kamera döngü hatası:', loopErr);
      } finally {
        animationFrameIdRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isCameraActive, isLoadingModel, settings, onRgbSample, onLandmarks]);

  return (
    <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between">
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
      />

      <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {isLoadingModel && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-cyan-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <div className="text-center">
              <p className="font-semibold text-sm text-slate-200">MediaPipe Biyometrik AI Motoru Başlatılıyor...</p>
            </div>
          </div>
        )}

        {modelError && (
          <div className="absolute inset-0 bg-rose-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-200">
            <CameraOff className="w-10 h-10 mb-2 text-rose-400" />
            <p className="font-bold text-sm mb-1">{modelError}</p>
            <button
              onClick={startCamera}
              className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
            >
              Yeniden Dene
            </button>
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] font-mono text-cyan-300 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DMS Kamera • {fps > 0 ? `${fps} FPS` : '30 FPS'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
