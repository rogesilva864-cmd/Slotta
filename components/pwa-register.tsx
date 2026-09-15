'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // ignora falha silenciosa em ambientes locais sem HTTPS
        });
      });
    }

    if ('BeforeInstallPromptEvent' in window) {
      // mantém padrão do navegador para instalar o app
    }
  }, []);

  return null;
}
