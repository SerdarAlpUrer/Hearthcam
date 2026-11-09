# HearthCam - Biyometrik Sürücü & Canlılık Takip Sistemi (rPPG & DMS)

**HearthCam**, standart bir video/web kamerası veya araç içi kızılötesi (NIR) kamera aracılığıyla temassız olarak insan nabzını, kalp atım hızı değişkenliğini (HRV), solunumunu, göz yorgunluğunu (PERCLOS) ve yüz mimiklerine dayalı duygu/stres durumunu tespit eden yeni nesil bir biyometrik izleme yazılımıdır.

Bu proje, **Serdar Alptekin Ürer ve Metin Yıldız** tarafından **TIPTEKNO 2014** (Tıp Teknolojileri Ulusal Kongresi) kapsamında yayımlanan *"Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım"* başlıklı akademik çalışmanın temelleri üzerine inşa edilmiş; modern **Çok Bölgeli (Multi-ROI) rPPG**, **Google MediaPipe 3D Face Landmarker**, **WebAssembly** ve **Otomotiv Sürücü İzleme (DMS / Euro NCAP)** standartlarıyla genişletilmiştir.

---

## 🌟 Öne Çıkan Özellikler

### 1. Çok Bölgeli (Multi-ROI) rPPG & Nabız Analizi
* **Alın (Forehead ROI):** Saç çizgisi ve kaşlardan arındırılmış homojen cilt bölgesi.
* **Sol & Sağ Yanak (Cheek ROIs):** Kılcal damar yoğunluğunun ve kan hacmi değişiminin en yüksek olduğu elmacık kemiği altı bölgeleri.
* **SNR Ağırlıklı Füzyon:** Sürücü kafasını çevirdiğinde aydınlık ve temiz kalan bölgeye dinamik ağırlık veren gürültü bastırma algoritması.
* **Çoklu Algoritma Desteği:**
  * **POS (Plane-Orthogonal-to-Skin):** Işık dalgalanmalarına ve ten rengi farklarına en dayanıklı modern yöntem (Wang et al., IEEE TBME 2016).
  * **CHROM (Chrominance-based):** Yüz hareketlerine dayanıklı krominans ayrışımı (De Haan 2013).
  * **GREEN:** Klasik yeşil kanal farkı ve emilim analizi.
* **Filtreleme & Frekans Analizi:** 0.7 Hz – 3.5 Hz (42 – 210 bpm) Butterworth 2. derece bant geçiren filtre, hareketli ortalama trend giderme ve Hanning pencereli DFT/FFT ile tepe frekansı tespiti.
* **Fizyolojik Metrikler:**
  * **BPM:** Kalp atım hızı.
  * **HRV (RMSSD & SDNN):** Otonom sinir sistemi dengesi ve stres seviyesi.
  * **Solunum Hızı (RR):** Nabız genlik modülasyonu ile nefes frekansı.
  * **SNR / Güvenilirlik:** Sinyal-gürültü oranı (dB).

### 2. Göz Takibi & Uyku / Yorgunluk Tespiti (Euro NCAP / NHTSA)
* **PERCLOS (Percentage of Eye Closure):** Son 15 saniyedeki göz kapalılık yüzdesi.
* **Kırpma Frekansı & Mikro-Uyku:** 1.4 saniyeyi aşan göz kapanmalarında anında **Kritik Alarm**.
* **Esneme Sayacı (Yawn Detector):** Ağız açıklığı ve süresine bağlı otomatik esneme tespiti.

### 3. Yüz Mimikleri & Sürücü Duygu Durumu
* 52 adet MediaPipe yüz katsayısı (Blendshapes) ile gerçek zamanlı analiz:
  * **Kaş Çatma & Gerginlik:** Yüksek nabızla birleştiğinde **Yol Öfkesi (Road Rage)** uyarısı.
  * **Kafa Pozisyonu (Head Pose):** 3D Yaw, Pitch ve Roll açıları ile yola odaklanma / dikkat dağınıklığı tespiti.
  * **Canlılık Kaybı (Incapacitation):** Kalp durması, bayılma veya ani şuur kaybı teşhisi.

### 4. Otomotiv CAN Bus / CAN-FD Telemetri Entegrasyonu
* **CAN ID 0x2A0:** Normal Sürücü Durumu & Dikkat Seviyesi
* **CAN ID 0x2A1:** Uykusuzluk / Yorgunluk İkazı (Drowsiness Alert)
* **CAN ID 0x2A2:** Acil Durum / Müdahale (Emergency Takeover & eCall 112)
* **CSV Dışa Aktarım:** Laboratuvar ve Ar-Ge çalışmaları için telemetri kaydı alma.

---

## 🚀 Kurulum ve Çalıştırma

Gereksinimler: Node.js (v18+)

```bash
# Bağımlılıkları yükleyin (zaten kurulu)
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim (Production) derlemesi
npm run build
```

Sunucu başladığında tarayıcınızda `http://localhost:3000` adresine gidin ve kamera iznini onaylayın.

---

## 🚗 Araç İçi Entegrasyon Yol Haritası

```
  ┌─────────────────────────────────────────────────────────┐
  │                 HearthCam Core Engine                   │
  │     (rPPG, POS, POS/CHROM, PERCLOS, Emotion, CAN)       │
  └────────────────────────────┬────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
  [ Web Prototipi ]     [ Mobil App ]       [ Araç İçi DMS ]
  - WebAssembly (Wasm)  - Flutter / Swift   - QNX / Linux / AAOS
  - MediaPipe Vision    - Camera2 / AVFound - NIR (Kızılötesi)
  - 60 FPS Canvas       - Pozlama Kilidi    - CAN Bus / ADAS
```

---

## 📚 Akademik Referans

* Ürer, S. A., & Yıldız, M. (2014). *"Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım"*. TIPTEKNO 2014 - Tıp Teknolojileri Ulusal Kongresi Bildirileri, Erciyes Üniversitesi, Kayseri.
