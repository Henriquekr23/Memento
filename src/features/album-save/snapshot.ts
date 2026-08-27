import { COMPOSITION_VERSION, type AlbumComposition } from './composition';
import type { EditorAlbum } from '@/types/album-editor';

/**
 * Estado do editor → documento salvável.
 *
 * Fica separado do hook porque é a **fronteira**: se um dia o estado editorial
 * mudar de forma, este é o único arquivo que precisa acompanhar — e o
 * `parseComposition` do outro lado continua lendo os álbuns antigos.
 */
export function snapshotComposition(album: EditorAlbum): AlbumComposition {
  return { version: COMPOSITION_VERSION, album };
}
