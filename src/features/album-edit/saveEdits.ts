'use client';

import { PHOTOS_BUCKET } from '@/lib/supabase/env';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Photo } from '@/types/photo';

import type { SavePhotoInput } from '@/features/album-save/actions';
import { pruneComposition, type AlbumComposition } from '@/features/album-save/composition';
import { prepareUpload, UPLOAD_MIME } from '@/features/album-save/prepareUpload';

import { saveAlbumEdits } from './actions';
import { planPhotoSync, type StoredPhoto } from './plan';

/**
 * Guardar as mudanças de um álbum que já está na nuvem.
 *
 * É `saveAlbumToCloud` com uma economia no meio: **as fotos que já subiram não
 * sobem de novo**. Mudar uma legenda ou trocar duas páginas de lugar não pode
 * custar o upload do álbum inteiro — em conexão de celular isso são minutos, e
 * é o gesto mais comum depois de salvar.
 *
 * O que sobe é o que a pessoa acrescentou nesta sessão de edição; o que ela
 * tirou some do índice e, em seguida, do bucket (`saveAlbumEdits` cuida disso,
 * onde a permissão de apagar existe).
 */

export interface EditSaveProgress {
  processed: number;
  total: number;
}

export type EditSaveResult = { ok: true } | { ok: false; error: string };

function toIso(date: Date | null | undefined): string | null {
  if (!date) return null;
  const time = date.getTime();
  return Number.isFinite(time) ? date.toISOString() : null;
}

export async function saveAlbumEditsFromBrowser(input: {
  albumId: string;
  /** Dono do álbum: é a pasta dele que guarda as fotos, mesmo as que um convidado acrescenta. */
  ownerId: string;
  title: string;
  /** Já na ordem final e só as fotos incluídas — igual ao que o PDF recebe. */
  photos: readonly Photo[];
  /** O que o banco já tem, vindo do carregamento da página. */
  stored: readonly StoredPhoto[];
  composition: AlbumComposition;
  onProgress?: (progress: EditSaveProgress) => void;
}): Promise<EditSaveResult> {
  const { albumId, ownerId, title, photos, stored, composition, onProgress } = input;
  if (photos.length === 0) {
    return { ok: false, error: 'Inclua ao menos uma foto antes de guardar.' };
  }

  const plan = planPhotoSync(
    stored,
    photos.map((photo) => photo.id),
  );
  const pathById = new Map(stored.map((photo) => [photo.id, photo.storagePath]));
  const toUpload = new Set(plan.newIds);

  const supabase = getBrowserSupabase();
  const rows: SavePhotoInput[] = [];

  onProgress?.({ processed: 0, total: toUpload.size });
  let processed = 0;

  for (const [index, photo] of photos.entries()) {
    const known = pathById.get(photo.id);

    if (known && !toUpload.has(photo.id)) {
      rows.push({
        id: photo.id,
        position: index,
        storagePath: known,
        fileName: photo.fileName,
        width: photo.exif.width ?? 0,
        height: photo.exif.height ?? 0,
        takenAt: toIso(photo.exif.takenAt ?? photo.timestamp),
        timestampSource: photo.timestampSource,
      });
      continue;
    }

    let prepared;
    try {
      prepared = await prepareUpload(photo);
    } catch {
      return { ok: false, error: `Não foi possível preparar "${photo.fileName}".` };
    }

    // A mesma convenção da Fase 2 — {dono}/{álbum}/{foto}.jpg —, e é ela que a
    // política de Storage lê para deixar (ou não) um colaborador gravar aqui.
    const storagePath = `${ownerId}/${albumId}/${photo.id}.jpg`;

    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, prepared.blob, {
        contentType: UPLOAD_MIME,
        upsert: true,
      });

    if (error) {
      return {
        ok: false,
        error: `Falha ao enviar "${photo.fileName}". Verifique a conexão e tente de novo.`,
      };
    }

    rows.push({
      id: photo.id,
      position: index,
      storagePath,
      fileName: photo.fileName,
      width: prepared.width,
      height: prepared.height,
      takenAt: toIso(photo.exif.takenAt ?? photo.timestamp),
      timestampSource: photo.timestampSource,
    });

    processed += 1;
    onProgress?.({ processed, total: toUpload.size });
  }

  const result = await saveAlbumEdits({
    albumId,
    title,
    composition: pruneComposition(
      composition,
      photos.map((photo) => photo.id),
    ),
    photos: rows,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
