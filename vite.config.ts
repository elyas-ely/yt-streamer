import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { localServerPlugin } from './localServer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 9000,
      host: '0.0.0.0',
    },
    plugins: [react(), localServerPlugin()],
    define: {
      'process.env.R2_ACCOUNT_ID': JSON.stringify(env.R2_ACCOUNT_ID),
      'process.env.R2_ACCESS_KEY_ID': JSON.stringify(env.R2_ACCESS_KEY_ID),
      'process.env.R2_SECRET_ACCESS_KEY': JSON.stringify(env.R2_SECRET_ACCESS_KEY),
      'process.env.R2_ENDPOINT': JSON.stringify(env.R2_ENDPOINT),
      'process.env.R2_BUCKET_NAME': JSON.stringify(env.R2_BUCKET_NAME),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
