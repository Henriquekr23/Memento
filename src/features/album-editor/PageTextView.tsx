'use client';

import { useState } from 'react';

import type { PageTextBlock } from '@/types/album-editor';

import { fontById } from './palette';
import { TEXT_BACKDROP, TEXT_PAD } from './pageLayout';
import { clamp, round, useDrag } from './useDrag';

interface PageTextViewProps {
  block: PageTextBlock;
  ppm: number;
  /** Tinta pareada da cor do álbum, usada quando o bloco não define a sua. */
  ink: string;
  selected: boolean;
  /** `false` nas miniaturas e no álbum publicado: desenha, não deixa mexer. */
  live: boolean;
  onSelect?: () => void;
  onChange?: (patch: Partial<PageTextBlock>) => void;
}

/**
 * Um bloco de texto na página.
 *
 * Mesma régua dos elementos da capa: as coordenadas são % da **área final**, e
 * o contêiner desta camada (`.ae-page-live`) está posicionado exatamente sobre o
 * retângulo de corte. O corpo é milímetro, como a gráfica mede.
 *
 * A edição acontece no lugar: um duplo clique troca o texto desenhado por uma
 * caixa de digitação do mesmo tamanho, com a mesma tipografia, por cima dele —
 * assim a linha quebra durante a digitação exatamente onde vai quebrar
 * impressa.
 */
export function PageTextView({
  block,
  ppm,
  ink,
  selected,
  live,
  onSelect,
  onChange,
}: PageTextViewProps) {
  const startDrag = useDrag();
  const [editing, setEditing] = useState(false);

  const font = fontById(block.font);
  const size = block.size * ppm;
  const color = block.color ?? ink;

  const dragBody = (event: React.PointerEvent) => {
    if (!live || !onChange) return;
    onSelect?.();
    if (editing) return;

    const stage = (event.currentTarget as HTMLElement).closest('.ae-page-live');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const origin = { x: block.x, y: block.y };

    startDrag(event, (dx, dy) => {
      onChange({
        // O bloco anda pela página inteira e um pouco além dela: texto que
        // sangra é decisão de quem monta, não erro a impedir.
        x: clamp(round(origin.x + (dx / rect.width) * 100, 2), -20, 120),
        y: clamp(round(origin.y + (dy / rect.height) * 100, 2), -20, 120),
      });
    });
  };

  const dragWidth = (event: React.PointerEvent, sign: 1 | -1) => {
    if (!onChange) return;
    const stage = (event.currentTarget as HTMLElement).closest('.ae-page-live');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const origin = block.width;
    startDrag(event, (dx) => {
      onChange({
        width: clamp(round(origin + ((sign * dx * 2) / rect.width) * 100, 1), 10, 100),
      });
    });
  };

  const dragSize = (event: React.PointerEvent) => {
    if (!onChange) return;
    const origin = block.size;
    startDrag(event, (dx, dy) => {
      onChange({ size: clamp(round(origin + (dx + dy) / 2 / ppm, 1), 2, 60) });
    });
  };

  const type: React.CSSProperties = {
    fontFamily: font.stack,
    fontWeight: font.weight,
    fontSize: size,
    lineHeight: block.leading,
    letterSpacing: `${block.tracking / 100}em`,
    textTransform: block.uppercase ? 'uppercase' : 'none',
    textAlign: block.align,
    color,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <div
      className={`ae-ptext${selected ? ' is-selected' : ''}${live ? '' : ' is-static'}`}
      style={{
        left: `${block.x}%`,
        top: `${block.y}%`,
        width: `${block.width}%`,
        minHeight: size,
        transform: `translate(-50%, -50%) rotate(${block.rotation}deg)`,
        padding:
          block.backdrop === 'none'
            ? 0
            : `${size * TEXT_PAD.y}px ${size * TEXT_PAD.x}px`,
        background:
          block.backdrop === 'none' ? 'transparent' : TEXT_BACKDROP[block.backdrop],
        cursor: live ? 'move' : 'default',
      }}
      onPointerDown={dragBody}
      onDoubleClick={() => live && onChange && setEditing(true)}
    >
      {/* O texto desenhado continua no lugar durante a edição, invisível: é ele
          que dá altura à caixa, e a caixa de digitação por cima usa essa altura
          para não pular de tamanho na primeira tecla. */}
      <div style={{ ...type, opacity: editing ? 0 : 1, userSelect: 'none' }}>
        {block.text || ' '}
      </div>

      {editing && (
        <textarea
          className="ae-ptext-edit"
          autoFocus
          value={block.text}
          aria-label={block.text}
          style={type}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange?.({ text: event.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') event.currentTarget.blur();
          }}
        />
      )}

      {selected && live && !editing && (
        <>
          <span
            className="ae-h ae-h-width"
            style={{ left: -5 }}
            onPointerDown={(event) => dragWidth(event, -1)}
          />
          <span
            className="ae-h ae-h-width"
            style={{ right: -5 }}
            onPointerDown={(event) => dragWidth(event, 1)}
          />
          <span
            className="ae-h ae-h-corner"
            style={{ right: -5, bottom: -5 }}
            onPointerDown={dragSize}
          />
        </>
      )}
    </div>
  );
}
