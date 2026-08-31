/**
 * O que muda quando um álbum salvo é salvo de novo.
 *
 * Função pura, sem React e sem Supabase — dá para conferir com `tsx`, como as
 * de `lib/`. Ela existe porque reeditar um álbum não é "salvar tudo outra
 * vez": as fotos que já estão na nuvem não devem subir de novo (seriam
 * megabytes e minutos a cada ajuste de legenda), e as que saíram do álbum
 * precisam sair também do Storage — senão o 1 GB do free tier vira um cemitério
 * de arquivos que nada referencia.
 *
 * O critério de "já está lá" é o id da foto, não o nome do arquivo: é o id que
 * a composição referencia, e é ele que compõe o caminho no bucket.
 */

export interface StoredPhoto {
  id: string;
  storagePath: string;
}

export interface PhotoSyncPlan {
  /** Ids que já estão no Storage e continuam no álbum — nada a enviar. */
  keptIds: string[];
  /** Ids que entraram agora e precisam subir. */
  newIds: string[];
  /** Fotos que saíram do álbum: linha e arquivo vão embora. */
  removed: StoredPhoto[];
}

/**
 * @param stored O que o banco tem hoje para este álbum.
 * @param finalIds Os ids na ordem final, do jeito que a pessoa deixou a
 *   bancada. Repetido é ignorado — a mesma foto não ocupa duas posições.
 */
export function planPhotoSync(
  stored: readonly StoredPhoto[],
  finalIds: readonly string[],
): PhotoSyncPlan {
  const storedById = new Map(stored.map((photo) => [photo.id, photo]));

  const keptIds: string[] = [];
  const newIds: string[] = [];
  const seen = new Set<string>();

  for (const id of finalIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (storedById.has(id)) keptIds.push(id);
    else newIds.push(id);
  }

  const removed = stored.filter((photo) => !seen.has(photo.id));

  return { keptIds, newIds, removed };
}
