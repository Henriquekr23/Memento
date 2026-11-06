import type { Photo } from '@/types/photo';

/** Nome da foto para o leitor de tela: o arquivo, sem a extensão. */
export function photoName(photo: Pick<Photo, 'fileName'>): string {
  const dot = photo.fileName.lastIndexOf('.');
  return dot > 0 ? photo.fileName.slice(0, dot) : photo.fileName;
}
