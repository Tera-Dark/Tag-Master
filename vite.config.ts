import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for GitHub Pages to load assets correctly with relative paths
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});