/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'TAG_MASTER_');
  // Explicit opt-in: no open proxy, no arbitrary client-controlled destinations.
  const allowedTargets = new Set((env.TAG_MASTER_PROXY_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  const targetFor = (header: string | string[] | undefined) => {
    if (typeof header !== 'string' || !allowedTargets.has(header)) return undefined;
    try {
      const url = new URL(header);
      return url.protocol === 'https:' && url.origin === header ? header : undefined;
    } catch { return undefined; }
  };
  return {
  define: {'import.meta.env.VITE_API_PROXY_ORIGINS': JSON.stringify([...allowedTargets].join(','))},
  plugins: [
    react(),
    {
      name: 'restrict-development-proxy',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/api/proxy') && !targetFor(req.headers['x-target-url'])) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Proxy target not enabled. Configure TAG_MASTER_PROXY_ORIGINS locally.' }));
            return;
          }
          next();
        });
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Tag Master — AI 数据集打标与管理助手',
        short_name: 'TagMaster',
        description: '专为 AI 图像模型微调与 LoRA 训练量身定制的本地化数据集预处理与智能打标助手',
        theme_color: '#ffffff',
        background_color: '#ffffff',
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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('i18next')) return 'i18n';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
    proxy: {
      '/api/proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        followRedirects: false,
        rewrite: path => path.replace(/^\/api\/proxy/, ''),
        configure: proxy => {
          proxy.on('proxyReq', proxyReq => proxyReq.removeHeader('x-target-url'));
        },
        router: req => targetFor(req.headers['x-target-url']) || 'https://api.openai.com'
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  }
  };
});