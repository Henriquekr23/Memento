'use client';

import { IconCloud, IconDownload } from '@/features/album-editor/icons';
import { COMPOSITION_VERSION } from '@/features/album-save/composition';
import { AlbumViewer } from '@/features/album-view/AlbumViewer';
import { useLang } from '@/features/i18n/LangProvider';
import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';

/**
 * A segunda saída da etapa 5, ao lado do PDF: guardar na nuvem.
 *
 * Quem monta um álbum novo **cria** (`useAlbumSave`); quem reabre um guardado
 * **reescreve** (`useAlbumEditSave`). Para esta tela é o mesmo botão, com
 * outro nome e outra mensagem de progresso — por isso ela recebe a descrição
 * pronta, e não o hook.
 */
export interface FinishSave {
  label: string;
  busyLabel: string;
  isSaving: boolean;
  /** Frase de progresso já escrita, ou `null` quando nada está subindo. */
  progressText: string | null;
  error: string | null;
  onSave: () => void;
}

/**
 * Etapa 5, "Seu álbum está pronto.": o álbum montado, só para ver, e as duas
 * saídas — baixar o PDF e guardar na nuvem.
 *
 * A vista é o `AlbumViewer` da página pública (`/album/[id]`): o mesmo livro e
 * as mesmas folhas, sem alças. Ver o álbum como ele vai ficar antes de baixar
 * é o motivo desta etapa existir separada do editor.
 */
export function StepFinish({
  name,
  photos,
  album,
  title,
  lead,
  isExporting,
  exportProgress,
  exportError,
  save,
  onDownload,
  onBack,
}: {
  name: string;
  photos: Photo[];
  album: EditorAlbum;
  /** Título e linha de apoio; sem eles, os do álbum novo. */
  title?: string;
  lead?: string;
  isExporting: boolean;
  exportProgress: { processed: number; total: number } | null;
  exportError: string | null;
  /** `null` sem Supabase: só sobra o PDF. */
  save: FinishSave | null;
  onDownload: () => void;
  onBack: () => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const isSaving = save?.isSaving ?? false;

  return (
    <section className="af-section af-section-finish">
      <div className="af-head">
        <h1 className="lp-h af-title">{title ?? t.finishTitle}</h1>
        <p className="af-lead">{lead ?? t.finishLead}</p>
      </div>

      {/* Só o álbum, solto na página, com as visões no trilho do lado — como
          nas etapas de montar. Sem o cartão em volta: aqui o objeto é o livro. */}
      <div className="af-viewer af-viewer-bare">
        <AlbumViewer
          title={name}
          photos={photos}
          composition={{ version: COMPOSITION_VERSION, album }}
          layout="rail"
        />
      </div>

      <div className="af-build-notes">
        {isExporting && exportProgress && (
          <p className="af-note" role="status">
            {t.exporting(exportProgress.processed, exportProgress.total)}
          </p>
        )}
        {save?.progressText && (
          <p className="af-note" role="status">
            {save.progressText}
          </p>
        )}
        {exportError && (
          <p className="af-note is-error" role="alert">
            {exportError}
          </p>
        )}
        {save?.error && (
          <p className="af-note is-error" role="alert">
            {save.error}
          </p>
        )}
      </div>

      <div className="af-step-foot af-finish-foot">
        <button type="button" className="af-link" onClick={onBack}>
          {t.backToEdit}
        </button>
        <div className="af-finish-actions">
          {save && (
            <button
              type="button"
              className="af-btn af-btn-ghost af-btn-xl"
              disabled={isSaving || isExporting}
              onClick={save.onSave}
            >
              <IconCloud size={17} />
              {isSaving ? save.busyLabel : save.label}
            </button>
          )}
          <button
            type="button"
            className="af-btn af-btn-primary af-btn-xl"
            disabled={isExporting || isSaving}
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
