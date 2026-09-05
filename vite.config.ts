/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Tag Master — AI 数据集打标与管理助手',
        short_name: 'TagMaster',
        description: '专为 AI 图像模型微调与 LoRA 训练量身定制的本地化数据集预处理与智能打标助手',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
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