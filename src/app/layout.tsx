import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { LangProvider } from '@/features/i18n/LangProvider';

import './globals.css';

/**
 * As duas faces do design system Organic, servidas de dentro do repositório.
 *
 * Antes vinham de `next/font/google`. Ele também auto-hospeda o resultado, mas
 * **baixa os arquivos durante o build** — e um build que precisa de rede é um
 * build que quebra: sem acesso ao `fonts.gstatic.com` o Turbopack falha com
 * "Can't resolve @vercel/turbopack-next/internal/font/google/font", e apagar a
 * pasta `.next` (onde o download fica em cache) basta para derrubar tudo. O
 * `styles.css` original do Organic abre com um `@import` do Google Fonts pelo
 * mesmo motivo — e é justamente o que a CSP (`font-src 'self'`) proíbe aqui.
 *
 * Com os `.woff2` versionados nesta pasta, compilar não depende de rede
 * nenhuma. São as fontes variáveis do subset `latin`, um arquivo por família
 * cobrindo o eixo `wght` inteiro — o `latin` já traz todos os acentos do
 * português, o travessão e as aspas tipográficas.
 */
const heading = localFont({
  src: './fonts/bricolage-grotesque-latin.woff2',
  variable: '--font-heading',
  weight: '400 800',
  display: 'swap',
});

const body = localFont({
  src: './fonts/figtree-latin.woff2',
  variable: '--font-body',
  weight: '300 900',
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
