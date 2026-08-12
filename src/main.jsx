import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the service worker after first paint so the SW install doesn't
// delay initial render. Skip during dev — Vite HMR + SW caching fights badly.
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined'
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.warn('[sw] registration failed:', err);
      });
  });
}