import type { AlbumBookState } from '@/features/album-book/useAlbumBook';

import { COMPOSITION_VERSION, type AlbumComposition } from './composition';

/**
 * Estado do livro → documento salvável.
 *
 * Fica separado do hook porque é a **fronteira**: se um dia o estado editorial
 * mudar de forma, este é o único arquivo que precisa acompanhar — e o
 * `parseComposition` do outro lado continua lendo os álbuns antigos.
 */
export function snapshotComposition(book: AlbumBookState): AlbumComposition {
  return {
    version: COMPOSITION_VERSION,
    layoutOverrides: book.layoutOverrides,
    captions: book.captions,
    photoCaptions: book.photoCaptions,
    dayNotes: book.dayNotes,
    adjustments: book.adjustments,
    placements: book.placements,
    composeModes: book.pageComposeModes,
    groupKeys: book.groupKeys,
    emptyPages: [...book.emptyPages],
    theme: book.theme,
    autoTilt: book.autoTiltEnabled,
  };
}
