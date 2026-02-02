import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      legacy({
        targets: ['defaults', 'android >= 5', 'chrome >= 64'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      })
    ],
    build: {
      target: 'es2015',
      minify: mode === 'production' ? 'terser' : false, // Minify only in production
      sourcemap: mode !== 'production', // Sourcemaps only in dev
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.logs in production
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
    // Vite automatically exposes VITE_ prefixed env vars to import.meta.env
    // No need to manually define them here
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
