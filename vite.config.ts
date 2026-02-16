import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', // CRITICAL for GitHub Pages (subpath /cobros/) and relative asset loading
    server: {
      port: 3333,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      legacy({
        targets: ['defaults', 'android >= 5', 'chrome >= 64'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      })
      // VitePWA REMOVED TEMPORARILY TO FIX BUILD
    ],
    build: {
      target: 'es2015',
      minify: mode === 'production' ? 'terser' : false,
      sourcemap: mode !== 'production',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug']
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom'],
            'supabase': ['@supabase/supabase-js'],
            'capacitor': ['@capacitor/core', '@capacitor/app', '@capacitor/network']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
