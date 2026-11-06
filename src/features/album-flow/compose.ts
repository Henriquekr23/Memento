/**
 * A ponte entre a ordem (etapa 2) e a composição das páginas — funções puras.
 *
 * `fillChronologically` (no editor) preenche quadros vazios na ordem em que as
 * fotos chegam, uma por página. Aqui a pessoa já escolheu a ordem, então a
 * composição de partida é montada inteira a partir dela, `perPage` fotos por
 * página. Daí em diante o editor é dono dela (etapas 3 e 4): o
 * `fillChronologically` dele só encontra fotos já colocadas e não mexe em nada.
 */

import { emptyAlbum } from '@/features/album-editor/emptyAlbum';
import { MAX_SLOTS, makePage, type EditorAlbum } from '@/types/album-editor';

import { LAYOUT_FOR, pageCountFor, type PerPage } from './paginate';

/**
 * A composição com as fotos na ordem dada.
 *
 * Com `base` (o álbum que a pessoa já tinha montado), só as páginas são
 * refeitas: capa, cor, papel, lombada e verso continuam como estavam.
 */
export function composeFromOrder(
  ids: readonly string[],
  perPage: PerPage,
  name: string,
  base?: EditorAlbum | null,
): EditorAlbum {
  const start = base ?? emptyAlbum();
  const pages = Array.from({ length: pageCountFor(ids.length, perPage) }, (_, index) => {
    const page = makePage({ layout: LAYOUT_FOR[perPage] });
    for (let slot = 0; slot < Math.min(perPage, MAX_SLOTS); slot += 1) {
      page.slots[slot].photoId = ids[index * perPage + slot] ?? null;
    }
    return page;
  });
  return { ...start, name, pages };
}

/**
 * O álbum montado, sem as fotos que saíram dele.
 *
 * O quadro fica vazio no lugar — o resto da página não anda. É o que o editor
 * faria se a foto fosse tirada lá dentro (`dropPhoto`).
 */
export function pruneComposition(
  album: EditorAlbum,
  keep: ReadonlySet<string>,
): EditorAlbum {
  let changed = false;
  const pages = album.pages.map((page) => {
    if (page.slots.every((slot) => slot.photoId === null || keep.has(slot.photoId))) {
      return page;
    }
    changed = true;
    return {
      ...page,
      slots: page.slots.map((slot) =>
        slot.photoId !== null && !keep.has(slot.photoId) ? { ...slot, photoId: null } : slot,
      ),
    };
  });
  return changed ? { ...album, pages } : album;
}
