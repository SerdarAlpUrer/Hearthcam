/**
 * HearthCam - Çok Bölgeli (Multi-ROI) Yüz Bölgesi, YCbCr Cilt Maskeleme ve SNR Ağırlıklı RGB Füzyon Modülü
 * Alın (Forehead), Sol Yanak (Left Cheek), Sağ Yanak (Right Cheek)
 * Mimar: Serdar Alptekin Ürer
 */

// MediaPipe 468/478 Yüz Landmark İndeksleri
export const ROI_LANDMARKS = {
  // Alın: Kaşların üstü ile saç çizgisi arasındaki pürüzsüz bölge
  forehead: [10, 338, 297, 332, 284, 251, 389, 356, 109, 67, 103, 54, 21, 162, 127],
  // Sol Yanak: Elmacık kemiği altı, kılcal damar zengin bölge
  leftCheek: [116, 117, 118, 119, 100, 126, 209, 49, 131, 134, 50, 205],
  // Sağ Yanak: Sağ elmacık kemiği altı
  rightCheek: [345, 346, 347, 348, 329, 355, 429, 279, 360, 363, 280, 425],
};

export interface ExtractedRoiRgb {
  r: number;
  g: number;
  b: number;
  count: number;
  skinPurity: number; // 0 - 100% YCbCr cilt pikseli saflığı
  spatialVariance: number; // Bölge içi parlaklık varyansı (parlama/gölge tespiti)
}

export interface FusedRoiSample {
  r: number;
  g: number;
  b: number;
  foreheadG: number;
  cheekG: number;
  skinPurity: number;
  weights: Record<string, number>;
}

export class RoiExtractor {
  /**
   * Landmark noktalarından güvenli sınır kutusu (bounding box) çıkarır
   */
  public getBoundingBox(
    landmarkIndices: number[],
    landmarks: { x: number; y: number; z: number }[],
    canvasWidth: number,
    canvasHeight: number,
    paddingRatio: number = 0.08
  ): { x: number; y: number; width: number; height: number } | null {
    if (!landmarks || landmarks.length === 0 || canvasWidth <= 0 || canvasHeight <= 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const idx of landmarkIndices) {
      if (idx < landmarks.length) {
        const pt = landmarks[idx];
        const px = pt.x * canvasWidth;
        const py = pt.y * canvasHeight;

        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }

    if (!isFinite(minX) || !isFinite(maxX) || minX >= maxX || minY >= maxY) return null;

    const width = maxX - minX;
    const height = maxY - minY;

    const padW = width * paddingRatio;
    const padH = height * paddingRatio;

    // Sınır kutusunun Canvas dışına taşmasını kesin olarak engelle
    const safeX = Math.max(0, Math.min(canvasWidth - 6, Math.round(minX + padW)));
    const safeY = Math.max(0, Math.min(canvasHeight - 6, Math.round(minY + padH)));
    const safeW = Math.max(4, Math.min(canvasWidth - safeX, Math.round(width - 2 * padW)));
    const safeH = Math.max(4, Math.min(canvasHeight - safeY, Math.round(height - 2 * padH)));

    return { x: safeX, y: safeY, width: safeW, height: safeH };
  }

  /**
   * YCbCr Cilt Maskeleme (Skin-Pixel Segmentation) ile saç, kaş, sakal, gözlük çerçevesi
   * ve aşırı parlama piksellerini eleyerek saf dermis/epidermis RGB ortalamasını çıkarır.
   */
  public extractAverageRgb(
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; width: number; height: number }
  ): ExtractedRoiRgb {
    if (!ctx || !box || box.width <= 0 || box.height <= 0) {
      return { r: 0, g: 0, b: 0, count: 0, skinPurity: 0, spatialVariance: 999 };
    }

    const cWidth = ctx.canvas.width;
    const cHeight = ctx.canvas.height;

    const safeX = Math.max(0, Math.min(cWidth - 2, Math.floor(box.x)));
    const safeY = Math.max(0, Math.min(cHeight - 2, Math.floor(box.y)));
    const safeW = Math.max(2, Math.min(cWidth - safeX, Math.floor(box.width)));
    const safeH = Math.max(2, Math.min(cHeight - safeY, Math.floor(box.height)));

    try {
      const imageData = ctx.getImageData(safeX, safeY, safeW, safeH);
      const data = imageData.data;

      let skinSumR = 0, skinSumG = 0, skinSumB = 0, skinSumGSq = 0;
      let skinCount = 0;

      let fallbackSumR = 0, fallbackSumG = 0, fallbackSumB = 0;
      let fallbackCount = 0;
      let totalSampled = 0;

      const step = 2;
      for (let i = 0; i < data.length; i += 4 * step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalSampled++;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Aşırı karanlık (< 18) veya patlamış specular parlama (> 246) piksellerini tamamen reddet
        if (lum < 18 || lum > 246) continue;

        fallbackSumR += r;
        fallbackSumG += g;
        fallbackSumB += b;
        fallbackCount++;

        // YCbCr Krominans Dönüşümü (ITU-R BT.601)
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // İnsan Cilt Tonu Poligonu: Cb [74, 133], Cr [128, 178] ve Hemoglobin R > G kuralı
        const isSkinPixel =
          cb >= 74 &&
          cb <= 133 &&
          cr >= 128 &&
          cr <= 178 &&
          r >= g * 0.92;

        if (isSkinPixel) {
          skinSumR += r;
          skinSumG += g;
          skinSumB += b;
          skinSumGSq += g * g;
          skinCount++;
        }
      }

      const skinPurity = totalSampled > 0 ? Math.round((skinCount / totalSampled) * 100) : 0;

      // Yeterli cilt pikseli bulunduysa (%20 üzeri) saf cilt piksellerini kullan
      if (skinCount >= 8) {
        const meanR = skinSumR / skinCount;
        const meanG = skinSumG / skinCount;
        const meanB = skinSumB / skinCount;
        const varianceG = Math.max(0, skinSumGSq / skinCount - meanG * meanG);

        return {
          r: meanR,
          g: meanG,
          b: meanB,
          count: skinCount,
          skinPurity: Math.min(100, Math.max(15, skinPurity)),
          spatialVariance: varianceG,
        };
      }

      // Gece / Kızılötesi (IR) veya düşük renk doygunluklu ortamda fallback
      if (fallbackCount > 0) {
        return {
          r: fallbackSumR / fallbackCount,
          g: fallbackSumG / fallbackCount,
          b: fallbackSumB / fallbackCount,
          count: fallbackCount,
          skinPurity: Math.max(10, skinPurity),
          spatialVariance: 120,
        };
      }

      return { r: 128, g: 128, b: 128, count: 0, skinPurity: 0, spatialVariance: 999 };
    } catch (e) {
      return { r: 0, g: 0, b: 0, count: 0, skinPurity: 0, spatialVariance: 999 };
    }
  }

