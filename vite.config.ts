/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for GitHub Pages to load assets correctly with relative paths
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const targetHeader = req.headers['x-target-url'];
            if (typeof targetHeader === 'string' && targetHeader) {
              try {
                proxyReq.setHeader('host', new URL(targetHeader).host);
              } catch (e) {
                // ignore
              }
            }
          });
        },
        router: (req) => {
          const targetHeader = req.headers['x-target-url'];
          if (typeof targetHeader === 'string' && targetHeader) {
            return targetHeader.replace(/\/+$/, "");
          }
          return 'https://api.openai.com';
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  }
});