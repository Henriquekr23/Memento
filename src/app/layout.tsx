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

/**
 * Fontes de display do álbum.
 *
 * O usuário escolhe qual delas leva o título da capa (e, por tabela, o texto
 * da lombada). São arquivos estáticos de peso único do subset `latin`, tirados
 * dos pacotes `@fontsource` — mesma origem do Google Fonts, só que baixada uma
 * vez e versionada aqui, pelo motivo descrito acima. Cada uma vira uma CSS
 * custom property que `album-editor` lê pelo id da fonte; nenhum componente
 * escreve o nome da família à mão.
 */
const albumAnton = localFont({
  src: './fonts/anton-latin.woff2',
  variable: '--font-album-anton',
  weight: '400',
  display: 'swap',
});

const albumArchivo = localFont({
  src: './fonts/archivo-black-latin.woff2',
  variable: '--font-album-archivo',
  weight: '400',
  display: 'swap',
});

const albumBebas = localFont({
  src: './fonts/bebas-neue-latin.woff2',
  variable: '--font-album-bebas',
  weight: '400',
  display: 'swap',
});

const albumSerif = localFont({
  src: './fonts/instrument-serif-latin.woff2',
  variable: '--font-album-serif',
  weight: '400',
  display: 'swap',
});

const albumGrotesk = localFont({
  src: './fonts/space-grotesk-latin.woff2',
  variable: '--font-album-grotesk',
  weight: '700',
  display: 'swap',
});

const albumDm = localFont({
  src: './fonts/dm-sans-latin.woff2',
  variable: '--font-album-dm',
  weight: '800',
  display: 'swap',
});

/** Todas as variáveis de fonte numa string só, para a tag <html>. */
const fontVars = [
  heading.variable,
  body.variable,
  albumAnton.variable,
  albumArchivo.variable,
  albumBebas.variable,
  albumSerif.variable,
  albumGrotesk.variable,
  albumDm.variable,
].join(' ');

export const metadata: Metadata = {
  title: 'Memento — Guarde a memória',
  description:
    'Envie suas fotos e o Memento as coloca em ordem pela data e hora gravadas em cada arquivo. Um casamento, uma viagem ou uma lembrança antiga: o álbum é montado por você, direto no navegador e sem inteligência artificial.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={fontVars}>
      {/* O idioma escolhido vale para todas as telas (barra, rodapé, "Sobre"),
          então o provider fica na raiz — e não dentro de uma página. */}
      <body className="antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
