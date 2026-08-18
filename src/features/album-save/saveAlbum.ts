'use client';

import { PHOTOS_BUCKET } from '@/lib/supabase/env';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Photo } from '@/types/photo';

import { createAlbumDraft, finalizeAlbum, type SavePhotoInput } from './actions';
import { pruneComposition, type AlbumComposition } from './composition';
import { prepareUpload, UPLOAD_MIME } from './prepareUpload';

/**
 * Guardar o álbum na nuvem, do lado do navegador.
 *
 * Esta função é o gêmeo de `pdfExporter`: recebe exatamente os mesmos dados —
 * as fotos na ordem final e a composição — e, em vez de desenhar páginas,
 * sobe imagens. Nada de `album-builder/` ou `exif-reader/` mudou para isso
 * existir; é por isso que a Fase 1 continua inteira.
 *
 * O caminho dos bytes é navegador → Storage, sem escala no servidor do Next:
 * um álbum de 40 fotos passaria do limite de corpo de requisição da Vercel no
 * free tier, e o servidor não tem nada a fazer com aqueles bytes.
 */

export interface SaveProgress {
  /** Fotos já enviadas. */
  processed: number;
  total: number;
}

export type SaveResult =
  | { ok: true; albumId: string }
  | { ok: false; error: string };

function toIso(date: Date | null | undefined): string | null {
  if (!date) return null;
  const time = date.getTime();
  return Number.isFinite(time) ? date.toISOString() : null;
}

export async function saveAlbumToCloud(input: {
  title: string;
  /** Já na ordem final e só as fotos incluídas — igual ao que o PDF recebe. */
  photos: readonly Photo[];
  composition: AlbumComposition;
  onProgress?: (progress: SaveProgress) => void;
}): Promise<SaveResult> {
  const { title, photos, composition, onProgress } = input;
  if (photos.length === 0) {
    return { ok: false, error: 'Inclua ao menos uma foto antes de guardar.' };
  }

  const draft = await createAlbumDraft(title);
  if (!draft.ok) return { ok: false, error: draft.error };
  const { albumId, userId } = draft.data;

  const supabase = getBrowserSupabase();
  const saved: SavePhotoInput[] = [];

  onProgress?.({ processed: 0, total: photos.length });

  // Sequencial de propósito. Em paralelo, cada foto grande dobra o pico de
  // memória do navegador (bitmap + canvas + blob) e o celular mata a aba
  // justamente no álbum grande, que é quando salvar importa mais.
  for (const [index, photo] of photos.entries()) {
    let prepared;
    try {
      prepared = await prepareUpload(photo);
    } catch {
      return { ok: false, error: `Não foi possível preparar "${photo.fileName}".` };
    }

    // A convenção do caminho é o que as políticas de Storage leem para decidir
    // quem pode ver o quê: {usuário}/{álbum}/{foto}. Mudou aqui, mude no SQL.
    const storagePath = `${userId}/${albumId}/${photo.id}.jpg`;

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

    saved.push({
      id: photo.id,
      position: index,
      storagePath,
      fileName: photo.fileName,
      width: prepared.width,
      height: prepared.height,
      takenAt: toIso(photo.exif.takenAt ?? photo.timestamp),
      timestampSource: photo.timestampSource,
    });

    onProgress?.({ processed: index + 1, total: photos.length });
  }

  const finalized = await finalizeAlbum({
    albumId,
    title,
    composition: pruneComposition(
      composition,
      photos.map((photo) => photo.id),
    ),
    photos: saved,
  });

  if (!finalized.ok) return { ok: false, error: finalized.error };
  return { ok: true, albumId };
}
