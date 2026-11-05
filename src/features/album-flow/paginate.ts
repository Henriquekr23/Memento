/**
 * As páginas da etapa "Confira a ordem", antes do editor existir.
 *
 * Módulo puro (sem React): quantas páginas, que layout, e em aberturas. Os
 * quadros em si moram em `cells.ts`; a prévia da etapa 2 e a composição
 * inicial do editor (`compose.ts`) leem os mesmos quadros — é o que garante que
 * o editor abre com as mesmas páginas que a pessoa acabou de conferir.
 */

import type { EditorLayoutId } from '@/types/album-editor';

export type PerPage = 1 | 2 | 3 | 4;

export const PER_PAGE_OPTIONS: readonly PerPage[] = [1, 2, 3, 4];

/** O ponto de partida: duas por página, como no protótipo aprovado. */
export const DEFAULT_PER_PAGE: PerPage = 2;

/**
 * O layout do editor para cada escolha. 2 = duas empilhadas (`duoH`), 3 = uma
 * grande em cima e duas embaixo (`trio`).
 */
export const LAYOUT_FOR: Record<PerPage, EditorLayoutId> = {
  1: 'full',
  2: 'duoH',
  3: 'trio',
  4: 'quad',
};

/** Mesmo piso do editor (`MIN_PAGES`): uma folha aberta de cada lado. */
export const MIN_PAGES = 4;

/** Páginas que o álbum precisa: sempre par, nunca menos que o piso. */
export function pageCountFor(photoCount: number, perPage: PerPage): number {
  const needed = Math.ceil(photoCount / perPage);
  const even = needed + (needed % 2);
  return Math.max(MIN_PAGES, even);
}

/** Páginas em aberturas (pares esquerda/direita), como a folha é impressa. */
export function toSpreads<T>(pages: readonly T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < pages.length; i += 2) out.push([pages[i], pages[i + 1]]);
  return out;
}

/**
 * A assinatura do plano: muda se mudar a ordem, quem está dentro, um quadro
 * vazio de lugar ou o layout.
 */
export function planSignature(cells: readonly (string | null)[], perPage: PerPage): string {
  return `${perPage}|${cells.map((id) => id ?? '').join(',')}`;
}
