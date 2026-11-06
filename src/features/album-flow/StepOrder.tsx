'use client';

import { useLang } from '@/features/i18n/LangProvider';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';
import type { PageGroups, SortMode } from './pageGroups';
import { PhotoSorter } from './PhotoSorter';
import { ContinueButton, isFileDrag } from './StepStart';

/**
 * Etapa 2, "Confira a ordem.": a sequência das fotos já dividida em páginas,
 * uma coluna por página (`PhotoSorter`). O "Continuar" fica embaixo, à direita, como na etapa 1; no
 * celular, preso no pé da tela.
 *
 * Arrastar arquivos por cima da etapa também importa, como na etapa 1.
 */
export function StepOrder({
  photos,
  groups,
  outside,
  sortMode,
  onSort,
  onMoveTo,
  onRemove,
  onRestore,
  onFiles,
  onContinue,
  notes,
  toast,
}: {
  photos: readonly Photo[];
  groups: PageGroups;
  outside: readonly Photo[];
  sortMode: SortMode;
  onSort: (mode: SortMode) => void;
  onMoveTo: (id: string, group: number, index: number) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onFiles: (files: File[]) => void;
  onContinue: () => void;
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
        groups={groups}
        outside={outside}
        sortMode={sortMode}
        onSort={onSort}
        onMoveTo={onMoveTo}
        onRemove={onRemove}
        onRestore={onRestore}
      />
      <StepFoot canContinue={canContinue} onContinue={onContinue} />
      {toast}
    </section>
  );
}

/**
 * O pé da etapa 2: "Continuar" à direita, a mesma linha de fim da etapa 1. No
 * celular ele fica preso no pé da tela (`.af-bottombar`). "Começar de novo"
 * saiu daqui: uma ação que apaga tudo não divide a linha com a que avança.
 */
export function StepFoot({
  canContinue,
  onContinue,
}: {
  canContinue: boolean;
  onContinue: () => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  return (
    <>
      <div className="af-step-foot">
        <ContinueButton disabled={!canContinue} onClick={onContinue} label={t.continue} className="af-step-foot-cta" />
      </div>
      <div className="af-bottombar">
        <ContinueButton disabled={!canContinue} onClick={onContinue} label={t.continue} className="af-btn-block" />
      </div>
    </>
  );
}
