'use client';

import { useEffect, useRef, useState } from 'react';

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

/** Limites da órbita. O livro nunca mostra o fundo da cena nem o próprio verso. */
const YAW = { min: -78, max: 14 };
const PITCH = { min: -18, max: 30 };

/** Sobra da capa além do miolo, em mm — é o que todo livro tem de verdade. */
const OVERHANG = 2.5;

/**
 * O álbum como objeto: capa, lombada, miolo com folhas e sombra no chão,
 * orbitável com o mouse e com inércia ao soltar.
 *
 * Um flipbook (`react-pageflip` e afins) mostra páginas planas; o que a
 * referência de capa pede é volume. Aqui o livro é montado como dois corpos —
 * a capa (que sobra 2,5 mm) e o bloco do miolo, encaixado dentro dela — porque
 * é essa diferença que o olho lê como "livro" em vez de "caixa".
 */
export function Book3D({ album, spine, ppm, hint }: Book3DProps) {
  const [rotation, setRotation] = useState({ x: 8, y: -36 });
  const startDrag = useDrag();

  // Inércia: a velocidade do último quadro do arraste vira giro que desacelera.
  const spin = useRef({ vy: 0, raf: 0, last: 0 });

  useEffect(
    () => () => {
      if (spin.current.raf) cancelAnimationFrame(spin.current.raf);
    },
    [],
  );

  const color = colorById(album.color);
  const width = SPEC.trim.w * ppm;
  const height = SPEC.trim.h * ppm;
  const depth = Math.max(spine * ppm, 6);
  const over = OVERHANG * ppm;

  const blockW = width - over;
  const blockH = height - over * 2;
  const blockD = Math.max(depth - over, 3);

  const title = titleOf(album);
  const spineSize = spineTextSize(spine, album.spine.size);

  const glide = () => {
    const step = () => {
      const state = spin.current;
      state.vy *= 0.94;
      if (Math.abs(state.vy) < 0.02) {
        state.raf = 0;
        return;
      }
      setRotation((current) => ({
        x: current.x,
        y: clamp(current.y + state.vy, YAW.min, YAW.max),
      }));
      state.raf = requestAnimationFrame(step);
    };
    if (!spin.current.raf) spin.current.raf = requestAnimationFrame(step);
  };

  const orbit = (event: React.PointerEvent) => {
    if (spin.current.raf) {
      cancelAnimationFrame(spin.current.raf);
      spin.current.raf = 0;
    }
    const origin = { ...rotation };
    let previous = 0;
    startDrag(
      event,
      (dx, dy) => {
        spin.current.vy = (dx - previous) * 0.35;
        previous = dx;
        setRotation({
          y: clamp(origin.y + dx * 0.35, YAW.min, YAW.max),
          x: clamp(origin.x - dy * 0.2, PITCH.min, PITCH.max),
        });
      },
      () => glide(),
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

  // Papel do miolo visto de lado: creme neutro com a listra das folhas.
  const edge = '#F4F1E9';
  const leaves = 'repeating-linear-gradient(90deg,rgba(0,0,0,.10) 0 1px,rgba(255,255,255,.55) 1px 2.6px)';

  /* A luz da cena é fixa; quem gira é o livro. O brilho na capa acompanha o
     giro para que a superfície pareça receber essa luz, e não ter o brilho
     pintado nela. */
  const sheen = clamp((rotation.y - YAW.min) / (YAW.max - YAW.min), 0, 1);

  return (
    <div className="ae-3d-stage" onPointerDown={orbit}>
      <div className="ae-3d-scene">
        <div
          className="ae-3d-box"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            width,
            height,
          }}
        >
          {/* ── bloco do miolo: menor que a capa em todos os lados ── */}
          <div
            style={face({
              width: blockW,
              height: blockH,
              background: edge,
              transform: `translate(-50%,-50%) translateX(${over / 2}px) translateZ(${blockD / 2}px)`,
              boxShadow: 'inset 0 0 12px -6px rgba(0,0,0,.4)',
            })}
          />
          <div
            style={face({
              width: blockD,
              height: blockH,
              backgroundColor: edge,
              backgroundImage: leaves,
              transform: `translate(-50%,-50%) translateX(${width / 2 - over}px) rotateY(90deg)`,
              filter: 'brightness(.97)',
            })}
          />
          <div
            style={face({
              width: blockW,
              height: blockD,
              backgroundColor: edge,
              backgroundImage: leaves.replace('90deg', '0deg'),
              transform: `translate(-50%,-50%) translateX(${over / 2}px) translateY(${-blockH / 2}px) rotateX(90deg)`,
              filter: 'brightness(1.02)',
            })}
          />
          <div
            style={face({
              width: blockW,
              height: blockD,
              backgroundColor: edge,
              backgroundImage: leaves.replace('90deg', '0deg'),
              transform: `translate(-50%,-50%) translateX(${over / 2}px) translateY(${blockH / 2}px) rotateX(-90deg)`,
              filter: 'brightness(.9)',
            })}
          />

          {/* ── capa ── */}
          <div
            style={face({
              width,
              height,
              background: color.bg,
              transform: `translate(-50%,-50%) translateZ(${depth / 2}px)`,
              borderRadius: '1.5px 4px 4px 1.5px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)',
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
            {/* Vinco da dobra junto à lombada e o brilho da luz da cena. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: `linear-gradient(90deg, rgba(0,0,0,.22) 0, rgba(0,0,0,0) ${Math.max(
                  4,
                  over * 2,
                )}px), linear-gradient(${105 - sheen * 40}deg, rgba(255,255,255,${
                  0.06 + sheen * 0.16
                }) 0%, rgba(255,255,255,0) 46%)`,
              }}
            />
          </div>

          {/* contracapa */}
          <div
            style={face({
              width,
              height,
              background: color.bg,
              transform: `translate(-50%,-50%) translateZ(${-depth / 2}px) rotateY(180deg)`,
              borderRadius: '4px 1.5px 1.5px 4px',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)',
              filter: 'brightness(.86)',
            })}
          />

          {/* lombada */}
          <div
            style={face({
              width: depth,
              height,
              background: color.bg,
              transform: `translate(-50%,-50%) translateX(${-width / 2}px) rotateY(-90deg)`,
              filter: `brightness(${0.82 + sheen * 0.16})`,
              borderRadius: '2px',
              overflow: 'hidden',
            })}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(0,0,0,.28), rgba(255,255,255,.12) 42%, rgba(0,0,0,.3))',
                pointerEvents: 'none',
              }}
            />
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

          {/* topo e base da capa: o que fecha o volume por cima e por baixo */}
          <div
            style={face({
              width,
              height: depth,
              background: color.bg,
              transform: `translate(-50%,-50%) translateY(${-height / 2}px) rotateX(90deg)`,
              filter: 'brightness(1.06)',
            })}
          />
          <div
            style={face({
              width,
              height: depth,
              background: color.bg,
              transform: `translate(-50%,-50%) translateY(${height / 2}px) rotateX(-90deg)`,
              filter: 'brightness(.72)',
            })}
          />

          {/* Sombra de contato: deitada no chão da cena, não atrás do objeto. */}
          <div
            aria-hidden
            style={face({
              width: width * 1.25,
              height: depth * 3 + height * 0.22,
              transform: `translate(-50%,-50%) translateY(${height / 2 + 6}px) rotateX(90deg) translateZ(${-depth / 2}px)`,
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.42), rgba(0,0,0,0) 70%)',
              filter: 'blur(6px)',
              backfaceVisibility: 'visible',
            })}
          />
        </div>
      </div>

      <p className="ae-3d-hint">
        <IconMove size={11} /> {hint}
      </p>
    </div>
  );
}
