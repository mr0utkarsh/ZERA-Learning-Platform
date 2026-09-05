import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the backend so the browser only ever
// talks to one origin (also required for the sandboxed live preview).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = String(env.VITE_API_URL || env.VITE_DEV_API_URL || '').replace(/\/$/, '');

  return {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // Allow the sandboxed live-preview host (and any dev host) to load the app.
    allowedHosts: true,
    ...(apiUrl ? {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    } : {}),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  };
});
