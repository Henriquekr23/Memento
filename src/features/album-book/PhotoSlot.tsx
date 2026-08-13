'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import type { FrameId } from '@/features/album-style/theme';
import {
  clampRotation,
  type ComposeMode,
  type PhotoAdjustment,
  type SlotRect,
} from '@/types/page';
import type { Photo } from '@/types/photo';

interface PhotoSlotProps {
  photo: Photo;
  adjustment: PhotoAdjustment;
  rotation: number;
  frame: FrameId;
  caption: string;
  isSelected: boolean;
  interactive: boolean;
  mode: ComposeMode;
  /** Posição atual, em % da área útil da página. */
  rect: SlotRect;
  zIndex: number;
  onSelect: (photoId: string) => void;
  onAdjust: (photoId: string, patch: Partial<PhotoAdjustment>) => void;
  onCaptionChange: (photoId: string, caption: string) => void;
  onPlace: (
    photoId: string,
    rect: SlotRect,
    options?: { bringToFront?: boolean },
  ) => void;
  onSendToTray: (photoId: string) => void;
}

const PAN_SENSITIVITY = 1.1;
const DRAG_TOLERANCE_PX = 3;
const CORNER_SIZE = 15;

/** Alças que aparecem ao passar o mouse na foto. */
const HANDLE_CLASS =
  'absolute z-20 flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-neutral-900)_88%,transparent)] text-[11px] leading-none text-[var(--color-neutral-100)] opacity-0 shadow-md transition hover:bg-[var(--color-neutral-900)] group-hover/photo:opacity-100 focus-visible:opacity-100';
const PLACEMENT_TRANSITION =
  'left 260ms cubic-bezier(0.22,0.61,0.36,1), top 260ms cubic-bezier(0.22,0.61,0.36,1), width 260ms cubic-bezier(0.22,0.61,0.36,1), height 260ms cubic-bezier(0.22,0.61,0.36,1)';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Cantoneiras de papel, como as de álbum antigo. */
function PhotoCorners() {
  const shared = { position: 'absolute' as const, width: 0, height: 0, opacity: 0.55 };
  const color = 'var(--paper-ink-soft)';

  return (
    <>
      <span style={{ ...shared, top: 0, left: 0, borderTop: `${CORNER_SIZE}px solid ${color}`, borderRight: `${CORNER_SIZE}px solid transparent` }} />
      <span style={{ ...shared, top: 0, right: 0, borderTop: `${CORNER_SIZE}px solid ${color}`, borderLeft: `${CORNER_SIZE}px solid transparent` }} />
      <span style={{ ...shared, bottom: 0, left: 0, borderBottom: `${CORNER_SIZE}px solid ${color}`, borderRight: `${CORNER_SIZE}px solid transparent` }} />
      <span style={{ ...shared, bottom: 0, right: 0, borderBottom: `${CORNER_SIZE}px solid ${color}`, borderLeft: `${CORNER_SIZE}px solid transparent` }} />
    </>
  );
}

type GestureKind = 'pan' | 'move' | 'resize' | 'rotate';

interface Gesture {
  kind: GestureKind;
  pointerId: number;
  startX: number;
  startY: number;
  /** Tamanho do elemento de referência da conversão px → %. */
  refWidth: number;
  refHeight: number;
  /** Centro da foto na tela, para o cálculo de ângulo. */
  centerX: number;
  centerY: number;
  origin: { focusX: number; focusY: number; rotation: number } & SlotRect;
  moved: boolean;
}

