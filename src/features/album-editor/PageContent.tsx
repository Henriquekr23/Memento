'use client';

import { SPEC } from '@/features/album-print/spec';
import type { EditorPage, PhotoFrame } from '@/types/album-editor';

import { IconImage } from './icons';
import { clamp, round, useDrag } from './useDrag';
import type { SpineSide } from './PrintGuides';
import { COVER_FONTS } from './palette';

/** Como o componente descobre a URL de uma foto a partir do id guardado no slot. */
export type PhotoResolver = (photoId: string | null) => string | null;

interface FramedPhotoProps {
  frame: PhotoFrame;
  resolve: PhotoResolver;
  ppm: number;
  editable?: boolean;
  onPan?: (patch: Partial<PhotoFrame>) => void;
  alt?: string;
}

/**
 * A foto dentro do quadro.
 *
 * `object-fit: cover` resolve o preenchimento; zoom e enquadramento são
 * `transform`, que não força novo layout — arrastar o enquadramento tem que
 * caber num quadro de animação.
 */
export function FramedPhoto({
  frame,
  resolve,
  ppm,
  editable = false,
  onPan,
  alt = '',
}: FramedPhotoProps) {
  const startDrag = useDrag();
  const src = resolve(frame.photoId);

  if (!src) {
    return (
      <div className="ae-empty">
        <IconImage size={Math.max(14, ppm * 5)} />
      </div>
    );
  }

  const pan = (event: React.PointerEvent) => {
    if (!editable || !onPan) return;
    const origin = { x: frame.offsetX, y: frame.offsetY };
    startDrag(event, (dx, dy) => {
      onPan({
        offsetX: clamp(round(origin.x + (dx / ppm) * 0.35, 2), -40, 40),
        offsetY: clamp(round(origin.y + (dy / ppm) * 0.35, 2), -40, 40),
      });
    });
  };

  return (
    // A foto é decorativa dentro da página: o conteúdo do álbum é a composição,
    // e uma descrição inventada por nós seria pior que nenhuma.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      onPointerDown={pan}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        transform: `scale(${frame.zoom}) translate(${frame.offsetX}%, ${frame.offsetY}%)`,
        cursor: editable ? 'grab' : 'default',
      }}
    />
  );
}

interface PageContentProps {
  page: EditorPage;
  ppm: number;
  ink: string;
  resolve: PhotoResolver;
  editable?: boolean;
  selectedSlot?: number;
  onSelectSlot?: (index: number) => void;
  onFrame?: (index: number, patch: Partial<PhotoFrame>) => void;
  onDropPhoto?: (index: number, photoId: string) => void;
  /**
   * Quanta sangria existe além do corte neste contêiner.
   * As margens são sempre medidas da **página final**: assim a miniatura (sem
   * sangria) e a página de impressão (com 5 mm) mostram exatamente o mesmo
   * enquadramento, em vez de duas composições parecidas.
   */
  bleedMm?: number;
  spineSide?: SpineSide;
}

/** Tipo de dado do arrasto da bandeja para o quadro. */
export const PHOTO_DND_TYPE = 'text/memento-photo';

