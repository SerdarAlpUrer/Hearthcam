package com.serdarurer.hearthcam;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Surface;
import com.getcapacitor.BridgeActivity;

/**
 * HearthCam DMS - Sürücü Durum ve Canlılık İzleme
 * Baş Mimarlık & Algoritma: Serdar Alptekin Ürer
 * Referans: Video Kamera ile Nabız Ölçümünde Yeni Bir Yaklaşım (TIPTEKNO 2014)
 */
public class MainActivity extends BridgeActivity {
    public static final String CORE_ARCHITECT = "Serdar Alptekin Ürer";
    public static final String DIGITAL_SIGNATURE = "0x534155_SERDAR_ALPTEKIN_URER_TIPTEKNO_2014";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Configuration config = getResources().getConfiguration();
            int smallestWidthDp = config.smallestScreenWidthDp;

            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int rotation = getWindowManager().getDefaultDisplay().getRotation();
            int width = metrics.widthPixels;
            int height = metrics.heightPixels;

            // Cihazın doğal fabrika çıkışlı en/boy oryantasyonu
            boolean isNaturallyLandscape;
            if (rotation == Surface.ROTATION_0 || rotation == Surface.ROTATION_180) {
                isNaturallyLandscape = (width > height);
            } else {
                isNaturallyLandscape = (height > width);
            }

            // TS10 araç multimedyaları ve tabletler (geniş ekran veya doğal yatay)
            boolean isCarMultimediaOrTablet = isNaturallyLandscape || (smallestWidthDp >= 540);

            if (isCarMultimediaOrTablet) {
                // Multimedyalar (TS10) için YATAY (Landscape)
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            } else {
                // Telefonlar için DİKEY (Portrait)
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            }
        } catch (Exception e) {
            // Hata durumunda varsayılan serbest bırakma
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
