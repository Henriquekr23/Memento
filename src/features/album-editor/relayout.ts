/**
 * Trocar o tipo de uma página — função pura, sem React.
 *
 * Antes a página guardava as fotos que o layout novo não mostrava: passar de
 * "duas empilhadas" para "página inteira" deixava a segunda foto escondida no
 * quadro 2, e para quem olhava ela tinha sumido do álbum. Agora a foto que não
 * cabe **anda para o fim do álbum**: vai para a primeira página vazia depois
 * da última página com conteúdo, ou para uma folha nova. Mais de uma foto
 * sobrando vai junto, numa página só, com o layout do tamanho delas.
 */

import {
  MAX_SLOTS,
  emptyFrame,
  layoutById,
  makePage,
  type EditorAlbum,
  type EditorLayoutId,
  type EditorPage,
  type PhotoFrame,
} from '@/types/album-editor';

/** Páginas entram sempre de duas em duas — é como a folha é impressa. */
const PAGES_PER_SHEET = 2;

/** O layout da página que recebe as fotos que sobraram, pela quantidade. */
const LAYOUT_FOR_COUNT: Record<number, EditorLayoutId> = {
  1: 'full',
  2: 'duoH',
  3: 'trio',
  4: 'quad',
};

/** Página sem foto, sem texto solto e sem título/corpo de página de texto. */
export function isBlankPage(page: EditorPage): boolean {
  return (
    page.slots.every((slot) => slot.photoId === null) &&
    page.textBlocks.length === 0 &&
    !page.heading.trim() &&
    !page.body.trim()
  );
}

export interface RelayoutResult {
  album: EditorAlbum;
  /** Página (índice 0-based) para onde as fotos que não couberam foram; `null` se nada andou. */
  movedTo: number | null;
  /** Quantas fotos andaram. */
  moved: number;
}

export function relayoutPage(
  album: EditorAlbum,
  pageIndex: number,
  layout: EditorLayoutId,
): RelayoutResult {
  const page = album.pages[pageIndex];
  if (!page) return { album, movedTo: null, moved: 0 };

  const capacity = layoutById(layout).slots;

  // Só o que estava à vista anda. Um quadro escondido com foto (de álbum salvo
  // antes desta regra) também anda: é foto que a pessoa não via.
  const overflow: PhotoFrame[] = page.slots
    .slice(capacity)
    .filter((slot) => slot.photoId !== null)
    .map((slot) => ({ ...slot }));

  const slots = page.slots.map((slot, k) => (k < capacity ? slot : emptyFrame()));
  const pages = album.pages.map((current, i) =>
    i === pageIndex ? { ...current, layout, slots } : current,
  );

  if (overflow.length === 0) {
    // Nada a mover: só o tipo muda.
    return { album: { ...album, pages }, movedTo: null, moved: 0 };
  }

  // O "fim do álbum": a primeira página em branco depois da última com
  // conteúdo. Sem nenhuma, o álbum ganha uma folha.
  let lastFilled = -1;
  pages.forEach((current, i) => {
    if (!isBlankPage(current)) lastFilled = i;
  });
  const target = lastFilled + 1;
  if (target >= pages.length) {
    for (let n = 0; n < PAGES_PER_SHEET; n += 1) pages.push(makePage());
  }

  const destination = pages[target];
  // No máximo três sobram (quatro quadros → um), então cabem numa página só.
  const count = Math.min(overflow.length, MAX_SLOTS);
  pages[target] = {
    ...destination,
    layout: LAYOUT_FOR_COUNT[count] ?? 'full',
    // A página nova herda o acabamento da página de onde as fotos saíram.
    fill: page.fill,
    gap: page.gap,
    slots: Array.from({ length: MAX_SLOTS }, (_, k) => overflow[k] ?? emptyFrame()),
  };

  return { album: { ...album, pages }, movedTo: target, moved: overflow.length };
}
