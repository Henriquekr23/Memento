'use client';

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import type { AlbumPage } from '@/lib/paginate';

import {
  leftIndexOf,
  rightIndexOf,
  type PageSide,
  type SpreadView,
} from './bookGeometry';
import { BookPage, type BookPageProps } from './BookPage';
import { TURN_DURATION_MS, type TurnDirection, type TurnState } from './usePageTurn';

/**
 * O livro em si: perspectiva, páginas, folha em movimento, sombras e o gesto
 * de folhear. Só desenha e captura o arraste — quem decide o que aparece é a
 * geometria, e quem guarda o conteúdo é o estado do álbum.
 */

/** Faixa da largura do livro que conta como "borda" para clique de virar. */
const EDGE_RATIO = 0.12;
const CLICK_TOLERANCE_PX = 4;
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/** Propriedades comuns a todas as páginas, montadas uma vez pelo álbum. */
type SharedPageProps = Omit<
  BookPageProps,
  'page' | 'side' | 'caption' | 'interactive'
>;

interface BookStageProps {
  pages: AlbumPage[];
  view: SpreadView;
  spread: number;
  turn: TurnState | null;
  captions: Record<string, string>;
  pageProps: SharedPageProps;
  onBeginDrag: (
    direction: TurnDirection,
    startX: number,
    width: number,
  ) => boolean;
  onUpdateDrag: (clientX: number) => void;
  onEndDrag: (force?: boolean) => void;
}

/**
 * Escurecimento da folha em movimento: mais forte junto à lombada, que é onde
 * o papel se dobra e recebe menos luz. Preto chapado deixava a página com cara
 * de cartão apagando, não de folha virando.
 */
function foldGradient(side: PageSide): string {
  const towardsSpine = side === 'right' ? 'left' : 'right';
  return `linear-gradient(to ${towardsSpine}, rgba(0,0,0,0.04), rgba(0,0,0,0.62))`;
}

/**
 * Espessura do livro: as folhas que sobram de cada lado.
 *
 * Só aparece com o álbum aberto. De frente para um livro fechado você vê a
 * capa e mais nada — as folhas estão atrás dela. Desenhar a espessura ali
 * criava uma faixa clara colada na capa, que parecia margem sobrando.
 */
function PageEdges({
  side,
  remaining,
  openness,
}: {
  side: PageSide;
  remaining: number;
  openness: number;
}) {
  if (remaining <= 0 || openness <= 0.01) return null;

  const thickness = Math.min(9, Math.max(2, Math.round(remaining / 3)));
  const direction = side === 'left' ? 'left' : 'right';

  return (
    // inset-0 (e não inset-y-0): a caixa precisa ter a largura do livro, senão
    // as folhas do lado direito iriam parar na lombada.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{ opacity: openness }}
    >
      <span
        style={{
          [side]: `${-thickness}px`,
          top: '3px',
          bottom: '3px',
          width: `${thickness}px`,
          backgroundImage: `repeating-linear-gradient(to ${direction}, var(--paper-base) 0 1px, rgba(0,0,0,0.4) 1px 2px)`,
          borderRadius: side === 'left' ? '3px 0 0 3px' : '0 3px 3px 0',
          boxShadow: 'inset 0 0 5px rgba(0,0,0,0.45)',
        }}
        className="absolute"
      />
    </div>
  );
}

