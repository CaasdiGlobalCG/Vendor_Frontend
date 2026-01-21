import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Required for aws-amplify
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  define: {
    // global: 'window',
    global: 'globalThis'
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
    exclude: ['motion-utils'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      plugins: [rollupNodePolyFill()],
    },
    ssr: false,
  },
  server: {
    proxy: {
      // In dev mode, proxy /api/* requests to backend
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true,  // Enable WebSocket proxying
      }
    }
  }
});
