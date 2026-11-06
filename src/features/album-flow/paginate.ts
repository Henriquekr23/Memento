/**
 * As contas de página da /album — módulo puro, sem React: o layout de partida
 * de cada contagem, o piso de páginas e as aberturas.
 */

import type { EditorLayoutId } from '@/types/album-editor';

export type PerPage = 1 | 2 | 3 | 4;

export const PER_PAGE_OPTIONS: readonly PerPage[] = [1, 2, 3, 4];

/** O ponto de partida das páginas: duas fotos por página. */
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
  return Math.max(MIN_PAGES, needed + (needed % 2));
}

/** Páginas em aberturas (pares esquerda/direita), como a folha é impressa. */
export function toSpreads<T>(pages: readonly T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < pages.length; i += 2) out.push([pages[i], pages[i + 1]]);
  return out;
}
