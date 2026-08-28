'use client';

import { PhotoDropzone } from '@/features/photo-upload/PhotoDropzone';
import { PhotoOrderGrid } from '@/features/photo-upload/PhotoOrderGrid';
import { useLang } from '@/features/i18n/LangProvider';
import type { Photo } from '@/types/photo';

import { EDITOR_COPY } from './copy';
import { IconCheck } from './icons';

interface EditorStartProps {
  name: string;
  onNameChange: (name: string) => void;
  isImporting: boolean;
  onStart: (files: File[]) => void;
  /** Fotos já importadas, esperando confirmação. */
  photos: Photo[];
  onMove: (fromId: string, toId: string) => void;
  onRemove: (id: string) => void;
  onSortByDate: () => void;
  isManuallyOrdered: boolean;
  onConfirm: () => void;
}

/**
 * A tela de partida — e, agora, a escolha das fotos.
 *
 * Antes ela também perguntava o estilo do álbum e se as fotos entravam por data
 * ou no depósito. As duas perguntas saíram: o estilo agora se escolhe vendo a
 * capa, e a ordem por data deixou de ser opção porque virou o comportamento —
 * as fotos entram na ordem em que foram tiradas.
 *
 * O que entrou no lugar foi uma parada: importar não abre mais o editor
 * sozinho. Quem manda duzentas fotos quase sempre quer tirar algumas e mexer na
 * ordem *antes* de montar qualquer coisa, e até aqui o único caminho para isso
 * passava por desmanchar uma composição já feita. Agora a página só avança no
 * botão, e acrescentar, remover e reordenar acontecem antes, de graça.
 */
export function EditorStart({
  name,
  onNameChange,
  isImporting,
  onStart,
  photos,
  onMove,
  onRemove,
  onSortByDate,
  isManuallyOrdered,
  onConfirm,
}: EditorStartProps) {
  const { lang } = useLang();
  const copy = EDITOR_COPY[lang];
  const hasPhotos = photos.length > 0;

  return (
    <div className="card space-y-5 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{copy.emptyTitle}</h2>
        <p className="muted max-w-[52ch] text-sm">{copy.emptyBody}</p>
      </div>

      <label className="field">
        <span className="kicker">{copy.albumNameAria}</span>
        <input
          className="input"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Grécia 2026"
        />
      </label>

      {/* Com fotos na tela a zona de arrastar encolhe: ela deixou de ser o
          assunto da página e virou "mais uma". */}
      <PhotoDropzone onFilesSelected={onStart} disabled={isImporting} compact={hasPhotos} />

      {hasPhotos && (
        <>
          <div className="pg-head">
            <p className="text-sm font-medium">{copy.startCount(photos.length)}</p>
            {isManuallyOrdered && (
              <button type="button" className="btn btn-secondary" onClick={onSortByDate}>
                {copy.startSortByDate}
              </button>
            )}
          </div>

          <PhotoOrderGrid photos={photos} copy={copy} onMove={onMove} onRemove={onRemove} />

          <p className="muted max-w-[70ch] text-sm">
            {isManuallyOrdered ? copy.startManualNote : copy.startOrderNote}
          </p>

          <div className="pg-confirm">
            <button
              type="button"
              className="btn btn-hero"
              disabled={isImporting}
              onClick={onConfirm}
            >
              <IconCheck size={15} /> {copy.startConfirm}
            </button>
            <p className="muted max-w-[52ch] text-sm">{copy.startConfirmHint}</p>
          </div>
        </>
      )}
    </div>
  );
}
