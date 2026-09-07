package com.anexocobro.app;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // IMPORTANTE: Este número DEBE coincidir con versionCode en build.gradle
    // Si no coincide, borrará la WebView en CADA arranque → CRASH en gama baja
    private static final int CURRENT_VERSION_CODE = 69800;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // CLEAR WebView storage SOLO UNA VEZ después de actualización de la app
        // Solo limpia si el versionCode guardado es menor al actual
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
            int lastClearedVersion = prefs.getInt("last_cleared_version", 0);

            if (lastClearedVersion < CURRENT_VERSION_CODE) {
                android.util.Log.i("MainActivity", "Clearing WebView data for version " + CURRENT_VERSION_CODE);

                android.webkit.WebStorage.getInstance().deleteAllData();
                android.webkit.CookieManager.getInstance().removeAllCookies(null);
                android.webkit.CookieManager.getInstance().flush();

                prefs.edit().putInt("last_cleared_version", CURRENT_VERSION_CODE).apply();
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error clearing WebView data", e);
        }

        // Solicitar permisos de Bluetooth SOLO en Android 12+ (API 31)
        // En Android 10/11 (Samsung A02), estos permisos no existen y causan crash
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                requestPermissions(new String[] {
                        Manifest.permission.BLUETOOTH_SCAN,
                        Manifest.permission.BLUETOOTH_CONNECT
                }, 102);
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "Error requesting Bluetooth permissions", e);
            }
        }
    }
}
