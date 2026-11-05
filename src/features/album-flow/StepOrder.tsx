'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLang } from '@/features/i18n/LangProvider';
import type { Photo } from '@/types/photo';

import { AlbumCover } from './AlbumCover';
import type { Cells } from './cells';
import { FLOW_COPY } from './copy';
import { PagesBoard } from './PagesBoard';
import type { PerPage } from './paginate';
import { ContinueButton, isFileDrag } from './StepStart';
import { Timeline } from './Timeline';

/** Quanto tempo o "Desfazer" fica na tela. */
const UNDO_MS = 5000;

/**
 * Etapa 2, "Confira a ordem.": a linha do tempo em cima (quem entra), as
 * páginas embaixo (em que ordem e quantas por página), e à direita a capa com o
 * "Continuar". Nada de contagens nem de campo de nome aqui — o nome já está na
 * capa, e a contagem está na linha do tempo.
 *
 * Arrastar arquivos por cima da etapa também importa, como na etapa 1.
 */
export function StepOrder({
  name,
  photos,
  photosById,
  cells,
  insideCount,
  excluded,
  perPage,
  onPerPage,
  onToggle,
  onPlace,
  onRemove,
  onUndoRemove,
  onFiles,
  onContinue,
  onRestart,
  notes,
}: {
  name: string;
  /** O acervo inteiro (a linha do tempo mostra também quem está fora). */
  photos: readonly Photo[];
  photosById: ReadonlyMap<string, Photo>;
  /** Os quadros das páginas (`cells.ts`). */
  cells: Cells;
  insideCount: number;
  excluded: ReadonlySet<string>;
  perPage: PerPage;
  onPerPage: (perPage: PerPage) => void;
  onToggle: (id: string) => void;
  onPlace: (id: string, cellIndex: number) => void;
  onRemove: (id: string) => void;
  /** Devolve a foto ao quadro de onde ela saiu. */
  onUndoRemove: (id: string, cellIndex: number) => void;
  onFiles: (files: File[]) => void;
  onContinue: () => void;
  onRestart: () => void;
  notes: React.ReactNode;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const [undo, setUndo] = useState<{ id: string; cell: number } | null>(null);

  // Um aviso por vez: tirar outra foto troca o aviso e recomeça a contagem.
  useEffect(() => {
    if (undo === null) return;
    const handle = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(handle);
  }, [undo]);

  const remove = useCallback(
    (id: string) => {
      const cell = cells.indexOf(id);
      onRemove(id);
      setUndo({ id, cell });
    },
    [cells, onRemove],
  );

  const canContinue = insideCount > 0;

  return (
    <section
      className="af-section af-section-order"
      onDragOver={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      }}
    >
      <h1 className="lp-h af-title">{t.orderTitle}</h1>

      <div className="af-order">
        <div className="af-order-main">
          <Timeline
            photos={photos}
            excluded={excluded}
            insideCount={insideCount}
            onToggle={onToggle}
          />
          {notes}
          <PagesBoard
            cells={cells}
            photosById={photosById}
            perPage={perPage}
            onPerPage={onPerPage}
            onPlace={onPlace}
            onRemove={remove}
          />
          <button type="button" className="af-link af-restart-touch" onClick={onRestart}>
            {t.restart}
          </button>
        </div>

        {/* Capa e ações numa mesa própria: sem ela, a coluna ficava solta no
            fundo da página. */}
        <aside className="af-mesa af-order-aside">
          <AlbumCover name={name} variant="aside" />
          <ContinueButton
            disabled={!canContinue}
            onClick={onContinue}
            label={t.continue}
            className="af-btn-block"
          />
          <button type="button" className="af-link" onClick={onRestart}>
            {t.restart}
          </button>
        </aside>
      </div>

      {/* Celular: o "Continuar" fica preso embaixo, por cima do conteúdo. */}
      <div className="af-bottombar">
        <ContinueButton
          disabled={!canContinue}
          onClick={onContinue}
          label={t.continue}
          className="af-btn-block"
        />
      </div>

      <div className="af-toast" role="status" aria-live="polite" data-open={undo !== null || undefined}>
        {undo !== null && (
          <>
            <span>{t.removed}</span>
            <button
              type="button"
              className="af-toast-undo"
              onClick={() => {
                onUndoRemove(undo.id, undo.cell);
                setUndo(null);
              }}
            >
              {t.undo}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
