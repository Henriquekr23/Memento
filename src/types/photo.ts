/**
 * Tipos compartilhados do domínio.
 *
 * Fase 2: `Photo` continua válido — o que muda é a origem do `previewUrl`
 * (hoje um object URL local, depois uma URL de storage) e o `file`, que passa
 * a ser opcional quando a foto já estiver persistida no servidor.
 */

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

/** Metadados EXIF. Todo campo pode ser ausente — imagens editadas, prints e
 *  arquivos vindos de apps de mensagem costumam vir sem EXIF. */
export interface PhotoExif {
  takenAt: Date | null;
  gps: GpsCoordinates | null;
  cameraMake: string | null;
  cameraModel: string | null;
  width: number | null;
  height: number | null;
}

/** De onde veio o timestamp usado na ordenação. */
export type TimestampSource = 'exif' | 'file';

export interface Photo {
  id: string;
  /**
   * O arquivo escolhido pelo usuário. `null` num álbum carregado do banco:
   * ali existe a imagem, não o arquivo original — quem precisa dos bytes
   * (só o PDF) busca pelo `previewUrl`.
   */
  file: File | null;
  fileName: string;
  /** Extensão em minúsculas, sem ponto. Ex: "jpg" */
  extension: string;
  sizeInBytes: number;
  /**
   * Object URL para preview — ou, num álbum vindo do banco, a URL assinada da
   * foto no Storage. Object URLs precisam ser revogadas ao remover a foto;
   * URLs assinadas não (não há nada preso na memória do navegador).
   */
  previewUrl: string;
  exif: PhotoExif;
  /** Data efetiva usada para ordenar (EXIF quando existe, senão lastModified). */
  timestamp: Date;
  timestampSource: TimestampSource;
  /** Fotos não incluídas ficam na lista mas fora do álbum exportado. */
  included: boolean;
}

export interface Album {
  name: string;
  photos: Photo[];
}