function angleAt(centerX: number, centerY: number, x: number, y: number): number {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

/**
 * Uma foto colada na página.
 *
 * A posição é sempre um retângulo em % da área útil — vindo do slot do layout
 * (modo alinhado) ou da posição escolhida à mão (modo espontâneo). Isso deixa
 * a mudança de layout animável e dá o mesmo sistema de coordenadas para os
 * dois modos.
 *
 * Gestos, sem nenhum conflito entre eles:
 * - alinhado: arrastar a foto reenquadra; a alça ⠿ troca de lugar com outra;
 * - espontâneo: arrastar move pela página; a alça ◢ redimensiona; o
 *   reenquadramento fica nos controles finos, embaixo do livro.
 */
export function PhotoSlot({
  photo,
  adjustment,
  rotation,
  frame,
  caption,
  isSelected,
  interactive,
  mode,
  rect,
  zIndex,
  onSelect,
  onAdjust,
  onCaptionChange,
  onPlace,
  onSendToTray,
}: PhotoSlotProps) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const isFree = mode === 'free';

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: photo.id,
    disabled: !interactive || isFree,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: photo.id,
    disabled: !interactive || isFree,
  });

  const setFrameRefs = useCallback(
    (node: HTMLDivElement | null) => {
      frameRef.current = node;
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  function beginGesture(
    event: ReactPointerEvent<HTMLElement>,
    kind: GestureKind,
  ) {
    if (event.button !== 0 || !interactive) return;
    const node = frameRef.current;
    const area = slotRef.current?.parentElement;
    if (!node || !area) return;

    // Sem isto o gesto viraria "folhear página".
    event.stopPropagation();

    const areaBox = area.getBoundingClientRect();
    const frameBox = node.getBoundingClientRect();

    gestureRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      refWidth: kind === 'pan' ? frameBox.width : areaBox.width,
      refHeight: kind === 'pan' ? frameBox.height : areaBox.height,
      centerX: frameBox.left + frameBox.width / 2,
      centerY: frameBox.top + frameBox.height / 2,
      origin: {
        ...rect,
        focusX: adjustment.focusX,
        focusY: adjustment.focusY,
        rotation,
      },
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsBusy(true);
    if (kind === 'move' || kind === 'resize') {
      onPlace(photo.id, rect, { bringToFront: true });
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) < DRAG_TOLERANCE_PX) return;
    gesture.moved = true;

    const dxPercent = (dx / gesture.refWidth) * 100;
    const dyPercent = (dy / gesture.refHeight) * 100;

    if (gesture.kind === 'pan') {
      onAdjust(photo.id, {
        focusX: clamp(gesture.origin.focusX - dxPercent * PAN_SENSITIVITY, 0, 100),
        focusY: clamp(gesture.origin.focusY - dyPercent * PAN_SENSITIVITY, 0, 100),
      });
      return;
    }

    if (gesture.kind === 'move') {
      onPlace(photo.id, {
        ...gesture.origin,
        x: gesture.origin.x + dxPercent,
        y: gesture.origin.y + dyPercent,
      });
      return;
    }

    if (gesture.kind === 'rotate') {
      const delta =
        angleAt(gesture.centerX, gesture.centerY, event.clientX, event.clientY) -
        angleAt(gesture.centerX, gesture.centerY, gesture.startX, gesture.startY);
      // O ímã no zero é o que faz "deixar reta" ser fácil no arraste.
      onAdjust(photo.id, {
        rotation: clampRotation(gesture.origin.rotation + delta),
      });
      return;
    }

    // Redimensiona pelo canto, preservando a proporção do retângulo.
    const width = Math.max(1, gesture.origin.w + dxPercent);
    onPlace(photo.id, {
      ...gesture.origin,
      w: width,
      h: gesture.origin.h * (width / gesture.origin.w),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    setIsBusy(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (gesture && !gesture.moved) onSelect(photo.id);
  }

  const isPolaroid = frame === 'polaroid';
  const showCaption = interactive
    ? isSelected || caption.length > 0
    : caption.length > 0;

  return (
    <div
      ref={slotRef}
      style={{
        position: 'absolute',
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.w}%`,
        height: `${rect.h}%`,
        zIndex: isBusy || isSelected ? 40 : zIndex,
        transition: isBusy ? 'none' : PLACEMENT_TRANSITION,
      }}
      className="p-2"
    >
      <div
        ref={setFrameRefs}
        onPointerDown={(event) => beginGesture(event, isFree ? 'move' : 'pan')}
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
          interactive
            ? `touch-none ${isFree ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'}`
            : '',
          isDragging ? 'opacity-30' : '',
          isOver ? 'ring-2 ring-[var(--color-accent)]' : '',
          isSelected ? 'ring-2 ring-[var(--color-accent)]' : '',
        ].join(' ')}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt={photo.fileName}
            draggable={false}
            // Nada de lazy aqui: são no máximo duas páginas na tela, os
            // arquivos já estão em memória, e o carregamento tardio fazia a
            // foto piscar em branco a cada virada.
            loading="eager"
            decoding="sync"
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
            className="w-full shrink-0 select-text truncate border-0 bg-transparent px-1 py-1 text-center text-[11px] outline-none placeholder:text-current placeholder:opacity-30"
          />
        )}

        {interactive && (
          <>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onSendToTray(photo.id)}
              title="Tirar da página e mandar para o depósito"
              aria-label={`Tirar ${photo.fileName} da página`}
              className={HANDLE_CLASS + ' -left-2 -top-2 cursor-pointer'}
            >
              ↑
            </button>

            {isFree ? (
              <button
                type="button"
                onPointerDown={(event) => beginGesture(event, 'rotate')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={() => onAdjust(photo.id, { rotation: 0 })}
                title="Arraste para girar · clique duas vezes para endireitar"
                aria-label={`Girar ${photo.fileName}`}
                className={HANDLE_CLASS + ' -right-2 -top-2 cursor-alias touch-none'}
              >
                ↻
              </button>
            ) : (
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
                className={HANDLE_CLASS + ' -right-2 -top-2 cursor-grab'}
              >
                ⠿
              </button>
            )}

            {isFree && (
              <button
                type="button"
                onPointerDown={(event) => beginGesture(event, 'resize')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                title="Arraste para redimensionar"
                aria-label={`Redimensionar ${photo.fileName}`}
                className={
                  HANDLE_CLASS + ' -bottom-2 -right-2 cursor-nwse-resize touch-none'
                }
              >
                ◢
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
