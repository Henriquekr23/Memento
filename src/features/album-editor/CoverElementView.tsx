'use client';

import { SPEC } from '@/features/album-print/spec';
import type { CoverElement } from '@/types/album-editor';

import { IconRotate } from './icons';
import { Motif } from './motifs';
import { fontById } from './palette';
import { clamp, round, useDrag } from './useDrag';

/** Devolve a posição já encaixada e avisa quem desenha as linhas-guia. */
export type SnapFn = (x: number | null, y: number | null) => { x: number; y: number };

interface CoverElementViewProps {
  element: CoverElement;
  ppm: number;
  /** Tinta pareada da cor do álbum, usada quando o elemento não define a sua. */
  ink: string;
  paper: string;
  selected: boolean;
  /** `false` no livro 3D e nas miniaturas: desenha, não deixa mexer. */
  live: boolean;
  onSelect?: (id: string) => void;
  onChange?: (patch: Partial<CoverElement>) => void;
  snapTo?: SnapFn;
}

/**
 * Um elemento da capa: texto ou grafismo.
 *
 * As coordenadas são porcentagem da **área final**. O contêiner `.ae-live` está
 * posicionado exatamente sobre o retângulo de corte, então "centralizado" aqui
 * é centralizado na página impressa — medir a partir do arquivo com sangria
 * deixaria tudo 2,5 mm fora do lugar.
 */
export function CoverElementView({
  element,
  ppm,
  ink,
  paper,
  selected,
  live,
  onSelect,
  onChange,
  snapTo,
}: CoverElementViewProps) {
  const startDrag = useDrag();
  const color = element.color ?? ink;

  const dragBody = (event: React.PointerEvent) => {
    if (!live || !onChange) return;
    onSelect?.(element.id);

    const origin = { x: element.x, y: element.y };
    const stage = (event.currentTarget as HTMLElement).closest('.ae-live');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();

    startDrag(
      event,
      (dx, dy, ev) => {
        let x = origin.x + (dx / rect.width) * 100;
        let y = origin.y + (dy / rect.height) * 100;
        // Alt desliga o encaixe magnético — é como se solta do centro.
        if (!ev.altKey && snapTo) {
          const snapped = snapTo(x, y);
          x = snapped.x;
          y = snapped.y;
        }
        onChange({ x: round(x, 2), y: round(y, 2) });
      },
      () => snapTo?.(null, null),
    );
  };

  const dragSize = (event: React.PointerEvent) => {
    if (!onChange) return;
    const origin = element.size;
    startDrag(event, (dx, dy) => {
      const delta = (dx + dy) / 2 / ppm;
      onChange({ size: clamp(round(origin + delta, 1), 3, 110) });
    });
  };

  const dragWidth = (event: React.PointerEvent, sign: 1 | -1) => {
    if (!onChange || element.kind !== 'text') return;
    const origin = element.width;
    const stage = (event.currentTarget as HTMLElement).closest('.ae-live');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    startDrag(event, (dx) => {
      onChange({
        width: clamp(round(origin + ((sign * dx * 2) / rect.width) * 100, 1), 10, 100),
      });
    });
  };

  const dragRotation = (event: React.PointerEvent) => {
    if (!onChange) return;
    const node = (event.currentTarget as HTMLElement).closest('.ae-el');
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const base = element.rotation;
    const a0 = Math.atan2(event.clientY - cy, event.clientX - cx);

    startDrag(event, (_dx, _dy, ev) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let degrees = base + ((a - a0) * 180) / Math.PI;
      // Passo de 5°, a não ser que o usuário segure Alt.
      if (!ev.altKey) degrees = Math.round(degrees / 5) * 5;
      onChange({ rotation: round(degrees, 1) });
    });
  };

  const common: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    cursor: live ? 'move' : 'default',
  };

  const handles = selected && live && (
    <>
      <span className="ae-h ae-h-rot" onPointerDown={dragRotation}>
        <IconRotate size={10} />
      </span>
      <span
        className="ae-h ae-h-corner"
        style={{ right: -5, bottom: -5 }}
        onPointerDown={dragSize}
      />
      {element.kind === 'text' && (
        <>
          <span
            className="ae-h ae-h-width"
            style={{ left: -5 }}
            onPointerDown={(e) => dragWidth(e, -1)}
          />
          <span
            className="ae-h ae-h-width"
            style={{ right: -5 }}
            onPointerDown={(e) => dragWidth(e, 1)}
          />
        </>
      )}
    </>
  );

  if (element.kind === 'motif') {
    const side = (element.size / 100) * SPEC.trim.w * ppm;
    return (
      <div
        className={`ae-el${selected ? ' is-selected' : ''}`}
        style={{ ...common, width: side, height: side }}
        onPointerDown={dragBody}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible' }}
          aria-hidden="true"
        >
          <Motif shape={element.shape} ink={color} paper={paper} />
        </svg>
        {handles}
      </div>
    );
  }

  const font = fontById(element.font);

  return (
    <div
      className={`ae-el${selected ? ' is-selected' : ''}`}
      style={{ ...common, width: `${element.width}%` }}
      onPointerDown={dragBody}
    >
      <div
        style={{
          fontFamily: font.stack,
          fontWeight: font.weight,
          // O corpo é dado em milímetros — é assim que a gráfica mede.
          fontSize: element.size * ppm,
          lineHeight: element.leading,
          letterSpacing: `${element.tracking / 100}em`,
          textTransform: element.uppercase ? 'uppercase' : 'none',
          textAlign: element.align,
          color,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          userSelect: 'none',
        }}
      >
        {element.text || ' '}
      </div>
      {handles}
    </div>
  );
}
