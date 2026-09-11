import type { Metadata } from 'next';
import '@/styles/dash-ui.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'DASH | Supplier Management',
  description: 'Gestão de expositores, catálogo, extras e pagamentos por evento.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
