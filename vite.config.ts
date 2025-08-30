import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/JUCONNECT/' : '/',
  // DISABLE HMR to prevent excessive reloads during development
  server: {
    hmr: false,
    // Reduce polling that might cause excessive requests
    watch: {
      usePolling: false,
      interval: 1000
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
