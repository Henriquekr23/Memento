'use client';

import { useEffect, useRef, useState } from 'react';

import { COVER_MM, SPEC, spineTextSize } from '@/features/album-print/spec';
import type { EditorAlbum } from '@/types/album-editor';
import { titleOf } from '@/types/album-editor';

import { CoverElementView } from './CoverElementView';
import { IconMove } from './icons';
import { COVER_FONTS, colorById, fontById } from './palette';
import { clamp, useDrag } from './useDrag';

interface Book3DProps {
  album: EditorAlbum;
  spine: number;
  ppm: number;
  hint: string;
}

/** Pose de repouso: capa de frente, lombada à mostra à esquerda. */
const REST = { x: 7, y: 27 };

/** Duração da entrada, em ms. */
const INTRO_MS = 760;

/** Inclinação vertical. A órbita horizontal é livre: a contracapa é uma face
 *  como as outras e precisa poder ser vista. */
const PITCH = { min: -22, max: 34 };

/** Sobra da capa além do miolo, em mm — é o que todo livro tem de verdade. */
const OVERHANG = 2.5;

/**
 * Direção da luz da cena, em graus no plano horizontal.
 *
 * Ela fica quase de frente para a pose de repouso, e um pouco à direita: assim
 * a capa recebe a luz cheia e a lombada cai na sombra. Com a luz do outro lado
 * acontecia o contrário — a lombada saía mais clara que a capa e sumia dentro
 * dela, que é o efeito de "não tem lombada nenhuma". Quem gira é o livro; a luz
 * fica parada, e é isso que dá volume ao girar.
 */
const LIGHT = 18;

/** Luz recebida por uma face, dado o ângulo da normal dela em repouso. */
function lit(normalDeg: number, yaw: number, ambient: number, diffuse: number): number {
  const angle = ((normalDeg + yaw - LIGHT) * Math.PI) / 180;
  return ambient + diffuse * Math.max(0, Math.cos(angle));
}

/**
 * O álbum como objeto: capa, contracapa, lombada, bloco de folhas e sombra de
 * contato, orbitável com o mouse e com inércia ao soltar.
 *
 * Um flipbook (`react-pageflip` e afins) mostra páginas planas; o que a
 * referência de capa pede é volume. Aqui o livro é montado como dois corpos —
 * a capa (que sobra 2,5 mm por fora) e o bloco do miolo, encaixado dentro dela
 * — porque é essa diferença que o olho lê como "livro" em vez de "caixa".
 *
 * A cena é 3D de verdade, e isso impõe uma regra: **nada que carregue
 * `transform-style: preserve-3d` pode receber uma propriedade de agrupamento**
 * (`filter`, `opacity` < 1, `mask`). Ela força o `preserve-3d` a virar `flat` e
 * achata todas as faces no mesmo plano — o livro vira um cartão com uma listra
 * na borda, que foi exatamente o que um `drop-shadow` na caixa causou aqui. A
 * sombra projetada, por isso, é um elemento irmão fora da caixa.
 */
