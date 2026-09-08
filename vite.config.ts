import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/cobros/', // CAMBIO CRÍTICO PARA GITHUB PAGES: Usa la ruta de tu repo
    server: {
      port: 5177,
      strictPort: false,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/android/**'],
      },
    },
    plugins: [
      nodePolyfills(),
      react(),
      legacy({
        targets: ['defaults', 'android >= 5', 'chrome >= 64'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      }),
      VitePWA({
        // 'prompt': El SW descarga la actualización en background pero NO toma control
        // hasta que el usuario presione "Recargar App" en el banner del AutoUpdater.
        // Esto elimina el error "message channel closed" que ocurría cuando el SW viejo
        // tomaba control a mitad de una sync de pagos.
        registerType: 'prompt',
        injectRegister: 'auto',
        manifest: {
          name: 'Anexo Cobro',
          short_name: 'Cobro',
          description: 'Sistema de Gestión de Cobros',
          theme_color: '#059669',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MiB
          globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
          // index.html NO está en precaché → desactivar el fallback para evitar
          // el error "non-precached-url: index.html" de Workbox.
          // Las navegaciones las maneja NetworkFirst en runtimeCaching.
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          // FIX: Eliminados skipWaiting y clientsClaim.
          // Con 'prompt', el SW nuevo espera hasta que el usuario confirme la recarga.
          // Así no interrumpe operaciones async (sync de pagos, apertura de WhatsApp).
          // skipWaiting: true,  ← REMOVIDO (causaba "message channel closed")
          // clientsClaim: true, ← REMOVIDO (causaba pérdida de canal del SW)
          runtimeCaching: [
            {
              // Captura TODAS las navegaciones (mode === 'navigate')
              // con estrategia NetworkFirst: intenta red primero,
              // si falla en 3s sirve desde caché html-cache.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 3,
              },
            },
          ]
        }
      })

    ],
    build: {
      target: 'es2015',
      minify: mode === 'production' ? 'terser' : false,
      sourcemap: mode !== 'production',
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
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
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-capacitor': ['@capacitor/core', '@capacitor/app', '@capacitor/network']
          }
        }
      },
      chunkSizeWarningLimit: 2000
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
