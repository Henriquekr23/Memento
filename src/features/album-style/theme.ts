import type { CSSProperties } from 'react';

/**
 * Estilo do álbum: capa, papel, moldura das fotos e tipografia.
 *
 * Tudo vira CSS custom properties aplicadas na raiz do livro, e os componentes
 * só leem `var(--paper-base)`, `var(--cover-ink)` etc. Assim dá para criar um
 * tema novo aqui sem tocar em nenhum componente — e nenhuma classe condicional
 * espalhada pelo JSX.
 *
 * As fontes são stacks do sistema de propósito: buscar fonte externa deixaria o
 * app dependente de rede (e o build já quebrou uma vez por causa disso).
 */

export type CoverId = 'leather' | 'navy' | 'linen' | 'kraft' | 'charcoal' | 'burgundy';
export type PaperId = 'cream' | 'white' | 'kraft' | 'charcoal';
export type FrameId = 'polaroid' | 'corners' | 'bleed';
export type FontId = 'serif' | 'sans' | 'typewriter' | 'handwriting';

export interface AlbumTheme {
  cover: CoverId;
  paper: PaperId;
  frame: FrameId;
  font: FontId;
}

export const DEFAULT_THEME: AlbumTheme = {
  cover: 'leather',
  paper: 'cream',
  frame: 'polaroid',
  font: 'serif',
};

interface ThemeOption<Id extends string> {
  id: Id;
  label: string;
  /** Amostra mostrada no seletor. */
  swatch: CSSProperties;
  vars: Record<string, string>;
}

const GRAIN =
  'repeating-linear-gradient(45deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 5px)';
const WEAVE =
  'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px)';
const SHEEN =
  'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.16), transparent 55%)';

function cover(
  id: CoverId,
  label: string,
  base: string,
  ink: string,
  accent: string,
  texture: string,
): ThemeOption<CoverId> {
  return {
    id,
    label,
    swatch: { background: base, backgroundImage: texture },
    vars: {
      '--cover-base': base,
      '--cover-texture': `${SHEEN}, ${texture}`,
      '--cover-ink': ink,
      '--cover-accent': accent,
    },
  };
}

export const COVER_OPTIONS: ThemeOption<CoverId>[] = [
  cover('leather', 'Couro', '#2a1f18', '#fdf3e3', '#e6b667', GRAIN),
  cover('navy', 'Marinho', '#1b2a3f', '#eaf1fb', '#8fb6e8', GRAIN),
  cover('burgundy', 'Bordô', '#3d1620', '#fbeaee', '#e08fa2', GRAIN),
  cover('charcoal', 'Carvão', '#161616', '#f2f2f2', '#b9b9b9', WEAVE),
  cover('linen', 'Linho', '#ded3c0', '#3a3128', '#8a6a3b', WEAVE),
  cover('kraft', 'Kraft', '#c79a63', '#33240f', '#5d3f18', WEAVE),
];

function paper(
  id: PaperId,
  label: string,
  base: string,
  ink: string,
  inkSoft: string,
  accent: string,
  frameBg: string,
): ThemeOption<PaperId> {
  return {
    id,
    label,
    swatch: { background: base },
    vars: {
      '--paper-base': base,
      '--paper-ink': ink,
      '--paper-ink-soft': inkSoft,
      '--paper-accent': accent,
      '--frame-bg': frameBg,
    },
  };
}

export const PAPER_OPTIONS: ThemeOption<PaperId>[] = [
  paper('cream', 'Creme', '#f7f3ec', '#3a332b', '#8b8175', '#9a6b2f', '#ffffff'),
  paper('white', 'Branco', '#fdfdfb', '#2f2f2f', '#8d8d8d', '#7a6a4f', '#ffffff'),
  paper('kraft', 'Kraft', '#e6d5b8', '#41341f', '#8a7550', '#7a4f1d', '#fbf7ef'),
  paper('charcoal', 'Carvão', '#1f1f22', '#eceae6', '#9a968f', '#d8b06a', '#2b2b2f'),
];

export const FRAME_OPTIONS: { id: FrameId; label: string; hint: string }[] = [
  { id: 'polaroid', label: 'Margem', hint: 'Borda branca, como foto revelada' },
  { id: 'corners', label: 'Cantoneiras', hint: 'Presa por quatro cantos de papel' },
  { id: 'bleed', label: 'Sangrada', hint: 'Foto sem moldura, ocupando o espaço' },
];

export const FONT_OPTIONS: { id: FontId; label: string; stack: string }[] = [
  { id: 'serif', label: 'Serifada', stack: 'Georgia, "Times New Roman", serif' },
  {
    id: 'sans',
    label: 'Sem serifa',
    stack: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'typewriter',
    label: 'Máquina',
    stack: '"Courier New", ui-monospace, monospace',
  },
  {
    id: 'handwriting',
    label: 'À mão',
    stack: '"Segoe Script", "Bradley Hand", "Brush Script MT", cursive',
  },
];

/** Monta as CSS vars do tema para aplicar na raiz do livro. */
export function themeToStyle(theme: AlbumTheme): CSSProperties {
  const coverOption =
    COVER_OPTIONS.find((option) => option.id === theme.cover) ?? COVER_OPTIONS[0];
  const paperOption =
    PAPER_OPTIONS.find((option) => option.id === theme.paper) ?? PAPER_OPTIONS[0];
  const fontOption =
    FONT_OPTIONS.find((option) => option.id === theme.font) ?? FONT_OPTIONS[0];

  return {
    ...coverOption.vars,
    ...paperOption.vars,
    '--album-font': fontOption.stack,
  } as CSSProperties;
}
