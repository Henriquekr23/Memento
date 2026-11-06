import localFont from 'next/font/local';

/**
 * As fontes da landing, servidas de dentro do repositório como as outras
 * (`src/app/fonts/`, ver `app/layout.tsx`): sem rede no build, sem requisição a
 * terceiros, CSP `font-src 'self'` intacta.
 *
 * Declaradas aqui, e não no layout raiz, para só a página inicial baixá-las
 * (o `next/font` pré-carrega o arquivo nas rotas que usam a fonte). São as
 * variáveis do subset `latin` do `@fontsource-variable`, um arquivo por
 * família cobrindo o eixo `wght` inteiro — o mesmo caminho das outras.
 *
 * - Schibsted Grotesk: títulos e corpo da landing (substitui a Figtree aqui;
 *   as outras telas continuam com ela).
 * - JetBrains Mono: metadados, legendas e o carimbo de data.
 *
 * - Bricolage Grotesque com eixo de tamanho óptico (`opsz`): só a palavra
 *   "memento" da barra. O arquivo da interface (`bricolage-grotesque-latin`)
 *   só tem o eixo de peso e fica preso no corte de texto pequeno — mais largo
 *   e mais pesado que o da marca no protótipo. Este é o `opsz` do
 *   `@fontsource-variable/bricolage-grotesque`, recortado para a-z e espaço
 *   (9 KB): serve a marca e nada mais.
 */
const sans = localFont({
  src: '../../app/fonts/schibsted-grotesk-latin.woff2',
  variable: '--font-landing-sans',
  weight: '400 900',
  display: 'swap',
});

const mono = localFont({
  src: '../../app/fonts/jetbrains-mono-latin.woff2',
  variable: '--font-landing-mono',
  weight: '100 800',
  display: 'swap',
});

const brand = localFont({
  src: '../../app/fonts/bricolage-grotesque-opsz-brand.woff2',
  variable: '--font-landing-brand',
  weight: '200 800',
  display: 'swap',
});

/** As variáveis numa string só, para o wrapper `.landing`. */
export const landingFontVars = `${sans.variable} ${mono.variable} ${brand.variable}`;
