import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anexocobro.app',
  appName: 'ANEXA COBROS',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  server: {
    androidScheme: 'https',
    url: 'https://diegocabrio1805-arch.github.io/cobros/',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,   // Red de seguridad: oculta a los 3s si hide() falla
      launchAutoHide: false,      // Mantener Splash Screen hasta que cargue React
      backgroundColor: "#ffffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      overlay: true,
    }
  }
};

export default config;
