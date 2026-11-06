/**
 * As páginas da etapa 2 ("Confira a ordem") — módulo puro, sem React.
 *
 * A ordem das fotos já nasce dividida em páginas: cada grupo é uma página, com
 * no máximo `MAX_PER_PAGE` fotos. A etapa 3 monta as páginas exatamente assim
 * (`composeFromGroups`), com o tipo de página que cabe a cada contagem — uma
 * foto ocupa a página, quatro viram grade.
 *
 * Os grupos guardam só ids. Quem está no álbum e em que ordem continua sendo do
 * acervo (`useAlbum`) e da seleção (`useAlbumSelection`); `syncGroups` acerta
 * os grupos com a lista de incluídas a cada mudança de lá (foto nova, foto
 * tirada, foto devolvida), sem desmanchar a divisão que a pessoa fez.
 */

import { sortPhotosChronologically } from '@/lib/sortPhotos';
import type { EditorLayoutId } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import { DEFAULT_PER_PAGE } from './paginate';
import { photoName } from './photoName';

export const MAX_PER_PAGE = 4;

export type PageGroups = string[][];

/** O tipo de página do editor para cada contagem de fotos. */
export function layoutForCount(count: number): EditorLayoutId {
  if (count >= 4) return 'quad';
  if (count === 3) return 'trio';
  if (count === 2) return 'duoH';
  return 'full';
}

/** Fatias de `size` fotos, na ordem. */
export function chunk(ids: readonly string[], size: number = DEFAULT_PER_PAGE): PageGroups {
  const out: PageGroups = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

export function flatten(groups: PageGroups): string[] {
  return groups.flat();
}

/** Chave estável da divisão: muda se a ordem **ou** a divisão mudar. */
export function groupsKey(groups: PageGroups): string {
  return groups.map((group) => group.join(',')).join('|');
}

/**
 * Os grupos acertados com a lista de incluídas, em ordem.
 *
 * - Quem saiu do álbum sai do grupo; grupo vazio some.
 * - Quem entrou e não está em grupo nenhum entra **depois da foto que vem
 *   antes dela** na lista: uma foto só (a que voltou pelo "Desfazer") cabe no
 *   grupo dessa vizinha se ele tiver vaga; um lote de fotos novas vira páginas
 *   novas de `DEFAULT_PER_PAGE`, logo depois.
 */
export function syncGroups(groups: PageGroups, ids: readonly string[]): PageGroups {
  const wanted = new Set(ids);
  const next = groups
    .map((group) => group.filter((id) => wanted.has(id)))
    .filter((group) => group.length > 0);

  const placed = new Set(flatten(next));
  let i = 0;
  while (i < ids.length) {
    if (placed.has(ids[i])) {
      i += 1;
      continue;
    }
    // O lote de ids seguidos que ainda não têm página.
    const run: string[] = [];
    let j = i;
    while (j < ids.length && !placed.has(ids[j])) {
      run.push(ids[j]);
      j += 1;
    }
    const before = i > 0 ? ids[i - 1] : null;
    const at = before === null ? -1 : next.findIndex((group) => group.includes(before));

    if (run.length === 1 && at >= 0 && next[at].length < MAX_PER_PAGE) {
      const group = next[at];
      group.splice(group.indexOf(before as string) + 1, 0, run[0]);
    } else {
      next.splice(at + 1, 0, ...chunk(run));
    }
    run.forEach((id) => placed.add(id));
    i = j;
  }
  return next;
}

/**
 * Leva a foto para a página `group`, na posição `index` (antes de quem estava
 * ali). `group === groups.length` é uma página nova no fim. Página cheia não
 * recebe foto de outra página: devolve `null` e nada muda.
 */
export function moveToGroup(
  groups: PageGroups,
  id: string,
  group: number,
  index: number,
): PageGroups | null {
  const from = groups.findIndex((items) => items.includes(id));
  if (from < 0 || group < 0 || group > groups.length) return null;
  if (group !== from && group < groups.length && groups[group].length >= MAX_PER_PAGE) {
    return null;
  }

  const next = groups.map((items) => [...items]);
  const fromIndex = next[from].indexOf(id);
  next[from].splice(fromIndex, 1);

  if (group === groups.length) {
    next.push([id]);
  } else {
    // Na mesma página, tirar a foto antes já puxou as de depois uma casa.
    const at = group === from && fromIndex < index ? index - 1 : index;
    next[group].splice(Math.max(0, Math.min(at, next[group].length)), 0, id);
  }

  const result = next.filter((items) => items.length > 0);
  return groupsKey(result) === groupsKey(groups) ? null : result;
}

/** As fotos na ordem nova, nas mesmas páginas de antes (mesmas contagens). */
export function regroup(groups: PageGroups, ordered: readonly string[]): PageGroups {
  const out: PageGroups = [];
  let cursor = 0;
  for (const group of groups) {
    if (cursor >= ordered.length) break;
    out.push(ordered.slice(cursor, cursor + group.length));
    cursor += group.length;
  }
  if (cursor < ordered.length) out.push(...chunk(ordered.slice(cursor)));
  return out;
}

export type SortMode = 'date' | 'dateDesc' | 'name' | 'random' | 'custom';

export const SORT_MODES: readonly SortMode[] = ['date', 'dateDesc', 'name', 'random', 'custom'];

/**
 * A ordem padrão escolhida. `random` usa `random` (injetável, para o script
 * de verificação); `custom` não é ordenação — é a divisão que a pessoa fez à
 * mão, guardada por quem chama.
 */
export function sortedIds(
  photos: readonly Photo[],
  mode: Exclude<SortMode, 'custom'>,
  random: () => number = Math.random,
): string[] {
  if (mode === 'date') return sortPhotosChronologically(photos, 'asc').map((photo) => photo.id);
  if (mode === 'dateDesc') {
    return sortPhotosChronologically(photos, 'desc').map((photo) => photo.id);
  }
  if (mode === 'name') {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...photos]
      .sort((a, b) => collator.compare(photoName(a), photoName(b)))
      .map((photo) => photo.id);
  }
  const ids = photos.map((photo) => photo.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/**
 * A lista inteira do acervo com as incluídas na ordem nova. Quem está fora
 * fica onde estava — é a posição dele que decide onde ele volta.
 */
export function mergeOrder(
  allIds: readonly string[],
  excluded: ReadonlySet<string>,
  includedOrder: readonly string[],
): string[] {
  let cursor = 0;
  return allIds.map((id) => (excluded.has(id) ? id : includedOrder[cursor++] ?? id));
}
