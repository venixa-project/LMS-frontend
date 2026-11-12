import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Optional SSL/TLS certificate configuration for College LAN or local HTTPS testing
  let httpsConfig: any = undefined;
  const sslKeyPath = env.VITE_SSL_KEY || process.env.SSL_KEY_PATH;
  const sslCertPath = env.VITE_SSL_CERT || process.env.SSL_CERT_PATH;

  if (sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    try {
      httpsConfig = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
    } catch (e) {
      console.warn('Could not load custom SSL certificates from paths, continuing with HTTP:', e);
    }
  }

  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:5000';
  const aiTarget = env.VITE_AI_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
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
