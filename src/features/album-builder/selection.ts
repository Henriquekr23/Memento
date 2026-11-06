import type { Photo } from '@/types/photo';

/**
 * Quais fotos do acervo estão no álbum — funções puras, sem React.
 *
 * Tirar uma foto do álbum não a apaga do acervo: ela continua na linha do
 * tempo, cinza, esperando para voltar. Por isso a escolha é um conjunto de
 * **excluídas** ao lado da lista importada, e não um `filter` que joga a foto
 * fora. A lista (`useAlbum`) segue sendo a ordem; o conjunto só diz quem fica
 * de fora dela.
 *
 * Onde a foto entra quando volta é conta dos quadros da etapa 2
 * (`album-flow/cells.ts`), não da lista.
 *
 * Fase 2: a mesma conta vale para um álbum salvo — a lista vem do banco, o
 * conjunto começa vazio.
 */

/** O mínimo que estas funções precisam saber de uma foto. */
export type Selectable = Pick<Photo, 'id' | 'timestamp' | 'timestampSource'>;

/** Foto com data de verdade (EXIF). A data do arquivo não conta como data. */
export function isDated(photo: Pick<Photo, 'timestampSource'>): boolean {
  return photo.timestampSource === 'exif';
}

/** As fotos do álbum, na ordem da lista. */
export function includedInOrder<T extends Selectable>(
  photos: readonly T[],
  excluded: ReadonlySet<string>,
): T[] {
  if (excluded.size === 0) return [...photos];
  return photos.filter((photo) => !excluded.has(photo.id));
}

/** Tira do conjunto ids que não existem mais no acervo. */
export function pruneExcluded(
  excluded: ReadonlySet<string>,
  photos: readonly Pick<Photo, 'id'>[],
): Set<string> {
  const known = new Set(photos.map((photo) => photo.id));
  return new Set([...excluded].filter((id) => known.has(id)));
}
