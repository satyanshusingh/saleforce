import {defineConfig} from 'vite';
import {fileURLToPath, URL} from 'node:url';

// CLASSROOM-ONLY: keep imports exactly like Salesforce Data SDK imports.
// When moving to a real supported Salesforce org: remove this alias,
// install @salesforce/platform-sdk, and use the official Multi-Framework template.
export default defineConfig({
  resolve: {
    alias: [{
      find: '@salesforce/platform-sdk/data',
      replacement: fileURLToPath(new URL('./src/mock-salesforce-sdk/data.js', import.meta.url))
    }]
  },
  server: {
    port: 5173, strictPort: true,
    proxy: {'/api': {target: 'http://127.0.0.1:4100', changeOrigin: true}}
  },
  build: {outDir: 'dist'}
});
