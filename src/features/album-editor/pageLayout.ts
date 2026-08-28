/**
 * A geometria de uma página do miolo, em milímetros.
 *
 * Módulo puro (sem React, sem DOM): a tela desenha a partir daqui e o canvas do
 * PDF também. Enquanto as margens da página moravam escritas nos dois lugares,
 * mudar o preenchimento significava mudar a mesma medida duas vezes — e a
 * segunda sempre ficava para depois.
 */

import { SPEC } from '@/features/album-print/spec';
import type { EditorPage } from '@/types/album-editor';

export type SpineSide = 'left' | 'right';

/** Margem da página quando ela **não** é de preenchimento total. */
export const PAGE_MARGIN = 10;

export interface PageInsets {
  /** Recuos a partir da borda do contêiner desenhado, em mm. */
  top: number;
  right: number;
  bottom: number;
  left: number;
  /** Respiro entre quadros, em mm. */
  gap: number;
}

/**
 * `bleedMm` é a sangria que existe **no contêiner** — 5 mm na página de
 * impressão, 0 na miniatura. Medir a partir do contêiner, e não da área final,
 * é o que faz a miniatura e o arquivo mostrarem o mesmo enquadramento.
 *
 * Em preenchimento total o recuo é zero: o quadro vai até a borda do arquivo,
 * sangria inclusive, que é o que "sem margem" quer dizer numa gráfica.
 */
export function pageInsets(
  page: EditorPage,
  spineSide: SpineSide,
  bleedMm: number,
): PageInsets {
  if (page.fill) {
    return { top: 0, right: 0, bottom: 0, left: 0, gap: Math.max(0, page.gap) };
  }
  const outer = bleedMm + PAGE_MARGIN;
  // O lado da lombada respeita a área segura: conteúdo colado na dobra some
  // dentro da cola.
  const spine = bleedMm + SPEC.safe.spine;
  return {
    top: outer,
    bottom: outer,
    left: spineSide === 'left' ? spine : outer,
    right: spineSide === 'right' ? spine : outer,
    gap: Math.max(0, page.gap),
  };
}

/**
 * O número da página, medido a partir da **área final** — o corte é a
 * referência que a gráfica usa, e é ele que a pessoa vê no livro pronto.
 */
export const PAGE_NUMBER = {
  /** Distância do corte externo (o lado oposto à lombada). */
  edge: 7,
  /** Distância do corte de baixo. */
  bottom: 6,
  /** Corpo, em mm. */
  size: 2.6,
};

/**
 * Respiro do fundo de uma caixa de texto, em múltiplos do corpo. Como tudo
 * aqui, é lido pela tela e pelo canvas do PDF — um respiro só na tela mudaria a
 * quebra de linha entre a página montada e a página impressa.
 */
export const TEXT_PAD = { x: 0.7, y: 0.45 };

/** Fundos possíveis de uma caixa de texto. */
export const TEXT_BACKDROP = {
  paper: 'rgba(255, 255, 255, 0.86)',
  shade: 'rgba(0, 0, 0, 0.34)',
};

/**
 * O número da página cai sobre foto ou sobre papel?
 * Sobre foto ele é claro e ganha sombra; sobre papel, escuro e limpo. Com o
 * preenchimento total, uma grade de quatro fotos também é "sobre foto".
 */
export function numberOverPhoto(page: EditorPage): boolean {
  if (page.layout === 'text' || page.layout === 'inset') return false;
  return page.layout === 'full' || page.fill;
}
