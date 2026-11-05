/**
 * A ponte entre a etapa 2 e o editor — funções puras.
 *
 * `fillChronologically` (no editor) preenche quadros vazios na ordem em que as
 * fotos chegam, uma por página. Aqui a pessoa já escolheu em que quadro cada
 * foto fica e quantas cabem em cada página, então a composição de partida é
 * montada inteira a partir dos quadros da etapa 2 (`cells.ts`), com os vazios
 * no lugar. Daí em diante o editor é dono dela: o `fillChronologically` dele
 * só encontra fotos já colocadas e não mexe em nada.
 */

import { emptyAlbum } from '@/features/album-editor/emptyAlbum';
import { MAX_SLOTS, makePage, type EditorAlbum } from '@/types/album-editor';

import { toPages, type Cells } from './cells';
import { LAYOUT_FOR, type PerPage } from './paginate';

/**
 * A composição com as páginas da etapa 2.
 *
 * Com `base` (o álbum que a pessoa já tinha montado no editor), só as páginas
 * são refeitas: capa, cor, papel, lombada e verso continuam como estavam.
 */
export function composeFromCells(
  cells: Cells,
  perPage: PerPage,
  name: string,
  base?: EditorAlbum | null,
): EditorAlbum {
  const start = base ?? emptyAlbum();
  const pages = toPages(cells, perPage).map((slots) => {
    const page = makePage({ layout: LAYOUT_FOR[perPage] });
    slots.forEach((photoId, index) => {
      if (index < MAX_SLOTS) page.slots[index].photoId = photoId;
    });
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