export function Book3D({ album, spine, ppm, hint }: Book3DProps) {
  const [rotation, setRotation] = useState(REST);
  const startDrag = useDrag();

  // Inércia: a velocidade do último quadro do arraste vira giro que desacelera.
  const spin = useRef({ vy: 0, raf: 0 });

  useEffect(
    () => () => {
      if (spin.current.raf) cancelAnimationFrame(spin.current.raf);
    },
    [],
  );

  /*
   * A entrada: o livro chega de frente e gira até a pose de repouso.
   *
   * É o único movimento automático da tela, e ele existe para dizer uma coisa
   * que nenhum rótulo diz tão rápido — isto é um objeto, e dá para virar. Quem
   * pediu menos movimento no sistema não vê a animação; vê o livro já parado no
   * lugar certo.
   */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / INTRO_MS);
      const eased = 1 - (1 - t) ** 3;
      setRotation({ x: REST.x * eased, y: REST.y * eased });
      if (t < 1) raf = requestAnimationFrame(step);
    };
    // O primeiro quadro do `step` já põe a rotação em zero; pôr aqui seria
    // mexer no estado dentro do efeito para ganhar um quadro que ninguém vê.
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const color = colorById(album.color);
  const width = SPEC.trim.w * ppm;
  const height = SPEC.trim.h * ppm;
  const depth = Math.max(spine * ppm, 5);
  const over = OVERHANG * ppm;

  /*
   * O bloco de folhas.
   *
   * Ele ocupa a espessura da lombada menos as duas capas — num álbum acabado as
   * capas são paralelas, então o corte lateral tem a mesma espessura da
   * lombada. O que **conta as páginas** é a listra: uma raia por folha
   * impressa, calculada a partir da contagem real. Assim o mesmo bloco de
   * 4 mm mostra cinco raias grossas com dez páginas e raias finas e cerradas
   * com cem — que é o que se vê no corte de um livro de verdade.
   *
   * (Medir o bloco pelo papel — 0,8 mm nas dez páginas — seria fiel ao miolo e
   * mentiroso sobre o objeto: a lombada tem 4 mm de mínimo de gabarito, e o
   * livro fechado tem essa espessura em todos os lados.)
   */
  const sheetCount = Math.max(1, Math.ceil(album.pages.length / 2));
  const blockD = Math.max(2, depth - COVER_MM * ppm);

  const blockW = width - over;
  const blockH = height - over * 2;

  const title = titleOf(album);
  const spineSize = spineTextSize(spine, album.spine.size);

  /* Nunca mais fina que o que a tela consegue desenhar: abaixo de ~0,9 px a
     listra vira um cinza chapado e deixa de contar qualquer coisa. */
  const pitch = clamp(blockD / sheetCount, 0.9, blockD);
  const ink = (pitch * 0.34).toFixed(2);
  const leaves = (deg: number) =>
    `repeating-linear-gradient(${deg}deg,` +
    `rgba(120,110,96,.34) 0 ${ink}px,` +
    `rgba(255,253,247,.92) ${ink}px ${pitch.toFixed(2)}px)`;

  const glide = () => {
    const step = () => {
      const state = spin.current;
      state.vy *= 0.94;
      if (Math.abs(state.vy) < 0.02) {
        state.raf = 0;
        return;
      }
      setRotation((current) => ({ x: current.x, y: current.y + state.vy }));
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
        spin.current.vy = (dx - previous) * 0.32;
        previous = dx;
        setRotation({
          y: origin.y + dx * 0.32,
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

  /** Papel do miolo visto de lado: creme neutro, nunca branco de tela. */
  const edge = '#F6F2E9';

  const yaw = rotation.y;

  /* Quanto a capa da frente está virada para a luz — é isto que move o brilho
     pela superfície, para que ela pareça *receber* a luz da cena em vez de ter
     o brilho pintado nela. */
  const sheen = clamp(lit(0, yaw, 0, 1), 0, 1);

  /* Grão do papelão da capa: duas tramas cruzadas finíssimas. Sem isso a capa é
     um retângulo de cor chapada, e é essa chapa que lê como "cru". */
  const boardTexture =
    'repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, rgba(0,0,0,.05) 1px 2px),' +
    'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, rgba(0,0,0,.04) 1px 2px)';

  const board = (normal: number): React.CSSProperties => ({
    backgroundColor: color.bg,
    backgroundImage: boardTexture,
    backgroundBlendMode: 'overlay',
    filter: `brightness(${lit(normal, yaw, 0.7, 0.36).toFixed(3)})`,
  });

  /*
   * O vinco da capa mole, a 7 mm do corte — a mesma medida que `PrintGuides`
   * desenha no gabarito. É por ali que a capa dobra, e é essa linha que separa
   * a lombada da capa aos olhos mesmo num álbum de 4 mm.
   */
  const crease = (side: 'left' | 'right') => {
    const at = SPEC.hinge * ppm;
    const to = side === 'left' ? 90 : 270;
    return (
      `linear-gradient(${to}deg, transparent 0 ${(at - 1).toFixed(1)}px,` +
      `rgba(0,0,0,.16) ${(at - 1).toFixed(1)}px ${at.toFixed(1)}px,` +
      `rgba(255,255,255,.12) ${at.toFixed(1)}px ${(at + 1).toFixed(1)}px,` +
      `transparent ${(at + 1).toFixed(1)}px)`
    );
  };

  /* Girar pelo teclado: sem isto a única forma de ver a lombada e a contracapa
     seria arrastar com o ponteiro. */
  const onKey = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 15 : 5;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const way = event.key === 'ArrowLeft' ? -1 : 1;
      setRotation((current) => ({ ...current, y: current.y + way * step }));
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const way = event.key === 'ArrowUp' ? -1 : 1;
      setRotation((current) => ({
        ...current,
        x: clamp(current.x + way * step, PITCH.min, PITCH.max),
      }));
    }
  };

  return (
    <div
      className="ae-3d-stage"
      tabIndex={0}
      role="img"
      aria-label={hint}
      onPointerDown={orbit}
      onKeyDown={onKey}
    >
      <div className="ae-3d-scene">
        {/* Sombra projetada no chão: plana, atrás do livro e fora do espaço 3D
            dele — dentro da caixa ela ficaria escondida no próprio volume, e um
            `filter` ali achataria a cena inteira. Ela encolhe quando o livro
            gira de perfil, porque é menos objeto tapando a luz. */}
        <span
          aria-hidden
          className="ae-3d-cast"
          style={{
            width: width * 1.02,
            height: Math.max(16, depth * 2 + height * 0.05),
            transform: `translate(-50%,-18%) scaleX(${(
              0.62 + Math.abs(Math.cos((yaw * Math.PI) / 180)) * 0.38
            ).toFixed(3)})`,
          }}
        />

        <div
          className="ae-3d-box"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${yaw}deg)`,
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
              boxShadow: 'inset 0 0 14px -6px rgba(0,0,0,.45)',
            })}
          />
          {/* corte lateral: as folhas vistas de frente, uma raia por folha */}
          <div
            style={face({
              width: blockD,
              height: blockH,
              backgroundColor: edge,
              backgroundImage: leaves(90),
              transform: `translate(-50%,-50%) translateX(${width / 2 - over}px) rotateY(90deg)`,
              filter: `brightness(${lit(90, yaw, 0.8, 0.26).toFixed(3)})`,
              boxShadow: 'inset 0 0 8px -3px rgba(0,0,0,.5)',
            })}
          />
          {/* cabeça e pé do bloco */}
          <div
            style={face({
              width: blockW,
              height: blockD,
              backgroundColor: edge,
              backgroundImage: leaves(0),
              transform: `translate(-50%,-50%) translateX(${over / 2}px) translateY(${-blockH / 2}px) rotateX(90deg)`,
              filter: 'brightness(1.04)',
            })}
          />
          <div
            style={face({
              width: blockW,
              height: blockD,
              backgroundColor: edge,
              backgroundImage: leaves(0),
              transform: `translate(-50%,-50%) translateX(${over / 2}px) translateY(${blockH / 2}px) rotateX(-90deg)`,
              filter: 'brightness(.82)',
            })}
          />

          {/* ── capa ── */}
          <div
            style={face({
              ...board(0),
              width,
              height,
              transform: `translate(-50%,-50%) translateZ(${depth / 2}px)`,
              borderRadius: '1.5px 5px 5px 1.5px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)',
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
            {/* Vinco da dobra junto à lombada, curvatura do papelão na borda de
                fora e o brilho da luz da cena, que anda com o giro. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: `${crease('left')}, linear-gradient(90deg, rgba(0,0,0,.26) 0, rgba(0,0,0,0) ${Math.max(
                  5,
                  over * 2.2,
                )}px), linear-gradient(270deg, rgba(0,0,0,.16) 0, rgba(0,0,0,0) ${Math.max(
                  3,
                  over,
                )}px), linear-gradient(${(112 - sheen * 46).toFixed(1)}deg, rgba(255,255,255,${(
                  0.05 +
                  sheen * 0.2
                ).toFixed(3)}) 0%, rgba(255,255,255,0) 52%)`,
              }}
            />
          </div>

          {/* ── contracapa: face inteira, com o texto que a pessoa escreveu ── */}
          <div
            style={face({
              ...board(180),
              width,
              height,
              transform: `translate(-50%,-50%) translateZ(${-depth / 2}px) rotateY(180deg)`,
              borderRadius: '5px 1.5px 1.5px 5px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)',
            })}
          >
            {album.back.show && album.back.text && (
              <div
                style={{
                  position: 'absolute',
                  left: SPEC.safe.outer * ppm,
                  right: SPEC.safe.spine * ppm,
                  bottom: SPEC.safe.bottom * ppm,
                  color: color.ink,
                  fontFamily: COVER_FONTS[5].stack,
                  fontSize: 3.2 * ppm,
                  lineHeight: 1.5,
                  opacity: 0.85,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {album.back.text}
              </div>
            )}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  `${crease('right')},` +
                  'linear-gradient(270deg, rgba(0,0,0,.26) 0, rgba(0,0,0,0) 14px),' +
                  'linear-gradient(90deg, rgba(0,0,0,.14) 0, rgba(0,0,0,0) 10px)',
              }}
            />
          </div>

          {/* ── lombada ── */}
          <div
            style={face({
              ...board(-90),
              width: depth,
              height,
              transform: `translate(-50%,-50%) translateX(${-width / 2}px) rotateY(-90deg)`,
              borderRadius: '2px',
              overflow: 'hidden',
            })}
          >
            {/* O lombo é redondo e some nas duas dobras: são estas duas sombras
                nas beiradas que dão a curva. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(0,0,0,.34), rgba(255,255,255,.16) 44%, rgba(0,0,0,.36))',
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
              ...board(0),
              width,
              height: depth,
              transform: `translate(-50%,-50%) translateY(${-height / 2}px) rotateX(90deg)`,
              filter: 'brightness(1.08)',
            })}
          />
          <div
            style={face({
              ...board(0),
              width,
              height: depth,
              transform: `translate(-50%,-50%) translateY(${height / 2}px) rotateX(-90deg)`,
              filter: 'brightness(.68)',
            })}
          />

          {/* Sombra de contato: deitada no chão da cena, não atrás do objeto. */}
          <div
            aria-hidden
            style={face({
              width: width * 1.15,
              height: depth * 3 + height * 0.18,
              transform: `translate(-50%,-50%) translateY(${height / 2 + 4}px) rotateX(90deg) translateZ(${-depth / 2}px)`,
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.55), rgba(0,0,0,0) 70%)',
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
