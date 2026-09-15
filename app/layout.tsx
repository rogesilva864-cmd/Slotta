import './globals.css';
import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'Agendamento SaaS',
  description: 'Sistema profissional de agendamento para empresas clientes.',
  applicationName: 'Agendamento SaaS',
  manifest: '/manifest.webmanifest',
  icons: [
    { rel: 'icon', url: '/logo-agenda.jpeg' },
    { rel: 'apple-touch-icon', url: '/logo-agenda.jpeg' },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020817',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <PwaRegister />
        <div className="app-shell">
          <div className="brand-bar">
            <div className="brand-wrap" aria-label="Logo principal">
              <Image
                src="/logo-barra-superior.jpeg"
                alt="Logo principal"
                width={640}
                height={256}
                priority
                className="brand-logo"
              />
            </div>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
