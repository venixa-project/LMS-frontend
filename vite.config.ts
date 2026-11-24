import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Optional SSL/TLS certificate configuration for College LAN or local HTTPS testing
  let httpsConfig: any = true;
  const sslKeyPath = env.VITE_SSL_KEY || process.env.SSL_KEY_PATH;
  const sslCertPath = env.VITE_SSL_CERT || process.env.SSL_CERT_PATH;

  if (sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    try {
      httpsConfig = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
    } catch (e) {
      console.warn('Could not load custom SSL certificates from paths, using basicSsl:', e);
    }
  }

  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:5000';
  const aiTarget = env.VITE_AI_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), basicSsl()],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify') || id.includes('pdfjs-dist')) {
                return 'vendor-pdf';
              }
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand')) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true, // Listen on 0.0.0.0 for College LAN & Wi-Fi access
      https: httpsConfig,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/storage': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        '/ai-service': {
          target: aiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai-service/, ''),
          secure: false,
        },
      },
    },
  };
});
