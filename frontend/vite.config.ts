import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_API_URL points the frontend at the deployed backend (Railway). In local
// dev it defaults to the backend on :5000. It is a PUBLIC value by design: only
// non-secret config ever reaches the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5500,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
