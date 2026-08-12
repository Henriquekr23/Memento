'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import type { FrameId } from '@/features/album-style/theme';
import type { PhotoAdjustment } from '@/types/page';
import type { Photo } from '@/types/photo';

interface PhotoSlotProps {
  photo: Photo;
  adjustment: PhotoAdjustment;
  rotation: number;
  frame: FrameId;
  caption: string;
  isSelected: boolean;
  interactive: boolean;
  className?: string;
  onSelect: (photoId: string) => void;
  onAdjust: (photoId: string, patch: Partial<PhotoAdjustment>) => void;
  onCaptionChange: (photoId: string, caption: string) => void;
}

const PAN_SENSITIVITY = 1.1;
const DRAG_TOLERANCE_PX = 3;
const CORNER_SIZE = 15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Cantoneiras de papel, como as de álbum antigo. */
function PhotoCorners() {
  const shared = {
    position: 'absolute' as const,
    width: 0,
    height: 0,
    opacity: 0.55,
  };
  const color = 'var(--paper-ink-soft)';

  return (
    <>
      <span
        style={{
          ...shared,
          top: 0,
          left: 0,
          borderTop: `${CORNER_SIZE}px solid ${color}`,
          borderRight: `${CORNER_SIZE}px solid transparent`,
        }}
      />
      <span
        style={{
          ...shared,
          top: 0,
          right: 0,
          borderTop: `${CORNER_SIZE}px solid ${color}`,
          borderLeft: `${CORNER_SIZE}px solid transparent`,
        }}
      />
      <span
        style={{
          ...shared,
          bottom: 0,
          left: 0,
          borderBottom: `${CORNER_SIZE}px solid ${color}`,
          borderRight: `${CORNER_SIZE}px solid transparent`,
        }}
      />
      <span
        style={{
          ...shared,
          bottom: 0,
          right: 0,
          borderBottom: `${CORNER_SIZE}px solid ${color}`,
          borderLeft: `${CORNER_SIZE}px solid transparent`,
        }}
      />
    </>
  );
}

/**
 * Uma foto colada na página.
 *
 * Três gestos que não brigam entre si:
 * - arrastar a foto = reenquadrar (mexe em `object-position`, que o navegador
 *   clampa sozinho — nunca sobra buraco branco);
 * - arrastar pela alça ⠿ = trocar de lugar com outra foto;
 * - clicar = selecionar e abrir os ajustes finos.
 */
export function PhotoSlot({
  photo,
  adjustment,
  rotation,
  frame,
  caption,
  isSelected,
  interactive,
  className = '',
  onSelect,
  onAdjust,
  onCaptionChange,
}: PhotoSlotProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    focusX: number;
    focusY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({ id: photo.id, disabled: !interactive });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: photo.id,
    disabled: !interactive,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      frameRef.current = node;
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !interactive) return;
    const node = frameRef.current;
    if (!node) return;

    // Impede que o gesto vire "folhear página".
    event.stopPropagation();

    const rect = node.getBoundingClientRect();
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      focusX: adjustment.focusX,
      focusY: adjustment.focusY,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    node.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;

    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < DRAG_TOLERANCE_PX) return;
    pan.moved = true;

    onAdjust(photo.id, {
      focusX: clamp(pan.focusX - (dx / pan.width) * 100 * PAN_SENSITIVITY, 0, 100),
      focusY: clamp(pan.focusY - (dy / pan.height) * 100 * PAN_SENSITIVITY, 0, 100),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    panRef.current = null;
    frameRef.current?.releasePointerCapture(event.pointerId);
    if (pan && !pan.moved) onSelect(photo.id);
  }

  const isPolaroid = frame === 'polaroid';
  const showCaption = interactive ? isSelected || caption.length > 0 : caption.length > 0;

  return (
    <div className={`relative min-h-0 min-w-0 p-2 ${className}`}>
      <div
        ref={setRefs}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 220ms ease',
          background: isPolaroid ? 'var(--frame-bg)' : undefined,
          padding: isPolaroid ? 3 : undefined,
          boxShadow: isPolaroid
            ? '0 3px 10px rgba(20,14,8,0.28)'
            : frame === 'bleed'
              ? '0 2px 8px rgba(20,14,8,0.22)'
              : undefined,
        }}
        className={[
          'group/photo relative flex h-full w-full flex-col rounded-[3px]',
          interactive ? 'cursor-grab touch-none active:cursor-grabbing' : '',
          isDragging ? 'opacity-40' : '',
          isOver ? 'ring-2 ring-amber-500' : '',
          isSelected ? 'ring-2 ring-amber-400' : '',
        ].join(' ')}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt={photo.fileName}
            draggable={false}
            loading="lazy"
            style={{
              objectPosition: `${adjustment.focusX}% ${adjustment.focusY}%`,
              transform: `scale(${adjustment.zoom})`,
              transformOrigin: `${adjustment.focusX}% ${adjustment.focusY}%`,
            }}
            className="h-full w-full select-none object-cover"
          />
          {frame === 'corners' && <PhotoCorners />}
        </div>

        {showCaption && (
          <input
            value={caption}
            onChange={(event) => onCaptionChange(photo.id, event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            disabled={!interactive}
            placeholder="escreva uma legenda…"
            aria-label={`Legenda de ${photo.fileName}`}
            style={{ color: 'var(--paper-ink)' }}
            className="w-full shrink-0 truncate border-0 bg-transparent px-1 py-1 text-center text-[11px] outline-none placeholder:text-current placeholder:opacity-30"
          />
        )}

        {interactive && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            onPointerDown={(event) => {
              event.stopPropagation();
              listeners?.onPointerDown?.(event);
            }}
            title="Arraste para trocar de lugar com outra foto"
            aria-label={`Trocar ${photo.fileName} de lugar`}
            className="absolute -left-1.5 -top-1.5 z-10 cursor-grab rounded-full bg-neutral-900/85 px-1.5 py-0.5 text-[10px] leading-none text-white opacity-0 shadow transition group-hover/photo:opacity-100 focus-visible:opacity-100"
          >
            ⠿
          </button>
        )}
      </div>
    </div>
  );
}
