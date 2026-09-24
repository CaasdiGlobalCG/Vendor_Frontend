import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Required for aws-amplify
      buffer: 'buffer',
      process: 'process/browser',
      // html2canvas can't parse modern color functions (oklch/lab) that
      // Chrome returns in computed styles — html2canvas-pro can. The shim
      // keeps the CJS callable export shape html2pdf.js expects.
      html2canvas: fileURLToPath(new URL('./src/html2canvas-shim.cjs', import.meta.url)),
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
        // Silence noisy "ws proxy socket error: EPIPE/ECONNRESET" logs — these
        // fire every time a browser socket closes mid-write (HMR reloads, tab
        // closes, WS reconnects) and are harmless. configure() runs before Vite
        // attaches its own proxyReqWs logger, so intercepting the registration
        // replaces it with a filtered one. Real errors still log.
        configure: (proxy) => {
          const origOn = proxy.on.bind(proxy);
          proxy.on = (event, cb) => {
            if (event === 'proxyReqWs') {
              return origOn(event, (proxyReq, req, socket, options, head) => {
                socket.on('error', (err) => {
                  const benign = ['EPIPE', 'ECONNRESET', 'ECONNABORTED'];
                  if (!benign.includes(err?.code)) {
                    console.error('ws proxy socket error:', err);
                  }
                });
              });
            }
            return origOn(event, cb);
          };
        },
      }
    }
  }
});
