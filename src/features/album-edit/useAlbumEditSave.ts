'use client';

import { useCallback, useState } from 'react';

import { snapshotComposition } from '@/features/album-save/snapshot';
import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import type { StoredPhoto } from './plan';
import { saveAlbumEditsFromBrowser, type EditSaveProgress } from './saveEdits';

export interface EditSaveInput {
  albumId: string;
  ownerId: string;
  title: string;
  /** Só as incluídas, na ordem final — o mesmo que o PDF recebe. */
  photos: readonly Photo[];
  stored: readonly StoredPhoto[];
  album: EditorAlbum;
}

/**
 * Guardar as mudanças de um álbum que já está na nuvem.
 *
 * Mesmo formato de `useAlbumSave` (`isSaving`, `progress`, `error`), porque a
 * etapa de finalizar mostra os dois do mesmo jeito: o primeiro salvamento cria
 * o álbum, este reescreve o que existe — e não reenvia as fotos que já subiram
 * (`plan.ts`).
 */
export function useAlbumEditSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<EditSaveProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (input: EditSaveInput): Promise<boolean> => {
      if (isSaving) return false;
      setIsSaving(true);
      setError(null);
      setProgress({ processed: 0, total: 0 });
      try {
        const result = await saveAlbumEditsFromBrowser({
          albumId: input.albumId,
          ownerId: input.ownerId,
          title: input.title,
          photos: input.photos,
          stored: input.stored,
          composition: snapshotComposition(input.album),
          onProgress: setProgress,
        });
        if (!result.ok) {
          setError(result.error);
          return false;
        }
        return true;
      } finally {
        setIsSaving(false);
        setProgress(null);
      }
    },
    [isSaving],
  );

  return { save, isSaving, progress, error };
}
