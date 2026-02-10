import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anexocobro.app',
  appName: 'AnexoCobro',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  server: {
    androidScheme: 'https',
    url: 'https://cobros-anexo-2026.netlify.app/',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1e40af",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;
