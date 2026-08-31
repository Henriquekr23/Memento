'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { AlbumEditor } from '@/features/album-editor/AlbumEditor';
import { IconCloud } from '@/features/album-editor/icons';
import { useAlbum } from '@/features/album-builder/useAlbum';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import { snapshotComposition } from '@/features/album-save/snapshot';
import type { AlbumComposition } from '@/features/album-save/composition';
import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import type { StoredPhoto } from './plan';
import { saveAlbumEditsFromBrowser, type EditSaveProgress } from './saveEdits';

/**
 * A bancada de um álbum que já está na nuvem.
 *
 * É a mesma tela de `/album`, e de propósito: o editor não sabe se as fotos
 * vieram do disco ou do Storage — recebe `Photo[]` com `previewUrl` e pronto.
 * Foi essa fronteira, desenhada na Fase 2, que fez "editar um álbum salvo"
 * caber num arquivo em vez de num segundo editor.
 *
 * As três diferenças reais:
 *
 * 1. o acervo **começa cheio**, com a ordem que foi salva (`useAlbum` recebe a
 *    semente e já se considera ordenado à mão);
 * 2. salvar reescreve este álbum em vez de criar outro — e não reenvia as
 *    fotos que já estão lá;
 * 3. não existe "descartar": este álbum é de verdade, e apagar é uma decisão
 *    da lista de álbuns, com a confirmação que ela tem.
 */
export function AlbumEditWorkbench({
  albumId,
  ownerId,
  title,
  photos,
  stored,
  composition,
  isOwner,
}: {
  albumId: string;
  ownerId: string;
  title: string;
  photos: Photo[];
  stored: StoredPhoto[];
  composition: AlbumComposition;
  isOwner: boolean;
}) {
  const router = useRouter();
  const album = useAlbum({ name: title, photos });
  const { exportAlbum, isExporting, progress, error: exportError } = useAlbumExport();

  const [current, setCurrent] = useState<EditorAlbum | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<EditSaveProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = useCallback(async () => {
    if (!current || isSaving) return;
    setIsSaving(true);
    setError(null);
    setSaveProgress({ processed: 0, total: 0 });

    try {
      const result = await saveAlbumEditsFromBrowser({
        albumId,
        ownerId,
        title: album.name,
        // Todas as fotos, e não só as que estão em alguma página: o que está
        // no depósito foi importado de propósito e some do álbum (e do bucket)
        // se não for junto. É o mesmo que o primeiro salvamento faz.
        photos: album.photos,
        stored,
        composition: snapshotComposition(current),
        onProgress: setSaveProgress,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSavedAt(Date.now());
      // A página do álbum é um server component: sem isto ela voltaria do
      // cache, mostrando a composição de antes de salvar.
      router.refresh();
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  }, [album.name, album.photos, albumId, current, isSaving, ownerId, router, stored]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl">
            Editando “{album.name}”
          </h1>
          <p className="muted mt-1 text-sm">
            {isOwner
              ? 'As mudanças só valem depois de guardar.'
              : 'Você foi convidado a montar este álbum. As mudanças só valem depois de guardar.'}
          </p>
        </div>
        <Link href={`/album/${albumId}`} className="btn btn-secondary btn-sm">
          Voltar para o álbum
        </Link>
      </div>

      {isExporting && progress && (
        <p className="muted mb-3 text-sm">
          Desenhando as páginas… {progress.processed}/{progress.total}
        </p>
      )}
      {saveProgress && saveProgress.total > 0 && (
        <p className="muted mb-3 text-sm">
          Enviando as fotos novas… {saveProgress.processed}/{saveProgress.total}
        </p>
      )}
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {exportError && <p className="mb-3 text-sm text-red-400">{exportError}</p>}

      <div className="h-[calc(100dvh-200px)] min-h-[560px] overflow-hidden rounded-[16px] border border-[var(--color-divider)]">
        <AlbumEditor
          photos={album.photos}
          name={album.name}
          onName={album.setName}
          onUpload={(files) => album.addFiles(files, 'tray')}
          initialAlbum={composition.album}
          // Qualquer mexida apaga o "Guardado": o rótulo fala do que está no
          // banco, e a partir do primeiro arraste ele deixou de ser verdade.
          onChange={(editorAlbum) => {
            setCurrent(editorAlbum);
            setSavedAt(null);
          }}
          onExport={(editorAlbum) =>
            exportAlbum({
              name: album.name,
              photos: album.photos,
              album: editorAlbum,
            })
          }
          actions={
            <button
              type="button"
              className="ae-btn"
              aria-label="Guardar as mudanças"
              title="Guardar as mudanças"
              disabled={isSaving || !current}
              onClick={save}
            >
              <IconCloud size={13} />
              <span className="ae-btn-text">
                {isSaving
                  ? 'Guardando…'
                  : savedAt
                    ? 'Guardado'
                    : 'Guardar mudanças'}
              </span>
            </button>
          }
        />
      </div>
    </>
  );
}