export function PageContent({
  page,
  ppm,
  ink,
  resolve,
  editable = false,
  selectedSlot = -1,
  onSelectSlot,
  onFrame,
  onDropPhoto,
  bleedMm = 0,
  spineSide = 'left',
}: PageContentProps) {
  const gap = 3 * ppm;
  const margin = (bleedMm + 10) * ppm;
  const spineMargin = (bleedMm + SPEC.safe.spine) * ppm;

  /**
   * Função comum, chamada como `slot(0, style)` — **não** um componente usado
   * como `<Slot />`. Virando componente, o React remonta o `<img>` a cada
   * render e o arraste de enquadramento pisca. Já foi corrigido uma vez.
   */
  const slot = (index: number, style: React.CSSProperties) => (
    <div
      key={index}
      className={`ae-slot${editable && selectedSlot === index ? ' is-selected' : ''}`}
      style={style}
      onPointerDown={() => editable && onSelectSlot?.(index)}
      onDragOver={(event) => {
        if (editable) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!editable) return;
        event.preventDefault();
        const photoId = event.dataTransfer.getData(PHOTO_DND_TYPE);
        if (photoId) onDropPhoto?.(index, photoId);
      }}
    >
      <FramedPhoto
        frame={page.slots[index]}
        resolve={resolve}
        ppm={ppm}
        editable={editable && selectedSlot === index}
        onPan={(patch) => onFrame?.(index, patch)}
      />
    </div>
  );

  if (page.layout === 'text') {
    return (
      <div
        style={{
          position: 'absolute',
          top: margin,
          bottom: margin,
          // O lado da lombada respeita os 12 mm de área segura: texto colado na
          // dobra some dentro da cola.
          left: spineSide === 'left' ? spineMargin : margin,
          right: spineSide === 'right' ? spineMargin : margin,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: ink,
        }}
      >
        <div
          style={{
            fontFamily: COVER_FONTS[0].stack,
            fontSize: 9 * ppm,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            marginBottom: 4 * ppm,
          }}
        >
          {page.heading}
        </div>
        <div
          style={{
            fontFamily: COVER_FONTS[5].stack,
            fontWeight: 400,
            fontSize: 3.4 * ppm,
            lineHeight: 1.5,
            maxWidth: '34ch',
            opacity: 0.85,
          }}
        >
          {page.body}
        </div>
      </div>
    );
  }

  const box: React.CSSProperties = { position: 'absolute', overflow: 'hidden' };

  if (page.layout === 'full') return slot(0, { ...box, inset: 0 });

  if (page.layout === 'inset') return slot(0, { ...box, inset: `${margin}px` });

  if (page.layout === 'duoV') {
    return (
      <>
        {slot(0, {
          ...box,
          top: margin,
          bottom: margin,
          left: margin,
          width: `calc(50% - ${margin + gap / 2}px)`,
        })}
        {slot(1, {
          ...box,
          top: margin,
          bottom: margin,
          right: margin,
          width: `calc(50% - ${margin + gap / 2}px)`,
        })}
      </>
    );
  }

  if (page.layout === 'duoH') {
    return (
      <>
        {slot(0, {
          ...box,
          left: margin,
          right: margin,
          top: margin,
          height: `calc(50% - ${margin + gap / 2}px)`,
        })}
        {slot(1, {
          ...box,
          left: margin,
          right: margin,
          bottom: margin,
          height: `calc(50% - ${margin + gap / 2}px)`,
        })}
      </>
    );
  }

  if (page.layout === 'trio') {
    return (
      <>
        {slot(0, {
          ...box,
          left: margin,
          right: margin,
          top: margin,
          height: `calc(58% - ${margin}px)`,
        })}
        {slot(1, {
          ...box,
          left: margin,
          bottom: margin,
          width: `calc(50% - ${margin + gap / 2}px)`,
          height: `calc(42% - ${margin + gap}px)`,
        })}
        {slot(2, {
          ...box,
          right: margin,
          bottom: margin,
          width: `calc(50% - ${margin + gap / 2}px)`,
          height: `calc(42% - ${margin + gap}px)`,
        })}
      </>
    );
  }

  return (
    <>
      {[0, 1, 2, 3].map((i) =>
        slot(i, {
          ...box,
          left: i % 2 === 0 ? margin : `calc(50% + ${gap / 2}px)`,
          right: i % 2 === 1 ? margin : `calc(50% + ${gap / 2}px)`,
          top: i < 2 ? margin : `calc(50% + ${gap / 2}px)`,
          bottom: i > 1 ? margin : `calc(50% + ${gap / 2}px)`,
        }),
      )}
    </>
  );
}
