import type { Metadata } from 'next';
import { Cormorant_Garamond, Lora } from 'next/font/google';

import './globals.css';

/**
 * As duas faces do design system Classical, auto-hospedadas pelo `next/font`.
 * Nada é buscado no Google em tempo de execução: sem requisição a terceiros
 * (a CSP do projeto restringe `font-src` a `'self'`) e sem salto de layout.
 */
const heading = Cormorant_Garamond({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

const body = Lora({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Memento — Guarde a memória',
  description:
    'Envie suas fotos e o Memento as coloca em ordem pela data e hora gravadas em cada arquivo. Um casamento, uma viagem ou uma lembrança antiga: o álbum é montado por você, direto no navegador e sem inteligência artificial.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
