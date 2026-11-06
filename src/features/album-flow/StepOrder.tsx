'use client';

import { useLang } from '@/features/i18n/LangProvider';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';
import type { Side } from './order';
import { PhotoSorter } from './PhotoSorter';
import { ContinueButton, isFileDrag } from './StepStart';

/**
 * Etapa 2, "Confira a ordem.": só a sequência das fotos, sem páginas
 * (`PhotoSorter`). O "Continuar" fica embaixo, à direita, como na etapa 1; no
 * celular, preso no pé da tela.
 *
 * Arrastar arquivos por cima da etapa também importa, como na etapa 1.
 */
export function StepOrder({
  photos,
  outside,
  isManuallyOrdered,
  onMove,
  onRemove,
  onRestore,
  onSortByDate,
  onFiles,
  onContinue,
  onRestart,
  notes,
  toast,
}: {
  photos: readonly Photo[];
  outside: readonly Photo[];
  isManuallyOrdered: boolean;
  onMove: (id: string, targetId: string, side: Side) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onSortByDate: () => void;
  onFiles: (files: File[]) => void;
  onContinue: () => void;
  onRestart: () => void;
  notes: React.ReactNode;
  toast: React.ReactNode;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const canContinue = photos.length > 0;

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
      {notes}
      <PhotoSorter
        photos={photos}
        outside={outside}
        isManuallyOrdered={isManuallyOrdered}
        onMove={onMove}
        onRemove={onRemove}
        onRestore={onRestore}
        onSortByDate={onSortByDate}
      />
      <StepFoot canContinue={canContinue} onContinue={onContinue} onRestart={onRestart} />
      {toast}
    </section>
  );
}

/**
 * O pé das etapas 2 e 3: "Começar de novo" à esquerda, "Continuar" à direita —
 * a mesma linha de fim da etapa 1. No celular o "Continuar" fica preso no pé
 * da tela (`.af-bottombar`).
 */
export function StepFoot({
  canContinue,
  onContinue,
  onRestart,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onRestart: () => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  return (
    <>
      <div className="af-step-foot">
        <button type="button" className="af-link" onClick={onRestart}>
          {t.restart}
        </button>
        <ContinueButton disabled={!canContinue} onClick={onContinue} label={t.continue} className="af-step-foot-cta" />
      </div>
      <div className="af-bottombar">
        <ContinueButton disabled={!canContinue} onClick={onContinue} label={t.continue} className="af-btn-block" />
      </div>
    </>
  );
}
