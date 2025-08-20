import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initWebVitals } from './utils/performance';
import { env } from './utils/env';

// Initialize performance monitoring
if (env.isDevelopment) {
  initWebVitals();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