  /**
   * Çoklu ROI bölgelerinden gelen sinyalleri:
   * 1. YCbCr Cilt Saflığı (Skin Purity)
   * 2. Bölgesel Homojenlik (Güneş/Gölge kenarı varyans cezası)
   * 3. Optimum Işık Doygunluğu
   * ile ağırlıklandırarak birleştirir ve Alın-Yanak Micro-PTT kanallarını ayırır.
   */
  public fuseRois(
    rois: { id: string; active: boolean; rgb: ExtractedRoiRgb }[]
  ): FusedRoiSample {
    let totalWeight = 0;
    let fusedR = 0, fusedG = 0, fusedB = 0;
    let weightedPurity = 0;
    const weights: Record<string, number> = {};

    let foreheadG = 0;
    let cheekGSum = 0;
    let cheekWeightSum = 0;

    for (const roi of rois) {
      if (!roi.active || roi.rgb.count < 5) {
        weights[roi.id] = 0;
        continue;
      }

      const baseWeight = roi.id === 'forehead' ? 1.05 : 1.25;
      const g = roi.rgb.g;

      // 1. Parlaklık Kalite Çarpanı (Aşırı parlama veya gölgeyi dışla)
      let exposureFactor = 1.0;
      if (g > 220) {
        exposureFactor = Math.max(0.04, (250 - g) / 30);
      } else if (g < 38) {
        exposureFactor = Math.max(0.08, g / 38);
      }

      // 2. YCbCr Cilt Saflığı Çarpanı (Saç/gözlük/sakal gelen bölgenin ağırlığını düşür)
      const purityFactor = Math.max(0.15, roi.rgb.skinPurity / 100);

      // 3. Uzamsal Homojenlik Çarpanı (Yarı gölge / yarı güneş vuran bölgeyi cezalandır)
      const homogeneityFactor = 1.0 / (1.0 + roi.rgb.spatialVariance / 220);

      const weight = baseWeight * exposureFactor * purityFactor * homogeneityFactor;
      weights[roi.id] = Math.round(weight * 100) / 100;

      fusedR += roi.rgb.r * weight;
      fusedG += roi.rgb.g * weight;
      fusedB += roi.rgb.b * weight;
      weightedPurity += roi.rgb.skinPurity * weight;
      totalWeight += weight;

      if (roi.id === 'forehead') {
        foreheadG = roi.rgb.g;
      } else {
        cheekGSum += roi.rgb.g * weight;
        cheekWeightSum += weight;
      }
    }

    if (totalWeight === 0) {
      return {
        r: 128,
        g: 128,
        b: 128,
        foreheadG: 128,
        cheekG: 128,
        skinPurity: 0,
        weights,
      };
    }

    const finalG = fusedG / totalWeight;
    const cheekG = cheekWeightSum > 0 ? cheekGSum / cheekWeightSum : finalG;

    return {
      r: fusedR / totalWeight,
      g: finalG,
      b: fusedB / totalWeight,
      foreheadG: foreheadG > 0 ? foreheadG : finalG,
      cheekG,
      skinPurity: Math.round(weightedPurity / totalWeight),
      weights,
    };
  }
}
