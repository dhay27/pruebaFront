import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Contenedor global para las notificaciones */}
      <Toaster position="top-right" />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

