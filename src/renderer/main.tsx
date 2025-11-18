import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useStore } from './store';
import { hydrateStore, setupPersistence } from './persistence';
import { ToastProvider } from './components/ui/toast';

// Hydrate store from persisted state before rendering
(async () => {
  await hydrateStore(useStore);

  // Render the app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ToastProvider position="bottom-right">
        <App />
      </ToastProvider>
    </React.StrictMode>,
  );

  // Setup automatic persistence after rendering
  setupPersistence(useStore);
})();