export function BookStage({
  pages,
  view,
  spread,
  turn,
  captions,
  pageProps,
  onBeginDrag,
  onUpdateDrag,
  onEndDrag,
}: BookStageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    direction: TurnDirection;
    startX: number;
    isEdge: boolean;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const node = rootRef.current;
      if (!node) return;

      // Sem isto o navegador começa a selecionar texto no meio do arraste e o
      // livro fica todo azul enquanto o usuário folheia. Os campos de texto
      // param a propagação antes daqui, então continuam selecionáveis.
      event.preventDefault();

      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const half = rect.width / 2;
      const direction: TurnDirection = x > half ? 'next' : 'prev';
      const distanceToEdge = direction === 'next' ? rect.width - x : x;

      if (!onBeginDrag(direction, event.clientX, half)) return;

      gestureRef.current = {
        direction,
        startX: event.clientX,
        // Com o álbum fechado, um clique em qualquer ponto da capa abre.
        isEdge: spread === 0 || distanceToEdge < rect.width * EDGE_RATIO,
        moved: false,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        const gesture = gestureRef.current;
        if (!gesture) return;
        if (Math.abs(moveEvent.clientX - gesture.startX) > CLICK_TOLERANCE_PX) {
          gesture.moved = true;
        }
        onUpdateDrag(moveEvent.clientX);
      };

      const handleUp = () => {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        onEndDrag(gesture ? !gesture.moved && gesture.isEdge : false);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    },
    [spread, onBeginDrag, onUpdateDrag, onEndDrag],
  );

  const animating = Boolean(turn?.animating);
  const leafTransition = animating
    ? `transform ${TURN_DURATION_MS}ms ${EASE}`
    : 'none';

  return (
    <div
      className="mt-4 select-none"
      style={{
        perspective: '2600px',
        perspectiveOrigin: '50% 45%',
        // Fechado, o livro fica centralizado numa capa só — à direita no
        // começo, à esquerda no fim. O quanto deslocar vem da geometria.
        transform: `translateX(${view.offset}%)`,
        transition: animating ? `transform ${TURN_DURATION_MS}ms ${EASE}` : 'none',
      }}
    >
      <div
        ref={rootRef}
        onPointerDown={handlePointerDown}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative mx-auto aspect-[8/5] w-full max-w-5xl cursor-grab touch-none active:cursor-grabbing"
      >
        <PageEdges
          side="left"
          remaining={leftIndexOf(spread) + 1}
          openness={view.openness}
        />
        <PageEdges
          side="right"
          remaining={pages.length - rightIndexOf(spread) - 1}
          openness={view.openness}
        />

        {/* Páginas paradas */}
        <div
          className="absolute left-0 top-0 z-10 h-full w-1/2"
          style={{
            boxShadow: view.leftStatic
              ? '0 30px 60px -25px rgba(0,0,0,0.85)'
              : undefined,
          }}
        >
          <BookPage
            {...pageProps}
            page={view.leftStatic}
            side="left"
            caption={view.leftStatic ? captions[view.leftStatic.key] : undefined}
            interactive={!turn}
          />
        </div>
        <div
          className="absolute right-0 top-0 z-10 h-full w-1/2"
          style={{
            boxShadow: view.rightStatic
              ? '0 30px 60px -25px rgba(0,0,0,0.85)'
              : undefined,
          }}
        >
          <BookPage
            {...pageProps}
            page={view.rightStatic}
            side="right"
            caption={view.rightStatic ? captions[view.rightStatic.key] : undefined}
            interactive={!turn}
          />
        </div>

        {/* Folha em movimento */}
        {turn && view.leaf && (
          <div
            className="absolute top-0 z-20 h-full w-1/2"
            style={{
              left: turn.direction === 'next' ? '50%' : 0,
              transformOrigin:
                turn.direction === 'next' ? 'left center' : 'right center',
              transformStyle: 'preserve-3d',
              transform: `rotateY(${view.angle}deg)`,
              transition: leafTransition,
              willChange: 'transform',
            }}
          >
            {/* Miolo opaco da folha: papel não é translúcido, e isso evita
                qualquer vazamento pelos cantos arredondados. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-[6px]"
              style={{ background: 'var(--paper-base)' }}
            />

            {/* As duas faces são afastadas meio pixel no eixo Z. Coplanares
                elas brigam pelo mesmo pixel (z-fighting) e a foto da frente
                vaza por cima da contracapa no meio da virada. */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0.5px)',
              }}
            >
              <BookPage
                {...pageProps}
                page={view.leaf.front}
                side={view.leaf.frontSide}
                caption={
                  view.leaf.front ? captions[view.leaf.front.key] : undefined
                }
                interactive={false}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: foldGradient(view.leaf.frontSide),
                  opacity: turn.progress,
                }}
              />
            </div>

            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translateZ(0.5px)',
              }}
            >
              <BookPage
                {...pageProps}
                page={view.leaf.back}
                side={view.leaf.backSide}
                caption={view.leaf.back ? captions[view.leaf.back.key] : undefined}
                interactive={false}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: foldGradient(view.leaf.backSide),
                  opacity: 1 - turn.progress,
                }}
              />
            </div>
          </div>
        )}

        {/* Sombra que a folha levantada projeta na página de baixo.
            Fica concentrada perto da lombada, que é onde o papel encosta: um
            gradiente longo escurecia a metade inteira e dava a impressão de
            que a página de baixo é que estava errada.

            Não existe sombra presa às faces da folha, de propósito: uma
            box-shadow ali gira junto com o papel e vira uma mancha retangular
            deslocada nos ângulos intermediários. */}
        {turn && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-[16] w-1/2"
            style={{
              left: turn.direction === 'next' ? 0 : '50%',
              background: `linear-gradient(to ${
                turn.direction === 'next' ? 'left' : 'right'
              }, rgba(0,0,0,0.55), transparent 40%)`,
              opacity: Math.sin(turn.progress * Math.PI) * 0.55,
            }}
          />
        )}

        {/* Vinco central. Fica abaixo da folha que gira (z-20): acima dela, a
            sombra ficava parada cortando a página em movimento. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 z-[15] w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/35 to-transparent"
          style={{ opacity: view.openness }}
        />
      </div>
    </div>
  );
}
