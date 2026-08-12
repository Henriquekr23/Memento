import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Memento — Keep the Journey',
  description:
    'Monte o álbum da sua viagem a partir das fotos, em ordem cronológica, direto no navegador.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
