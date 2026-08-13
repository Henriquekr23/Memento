'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PageSide } from './bookGeometry';
import type { TurnDirection, TurnState } from './usePageTurn';

interface SinglePageNavOptions {
  /** Qual metade do spread cabe na tela — no celular, uma de cada vez. */
  hasLeft: boolean;
  hasRight: boolean;
  turn: TurnState | null;
  canGoNext: boolean;
  canGoPrev: boolean;
  startTurn: (direction: TurnDirection) => void;
}

export interface SinglePageNav {
  side: PageSide;
  go: (direction: TurnDirection) => void;
  showSide: (side: PageSide) => void;
  canNext: boolean;
  canPrev: boolean;
}

/**
 * Navegação de uma página por vez, para telas estreitas.
 *
 * O modelo do álbum não muda: continua sendo um livro de spreads, e a folha
 * continua virando do mesmo jeito. O que muda é o enquadramento — a tela mostra
 * metade do spread, e andar para frente ora é trocar de metade (a folha nem se
 * mexe, como quando se lê a página par e depois a ímpar do mesmo papel), ora é
 * virar a folha de verdade.
 *
 * Reescrever a geometria para "um spread = uma página" seria a outra saída, mas
 * ela quebraria a tira de páginas, a numeração e o próprio gesto de folhear —
 * três coisas certas para consertar uma.
 */
export function useSinglePageNav({
  hasLeft,
  hasRight,
  turn,
  canGoNext,
  canGoPrev,
  startTurn,
}: SinglePageNavOptions): SinglePageNav {
  const [rawSide, setRawSide] = useState<PageSide>('right');
  /** Lado a mostrar quando a folha terminar de virar. */
  const pendingRef = useRef<PageSide | null>(null);

  // A existência da página manda: na capa só há a da direita; na contracapa,
  // só a da esquerda. Guardar isso no estado daria dois lugares para errar.
  const side: PageSide = !hasLeft ? 'right' : !hasRight ? 'left' : rawSide;

  useEffect(() => {
    if (turn || pendingRef.current === null) return;
    setRawSide(pendingRef.current);
    pendingRef.current = null;
  }, [turn]);

  const go = useCallback(
    (direction: TurnDirection) => {
      // Enquanto a folha está no ar, o destino ainda não existe.
      if (turn) return;

      if (direction === 'next') {
        if (side === 'left' && hasRight) {
          setRawSide('right');
          return;
        }
        if (canGoNext) {
          pendingRef.current = 'left';
          startTurn('next');
        }
        return;
      }

      if (side === 'right' && hasLeft) {
        setRawSide('left');
        return;
      }
      if (canGoPrev) {
        pendingRef.current = 'right';
        startTurn('prev');
      }
    },
    [turn, side, hasLeft, hasRight, canGoNext, canGoPrev, startTurn],
  );

  return {
    side,
    go,
    showSide: setRawSide,
    canNext: (side === 'left' && hasRight) || canGoNext,
    canPrev: (side === 'right' && hasLeft) || canGoPrev,
  };
}
