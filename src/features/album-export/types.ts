import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

/** O que é entregue ao exportador — só o necessário, nada do estado de UI. */
export interface AlbumSnapshot {
  name: string;
  /** O acervo referenciado pelos quadros do álbum. */
  photos: Photo[];
  /**
   * A composição inteira: capa, lombada e páginas. Sem ela não há o que
   * exportar — no modelo novo a página não é derivada da lista de fotos, é
   * dado. São dados puros (nada de funções ou estado de React) de propósito,
   * para que gerar o PDF continue sendo uma função de dados em dados, testável
   * fora do navegador.
   */
  album: EditorAlbum;
}

export interface ExportProgress {
  processed: number;
  total: number;
}

/**
 * Contrato de exportação.
 *
 * Fase 1: `printAlbumExporter` monta o arquivo de impressão no navegador.
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
