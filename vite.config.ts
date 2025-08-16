import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NETLIFY === 'true' ? '/' : process.env.NODE_ENV === 'production' ? '/JUCONNECT/' : '/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
