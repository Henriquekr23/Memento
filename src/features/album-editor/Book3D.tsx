'use client';

import { useState } from 'react';

import { SPEC, spineTextSize } from '@/features/album-print/spec';
import type { EditorAlbum } from '@/types/album-editor';
import { titleOf } from '@/types/album-editor';

import { CoverElementView } from './CoverElementView';
import { IconMove } from './icons';
import { colorById, fontById } from './palette';
import { clamp, useDrag } from './useDrag';

interface Book3DProps {
  album: EditorAlbum;
  spine: number;
  ppm: number;
  hint: string;
}

/**
 * O álbum como objeto: capa, lombada, corte do miolo e topo visíveis ao mesmo
 * tempo, orbitável com o mouse.
 *
 * Um flipbook (`react-pageflip` e afins) mostra páginas planas; o que a
 * referência de capa pede é o volume — é aqui que o título na lombada existe de
 * verdade. Seis faces em `transform` 3D dão isso sem dependência nenhuma.
 */
export function Book3D({ album, spine, ppm, hint }: Book3DProps) {
  const [rotation, setRotation] = useState({ x: 6, y: -34 });
  const startDrag = useDrag();

  const color = colorById(album.color);
  const width = SPEC.trim.w * ppm;
  const height = SPEC.trim.h * ppm;
  const depth = Math.max(spine * ppm, 6);

  const title = titleOf(album);
  const spineSize = spineTextSize(spine, album.spine.size);

  const orbit = (event: React.PointerEvent) => {
    const origin = { ...rotation };
    startDrag(event, (dx, dy) =>
      setRotation({
        y: clamp(origin.y + dx * 0.35, -72, 8),
        x: clamp(origin.x - dy * 0.2, -14, 26),
      }),
    );
  };

  const face = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    top: '50%',
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
    ...extra,
  });

  // Papel do miolo visto de lado: um creme neutro com a listra das folhas.
  const edge = '#F4F1E9';

  return (
    <div className="ae-3d-stage" onPointerDown={orbit}>
      <div
        className="ae-3d-box"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          width,
          height,
        }}
      >
        <div
          style={face({
            width,
            height,
            background: color.bg,
            transform: `translate(-50%,-50%) translateZ(${depth / 2}px)`,
            borderRadius: '1px 3px 3px 1px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)',
          })}
        >
          {album.elements.map((element) => (
            <CoverElementView
              key={element.id}
              element={element}
              ppm={ppm}
              ink={color.ink}
              paper={color.bg}
              selected={false}
              live={false}
            />
          ))}
        </div>

        <div
          style={face({
            width,
            height,
            background: color.bg,
            transform: `translate(-50%,-50%) translateZ(${-depth / 2}px) rotateY(180deg)`,
            borderRadius: '3px 1px 1px 3px',
          })}
        />

        <div
          style={face({
            width: depth,
            height,
            background: color.bg,
            transform: `translate(-50%,-50%) translateX(${-width / 2}px) rotateY(-90deg)`,
            filter: 'brightness(.93)',
          })}
        >
          {album.spine.show && title && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: `${album.spine.offset}%`,
                transform: `translate(-50%,-50%) rotate(${
                  album.spine.direction === 'ascending' ? -90 : 90
                }deg)`,
                whiteSpace: 'nowrap',
                fontFamily: fontById(title.font).stack,
                fontSize: spineSize * ppm,
                letterSpacing: '0.02em',
                lineHeight: 1,
                color: title.color ?? color.ink,
                textTransform: title.uppercase ? 'uppercase' : 'none',
              }}
            >
              {title.text}
              {album.spine.showYear && album.spine.year && (
                <span style={{ opacity: 0.6, marginLeft: '1.2em', fontSize: '0.8em' }}>
                  {album.spine.year}
                </span>
              )}
            </div>
          )}
        </div>

        <div
          style={face({
            width: depth - 2,
            height: height - 3,
            background: edge,
            transform: `translate(-50%,-50%) translateX(${width / 2 - 1.5}px) rotateY(90deg)`,
            backgroundImage:
              'repeating-linear-gradient(90deg,rgba(0,0,0,.09) 0 1px,transparent 1px 2.5px)',
          })}
        />

        <div
          style={face({
            width: width - 2,
            height: depth - 2,
            background: edge,
            transform: `translate(-50%,-50%) translateY(${-height / 2 + 1}px) rotateX(90deg)`,
            backgroundImage:
              'repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 1px,transparent 1px 2.5px)',
          })}
        />
      </div>

      <p className="ae-3d-hint">
        <IconMove size={11} /> {hint}
      </p>
    </div>
  );
}
