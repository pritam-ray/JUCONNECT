// FIRST: Import circuit breaker to prevent excessive API calls
import './utils/circuitBreaker';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import request deduplicator to prevent duplicate API calls
import './utils/requestDeduplicator';

// Import safeguards to prevent app crashes
import './utils/safeguards';

createRoot(document.getElementById('root')!).render(
  <App />
);
