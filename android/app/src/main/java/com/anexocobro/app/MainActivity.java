package com.anexocobro.app;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // CLEAR WebView storage ONLY ONCE after app update (to fix persistent session
        // bug)
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
            int lastClearedVersion = prefs.getInt("last_cleared_version", 0);
            int currentVersion = 542; // versionCode from build.gradle

            if (lastClearedVersion < currentVersion) {
                android.util.Log.i("MainActivity", "Clearing WebView data for version " + currentVersion);

                android.webkit.WebStorage.getInstance().deleteAllData();
                android.webkit.CookieManager.getInstance().removeAllCookies(null);
                android.webkit.CookieManager.getInstance().flush();

                // Save that we've cleared for this version
                prefs.edit().putInt("last_cleared_version", currentVersion).apply();
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error clearing WebView data", e);
        }

        // Solicitar permisos de Bluetooth (Dispositivos Cercanos) en Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissions(new String[] {
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.BLUETOOTH_CONNECT
            }, 102);
        }
    }
}
