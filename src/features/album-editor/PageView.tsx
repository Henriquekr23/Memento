'use client';

import { SPEC } from '@/features/album-print/spec';
import type { EditorPage, PhotoFrame } from '@/types/album-editor';

import { PageContent, type PhotoResolver } from './PageContent';
import { PrintGuides, type SpineSide } from './PrintGuides';

interface PageViewProps {
  page: EditorPage;
  /** Índice 0-based; o número impresso é ele mais um. */
  index: number;
  ppm: number;
  /** Em que mão da folha esta página está. */
  hand: 'left' | 'right';
  guides: boolean;
  ink: string;
  resolve: PhotoResolver;
  editable?: boolean;
  selectedSlot?: number;
  onSelectSlot?: (index: number) => void;
  onFrame?: (index: number, patch: Partial<PhotoFrame>) => void;
  onDropPhoto?: (index: number, photoId: string) => void;
  hideNumber?: boolean;
}

/** Uma página inteira, do tamanho do arquivo entregue à gráfica (com sangria). */
export function PageView({
  page,
  index,
  ppm,
  hand,
  guides,
  ink,
  resolve,
  editable = false,
  selectedSlot = -1,
  onSelectSlot,
  onFrame,
  onDropPhoto,
  hideNumber = false,
}: PageViewProps) {
  const width = (SPEC.trim.w + SPEC.bleed * 2) * ppm;
  const height = (SPEC.trim.h + SPEC.bleed * 2) * ppm;
  // A lombada fica do lado de dentro: à direita na página par, à esquerda na ímpar.
  const spineSide: SpineSide = hand === 'right' ? 'left' : 'right';

  return (
    <div className="ae-page" style={{ width, height }}>
      <PageContent
        page={page}
        ppm={ppm}
        ink={ink}
        resolve={resolve}
        editable={editable}
        bleedMm={SPEC.bleed}
        spineSide={spineSide}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
        onFrame={onFrame}
        onDropPhoto={onDropPhoto}
      />

      {!hideNumber && (
        <span
          className="ae-page-number"
          style={{
            [hand === 'right' ? 'right' : 'left']: (SPEC.bleed + 7) * ppm,
            bottom: (SPEC.bleed + 6) * ppm,
            fontSize: Math.max(6, 2.6 * ppm),
            // Sobre foto sangrada o número precisa ser claro; sobre papel, escuro.
            color: page.layout === 'full' ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.45)',
          }}
        >
          {index + 1}
        </span>
      )}

      <PrintGuides ppm={ppm} spineSide={spineSide} show={guides} />
    </div>
  );
}

interface SheetPreviewProps {
  pages: EditorPage[];
  left: number;
  right: number;
  ink: string;
  ppm: number;
  resolve: PhotoResolver;
}

/** Miniatura de uma folha aberta, respeitando a foto espelhada. */
export function SheetPreview({ pages, left, right, ink, ppm, resolve }: SheetPreviewProps) {
  const leftPage = pages[left];

  if (leftPage?.spread) {
    return (
      <span className="ae-preview-spread">
        <PageContent
          page={leftPage}
          ppm={ppm}
          ink={ink}
          resolve={resolve}
          bleedMm={0}
          spineSide="left"
        />
      </span>
    );
  }

  return (
    <>
      {[left, right].map((pageIndex, side) => {
        const page = pages[pageIndex];
        if (!page) return null;
        return (
          <span
            key={page.id}
            className="ae-preview-half"
            style={{ left: side === 0 ? 0 : '50%' }}
          >
            <PageContent
              page={page}
              ppm={ppm}
              ink={ink}
              resolve={resolve}
              bleedMm={0}
              spineSide={side === 0 ? 'right' : 'left'}
            />
          </span>
        );
      })}
    </>
  );
}
