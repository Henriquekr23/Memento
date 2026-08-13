import type { AlbumTheme } from '@/features/album-style/theme';
import type { AlbumPage, StoryInsertion } from '@/lib/paginate';
import type {
  ComposeMode,
  PhotoAdjustment,
  PhotoPlacement,
} from '@/types/page';
import type { Photo } from '@/types/photo';

/**
 * Como o álbum está montado agora.
 *
 * Existe porque o PDF não é uma lista de fotos: é a página como o usuário a
 * compôs — o papel escolhido, a foto que ele girou, a que ele arrastou para o
 * canto. São dados puros (nada de funções ou estado de React) de propósito, para
 * que gerar o PDF continue sendo uma função de dados em dados, testável fora do
 * navegador.
 */
export interface AlbumComposition {
  pages: readonly AlbumPage[];
  theme: AlbumTheme;
  /** Legenda por página, indexada pela chave da página. */
  pageCaptions: Readonly<Record<string, string>>;
  composeModes: Readonly<Record<string, ComposeMode>>;
  adjustments: Readonly<Record<string, PhotoAdjustment>>;
  placements: Readonly<Record<string, PhotoPlacement>>;
  autoTilt: boolean;
}

/** O que é entregue ao exportador — só o necessário, nada do estado de UI. */
export interface AlbumSnapshot {
  name: string;
  /** Já na ordem final e contendo apenas as fotos incluídas. */
  photos: Photo[];
  /** Legenda por foto, indexada pelo id. */
  photoCaptions?: Readonly<Record<string, string>>;
  /** Páginas de texto escritas pelo usuário, na ordem em que foram criadas. */
  stories?: readonly StoryInsertion[];
  /**
   * Opcional: sem ela o exportador refaz a paginação com o tema padrão. O PDF
   * precisa dela para sair igual ao que está na tela; um exportador futuro que
   * só suba os arquivos, não.
   */
  book?: AlbumComposition;
}

export interface ExportProgress {
  processed: number;
  total: number;
}

/**
 * Contrato de exportação.
 *
 * Fase 1: `pdfAlbumExporter` monta o álbum inteiro no navegador.
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
