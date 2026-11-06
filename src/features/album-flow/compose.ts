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

import { layoutForCount, type PageGroups } from './pageGroups';
import { LAYOUT_FOR, MIN_PAGES, pageCountFor, type PerPage } from './paginate';

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
 * A composição com as páginas que a pessoa dividiu na etapa 2: um grupo, uma
 * página, com o tipo que cabe à contagem (`layoutForCount`). O álbum completa
 * com páginas vazias até fechar a folha e chegar ao piso de páginas.
 *
 * Com `base`, como em `composeFromOrder`: só as páginas são refeitas.
 */
export function composeFromGroups(
  groups: PageGroups,
  name: string,
  base?: EditorAlbum | null,
): EditorAlbum {
  const start = base ?? emptyAlbum();
  const pages = groups.map((group) => {
    const page = makePage({ layout: layoutForCount(group.length) });
    group.slice(0, MAX_SLOTS).forEach((id, slot) => {
      page.slots[slot].photoId = id;
    });
    return page;
  });
  const total = Math.max(MIN_PAGES, pages.length + (pages.length % 2));
  while (pages.length < total) pages.push(makePage());
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

/**
 * A divisão da etapa 2 lida de volta de uma composição já montada — o caminho
 * contrário de `composeFromGroups`, para reabrir um álbum guardado no fluxo.
 *
 * Uma página com foto, um grupo, na ordem das páginas. Página de texto ou
 * vazia não vira grupo (a etapa 2 só fala de fotos), e a mesma foto em dois
 * quadros conta uma vez só. É o ponto de partida: se a pessoa não mexer na
 * ordem, `groupsKey` disto bate com o da composição e nada é refeito.
 */
export function groupsFromComposition(album: EditorAlbum): PageGroups {
  const seen = new Set<string>();
  const groups: PageGroups = [];
  for (const page of album.pages) {
    const group: string[] = [];
    for (const slot of page.slots) {
      if (slot.photoId === null || seen.has(slot.photoId)) continue;
      seen.add(slot.photoId);
      group.push(slot.photoId);
    }
    if (group.length > 0) groups.push(group.slice(0, MAX_SLOTS));
  }
  return groups;
}
