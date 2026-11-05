/**
 * Os quadros da etapa "Confira a ordem" — funções puras, sem React.
 *
 * As páginas da etapa 2 são uma lista de **quadros** (`Cells`), página após
 * página, cada um com o id de uma foto ou vazio. Não são derivadas da ordem
 * das fotos: a pessoa pode deixar um quadro vazio no meio e pôr a foto onde
 * quiser, como faria com papel. A lista guardada pode estar desatualizada (uma
 * foto saiu, outra chegou); `syncCells` a acerta a cada leitura, sem efeito.
 */

import { isDated } from '@/features/album-builder/selection';
import type { Photo } from '@/types/photo';

import { pageCountFor, type PerPage } from './paginate';

export type Cells = (string | null)[];

/** Índice do último quadro ocupado, ou -1. */
export function lastFilled(cells: Cells): number {
  for (let i = cells.length - 1; i >= 0; i -= 1) if (cells[i] !== null) return i;
  return -1;
}

/**
 * Os quadros que valem agora.
 *
 * Quem saiu do álbum deixa o quadro vazio (o resto não anda); quem chegou
 * entra depois do último quadro ocupado, na ordem da lista. O tamanho é o de
 * páginas inteiras: sempre par, nunca menos que o piso (`pageCountFor`).
 */
export function syncCells(
  stored: Cells | null,
  included: readonly string[],
  perPage: PerPage,
): Cells {
  const inside = new Set(included);
  const seen = new Set<string>();
  const cells: Cells = (stored ?? []).map((id) => {
    if (id === null || !inside.has(id) || seen.has(id)) return null;
    seen.add(id);
    return id;
  });

  let last = lastFilled(cells);
  for (const id of included) {
    if (seen.has(id)) continue;
    last += 1;
    cells[last] = id;
    seen.add(id);
  }

  const total = pageCountFor(last + 1, perPage) * perPage;
  return Array.from({ length: total }, (_, index) => cells[index] ?? null);
}

/**
 * Leva a foto `id` para o quadro `to`. Quadro ocupado: as duas trocam de
 * lugar. Quadro vazio: a foto muda, e o quadro de onde ela saiu fica vazio.
 */
export function placeAt(cells: Cells, id: string, to: number): Cells {
  const from = cells.indexOf(id);
  if (from === -1 || from === to || to < 0 || to >= cells.length) return cells;
  const next = [...cells];
  next[from] = cells[to];
  next[to] = id;
  return next;
}

/**
 * Põe `id` no quadro `at` empurrando para a frente só até o primeiro quadro
 * vazio — um buraco mais adiante absorve o empurrão, e o resto do álbum não
 * anda.
 */
export function insertAt(cells: Cells, at: number, id: string): Cells {
  const next = cells.filter((value) => value !== id);
  let carry: string | null = id;
  for (let i = Math.max(0, at); carry !== null; i += 1) {
    if (i >= next.length) {
      next.push(carry);
      break;
    }
    const here: string | null = next[i];
    next[i] = carry;
    carry = here;
  }
  return next;
}

/**
 * Onde a foto entra quando volta ao álbum: antes do primeiro quadro ocupado
 * por uma foto de data maior (ou sem data). Sem data, ou sem ninguém depois
 * dela, entra logo depois do último quadro ocupado.
 */
export function chronologicalSlot(
  cells: Cells,
  photo: Pick<Photo, 'id' | 'timestamp' | 'timestampSource'>,
  byId: ReadonlyMap<string, Pick<Photo, 'timestamp' | 'timestampSource'>>,
): number {
  if (isDated(photo)) {
    const time = photo.timestamp.getTime();
    const index = cells.findIndex((id) => {
      if (id === null || id === photo.id) return false;
      const other = byId.get(id);
      return !!other && (!isDated(other) || other.timestamp.getTime() > time);
    });
    if (index !== -1) return index;
  }
  return lastFilled(cells.map((id) => (id === photo.id ? null : id))) + 1;
}

/** Só as fotos, na ordem dos quadros: o que a troca de layout reflui. */
export function compactCells(cells: Cells): string[] {
  return cells.filter((id): id is string => id !== null);
}

/** Os quadros cortados em páginas. */
export function toPages(cells: Cells, perPage: PerPage): Cells[] {
  const pages: Cells[] = [];
  for (let i = 0; i < cells.length; i += perPage) pages.push(cells.slice(i, i + perPage));
  return pages;
}
