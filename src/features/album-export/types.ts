import type { StoryInsertion } from '@/lib/paginate';
import type { Photo } from '@/types/photo';

/** O que é entregue ao exportador — só o necessário, nada do estado de UI. */
export interface AlbumSnapshot {
  name: string;
  /** Já na ordem final e contendo apenas as fotos incluídas. */
  photos: Photo[];
  /** Legenda por foto, indexada pelo id. */
  photoCaptions?: Readonly<Record<string, string>>;
  /** Páginas de texto escritas pelo usuário, na ordem em que foram criadas. */
  stories?: readonly StoryInsertion[];
}

export interface ExportProgress {
  processed: number;
  total: number;
}

/**
 * Contrato de exportação.
 *
 * Fase 1: `ZipAlbumExporter` monta um .zip no navegador.
 * Fase 2: basta uma implementação `ApiAlbumExporter` que faz upload e devolve
 * um link público — a UI que chama isto não muda.
 */
export interface AlbumExporter {
  readonly id: string;
  readonly label: string;
  export(
    album: AlbumSnapshot,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<void>;
}
