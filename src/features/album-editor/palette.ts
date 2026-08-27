/**
 * Paleta do álbum e fontes de display.
 *
 * Cores básicas e chapadas, como pede a referência de capa: uma cor no papel e
 * uma tinta pareada que carrega o texto e os grafismos. O par é fixo porque foi
 * escolhido por contraste — deixar o usuário combinar as duas livremente
 * produziria capas ilegíveis.
 *
 * Estas cores são do *objeto impresso*, não da interface: o design system
 * Organic continua mandando em tudo que é tela (`globals.css`). É a mesma
 * separação que `album-style/theme.ts` já fazia entre papel e tinta.
 */

import { luminance } from '@/features/album-print/spec';
import type { CoverFontId } from '@/types/album-editor';

export interface AlbumColor {
  id: string;
  /** Chave de tradução do nome visível. */
  labelKey: string;
  /** Cor chapada da capa, contracapa e lombada. */
  bg: string;
  /** Tinta pareada: texto e grafismos. */
  ink: string;
}

export const ALBUM_COLORS: AlbumColor[] = [
  { id: 'sky', labelKey: 'colorSky', bg: '#8ED2F0', ink: '#0C2F6E' },
  { id: 'cobalt', labelKey: 'colorCobalt', bg: '#1D3FBE', ink: '#F3F1EA' },
  { id: 'rose', labelKey: 'colorRose', bg: '#F6E7EB', ink: '#E13A62' },
  { id: 'red', labelKey: 'colorRed', bg: '#E03A3A', ink: '#FBF6EC' },
  { id: 'yellow', labelKey: 'colorYellow', bg: '#F4C13A', ink: '#2A2013' },
  { id: 'green', labelKey: 'colorGreen', bg: '#1E7A55', ink: '#F1EFE4' },
  { id: 'cream', labelKey: 'colorCream', bg: '#F0EBDF', ink: '#1B1A17' },
  { id: 'black', labelKey: 'colorBlack', bg: '#141414', ink: '#F5F2EA' },
];

export const DEFAULT_COLOR = 'sky';

export function colorById(id: string): AlbumColor {
  return ALBUM_COLORS.find((c) => c.id === id) ?? ALBUM_COLORS[0];
}

/**
 * Acento da interface do editor, derivado da capa.
 *
 * A tela do editor é acromática de propósito: a única cor saturada é a do
 * próprio álbum. Só que nem toda cor da paleta funciona sobre painel claro —
 * a escolha é por luminância medida, não por gosto.
 */
export function accentFor(color: AlbumColor): string {
  return luminance(color.bg) > 0.35 ? color.ink : color.bg;
}

export interface CoverFont {
  id: CoverFontId;
  labelKey: string;
  /**
   * Pilha CSS. A família vem da custom property registrada em `layout.tsx`
   * via `next/font/local` — nenhum componente escreve o nome da fonte à mão,
   * e nada é buscado na rede.
   */
  stack: string;
  weight: number;
  /** Entrelinha padrão da família: Anton e Bebas precisam de bem menos que 1. */
  leading: number;
}

export const COVER_FONTS: CoverFont[] = [
  {
    id: 'anton',
    labelKey: 'fontAnton',
    stack: 'var(--font-album-anton), system-ui, sans-serif',
    weight: 400,
    leading: 0.88,
  },
  {
    id: 'archivo',
    labelKey: 'fontArchivo',
    stack: 'var(--font-album-archivo), system-ui, sans-serif',
    weight: 400,
    leading: 1,
  },
  {
    id: 'bebas',
    labelKey: 'fontBebas',
    stack: 'var(--font-album-bebas), system-ui, sans-serif',
    weight: 400,
    leading: 0.86,
  },
  {
    id: 'serif',
    labelKey: 'fontSerif',
    stack: 'var(--font-album-serif), Georgia, serif',
    weight: 400,
    leading: 0.94,
  },
  {
    id: 'grotesk',
    labelKey: 'fontGrotesk',
    stack: 'var(--font-album-grotesk), system-ui, sans-serif',
    weight: 700,
    leading: 0.98,
  },
  {
    id: 'dm',
    labelKey: 'fontDm',
    stack: 'var(--font-album-dm), system-ui, sans-serif',
    weight: 800,
    leading: 1.02,
  },
];

export function fontById(id: CoverFontId): CoverFont {
  return COVER_FONTS.find((f) => f.id === id) ?? COVER_FONTS[0];
}

/**
 * Família da fonte para o canvas do PDF.
 *
 * O canvas não tem cascata CSS: `var(--font-album-anton)` não significa nada
 * ali. `next/font/local` gera um nome de família ofuscado e o publica só na
 * custom property — então lemos a propriedade computada e passamos o nome
 * resolvido. Se a leitura falhar (fora do navegador, num teste), cai no nome
 * original da família, que é o que um sistema com a fonte instalada usaria.
 * Esta é a única ponte entre os dois meios, como `resolveAlbumPalette` era.
 */
const FALLBACK_FAMILY: Record<CoverFontId, string> = {
  anton: 'Anton',
  archivo: 'Archivo Black',
  bebas: 'Bebas Neue',
  serif: 'Instrument Serif',
  grotesk: 'Space Grotesk',
  dm: 'DM Sans',
};

export function canvasFontFamily(id: CoverFontId): string {
  const fallback = FALLBACK_FAMILY[id];
  if (typeof window === 'undefined') return fallback;
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(`--font-album-${id}`)
    .trim();
  return resolved.length > 0 ? resolved : fallback;
}
