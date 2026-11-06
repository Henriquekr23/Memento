'use client';

import { IconCloud, IconDownload } from '@/features/album-editor/icons';
import { COMPOSITION_VERSION } from '@/features/album-save/composition';
import type { useAlbumSave } from '@/features/album-save/useAlbumSave';
import { AlbumViewer } from '@/features/album-view/AlbumViewer';
import { useLang } from '@/features/i18n/LangProvider';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';

/**
 * Etapa 5, "Seu álbum está pronto.": o álbum montado, só para ver, e as duas
 * saídas — baixar o PDF e salvar na nuvem.
 *
 * A vista é o `AlbumViewer` da página pública (`/album/[id]`): o mesmo livro e
 * as mesmas folhas, sem alças. Ver o álbum como ele vai ficar antes de baixar
 * é o motivo desta etapa existir separada do editor.
 */
export function StepFinish({
  name,
  photos,
  album,
  isExporting,
  exportProgress,
  exportError,
  cloud,
  onDownload,
  onSave,
  onBack,
}: {
  name: string;
  photos: Photo[];
  album: EditorAlbum;
  isExporting: boolean;
  exportProgress: { processed: number; total: number } | null;
  exportError: string | null;
  cloud: ReturnType<typeof useAlbumSave>;
  onDownload: () => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];

  return (
    <section className="af-section af-section-finish">
      <div className="af-head">
        <h1 className="lp-h af-title">{t.finishTitle}</h1>
        <p className="af-lead">{t.finishLead}</p>
      </div>

      <div className="af-editor-card af-viewer">
        <AlbumViewer
          title={name}
          photos={photos}
          composition={{ version: COMPOSITION_VERSION, album }}
        />
      </div>

      <div className="af-build-notes">
        {isExporting && exportProgress && (
          <p className="af-note" role="status">
            {t.exporting(exportProgress.processed, exportProgress.total)}
          </p>
        )}
        {cloud.progress && (
          <p className="af-note" role="status">
            {t.cloudProgress(cloud.progress.processed, cloud.progress.total)}
          </p>
        )}
        {exportError && (
          <p className="af-note is-error" role="alert">
            {exportError}
          </p>
        )}
        {cloud.error && (
          <p className="af-note is-error" role="alert">
            {cloud.error}
          </p>
        )}
      </div>

      <div className="af-step-foot af-finish-foot">
        <button type="button" className="af-link" onClick={onBack}>
          {t.backToEdit}
        </button>
        <div className="af-finish-actions">
          {isSupabaseConfigured && (
            <button
              type="button"
              className="af-btn af-btn-ghost af-btn-xl"
              disabled={cloud.isSaving || isExporting}
              onClick={onSave}
            >
              <IconCloud size={17} />
              {cloud.isSaving ? t.saving : t.saveCloud}
            </button>
          )}
          <button
            type="button"
            className="af-btn af-btn-primary af-btn-xl"
            disabled={isExporting || cloud.isSaving}
            onClick={onDownload}
          >
            <IconDownload size={17} />
            {t.downloadPdf}
          </button>
        </div>
      </div>
    </section>
  );
}
