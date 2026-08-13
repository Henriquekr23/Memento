import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { LangProvider } from '@/features/i18n/LangProvider';

import './globals.css';

/**
 * As duas faces do design system Classical, servidas de dentro do repositório.
 *
 * Antes vinham de `next/font/google`. Ele também auto-hospeda o resultado, mas
 * **baixa os arquivos durante o build** — e um build que precisa de rede é um
 * build que quebra: sem acesso ao `fonts.gstatic.com` o Turbopack falha com
 * "Can't resolve @vercel/turbopack-next/internal/font/google/font", e apagar a
 * pasta `.next` (onde o download fica em cache) basta para derrubar tudo.
 *
 * Com os `.woff2` versionados aqui, compilar não depende mais de rede nenhuma.
 * São as fontes variáveis do subset `latin`, um arquivo por família cobrindo os
 * pesos 400 e 600 — o `latin` já traz todos os acentos do português, o travessão
 * e as aspas tipográficas.
 */
const heading = localFont({
  src: './fonts/cormorant-garamond-latin.woff2',
  variable: '--font-heading',
  weight: '400 600',
  display: 'swap',
});

const body = localFont({
  src: './fonts/lora-latin.woff2',
  variable: '--font-body',
  weight: '400 600',
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
      {/* O idioma escolhido vale para todas as telas (barra, rodapé, "Sobre"),
          então o provider fica na raiz — e não dentro de uma página. */}
      <body className="antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
