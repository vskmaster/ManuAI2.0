import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle benign WebSocket HMR failures inside sandbox iframes
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (msg.includes("WebSocket") || msg.includes("websocket") || msg.includes("WS")) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (msg.includes("WebSocket") || msg.includes("websocket")) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

