import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const simulatorApiTarget = process.env.CRM_API_TARGET || 'http://127.0.0.1:4100';
const clientPort = Number(process.env.CLIENT_PORT || 5174);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{
      find: '@salesforce/platform-sdk/data',
      replacement: path.resolve(currentDirectory, 'src/sdk/sfDataMockSdk.js')
    }]
  },
  server: {
    port: clientPort,
    strictPort: true,
    proxy: { '/api': { target: simulatorApiTarget, changeOrigin: true } }
  }
});
