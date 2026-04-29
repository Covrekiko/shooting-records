import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

console.log('[BOOT] main.jsx loaded, about to render React');

// TEMPORARY: Disable SW during debug to prevent cached bundle serving
// Re-enable after confirming app loads
const DISABLE_SW_FOR_DEBUG = true;

if (!DISABLE_SW_FOR_DEBUG && 'serviceWorker' in navigator) {
  console.log('[BOOT] Registering service worker');
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[BOOT] SW registered successfully');
        // When a new SW is waiting, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.error('[BOOT] SW registration failed:', err);
      });

    // When SW controller changes (new SW took over), reload once
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        console.log('[BOOT] SW controller changed, reloading');
        refreshing = true;
        window.location.reload();
      }
    });
  });
} else if (DISABLE_SW_FOR_DEBUG) {
  console.log('[BOOT] Service worker disabled for debug (DISABLE_SW_FOR_DEBUG = true)');
}

const root = document.getElementById('root');
console.log('[BOOT] Root element found:', !!root);

if (!root) {
  console.error('[BOOT] CRITICAL: root div not found in index.html');
  document.body.innerHTML = '<div style="padding: 20px; font-family: monospace; color: red;"><strong>ERROR:</strong> Root element not found. Check index.html.</div>';
} else {
  try {
    console.log('[BOOT] Creating React root');
    const reactRoot = ReactDOM.createRoot(root);
    console.log('[BOOT] React root created, rendering App');
    reactRoot.render(<App />);
    console.log('[BOOT] App rendered successfully');
  } catch (err) {
    console.error('[BOOT] CRITICAL: React render failed:', err);
    root.innerHTML = `<div style="padding: 20px; font-family: monospace; background: #fff; color: #000;">
      <strong style="color: red;">App failed to load</strong><br/>
      Error: ${err.message || 'Unknown'}<br/>
      <small>Check browser console (F12) for details.</small>
    </div>`;
  }
}