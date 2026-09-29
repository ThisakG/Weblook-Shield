import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is used per the tech stack's implicit "modern React tooling" — it
// gives fast local dev reloads and produces a small, cacheable production
// build for the containerized/PaaS deployment described in the proposal.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxies /api calls to the backend during local development so the
    // frontend and backend can run on different ports without a CORS
    // headache in dev mode (production uses the CORS_ORIGIN allow-list
    // configured in backend/src/app.js instead).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
