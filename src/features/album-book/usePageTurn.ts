'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Máquina de virar página.
 *
 * Só sabe de navegação: em que spread o álbum está e como a folha se move de um
 * para o outro. Não conhece fotos, layouts nem textos — o que ela devolve é
 * consumido pela geometria (`bookGeometry`) para decidir o que desenhar.
 *
 * Foi separada de `useAlbumBook` porque são responsabilidades diferentes com
 * ritmos diferentes: aqui o estado muda a cada frame do arraste; lá, a cada
 * edição do usuário.
 */

/** Duração da virada, em ms. Também é o fallback que encerra a animação. */
export const TURN_DURATION_MS = 620;

/** A partir de quanto do arraste a página "cai" para o outro lado. */
const RELEASE_THRESHOLD = 0.3;

export type TurnDirection = 'next' | 'prev';

export interface TurnState {
  direction: TurnDirection;
  /** 0 = folha parada, 1 = folha virada. */
  progress: number;
  animating: boolean;
  target: 0 | 1;
}

export function usePageTurn(spreadCount: number) {
  const [rawSpread, setRawSpread] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);

  const maxSpread = Math.max(0, spreadCount - 1);
  // Se o álbum encolher (fotos removidas), o spread é corrigido no próprio
  // render — sem efeito, sem render em cascata.
  const spread = Math.min(rawSpread, maxSpread);

  const canGoNext = spread < maxSpread;
  const canGoPrev = spread > 0;

  // Espelho do estado em ref: os handlers de ponteiro precisam ler o valor
  // atual fora do ciclo de render, e mutar estado dentro de um updater seria
  // impuro (o StrictMode chama o updater duas vezes).
  const turnRef = useRef<TurnState | null>(null);
  const dragRef = useRef<{ startX: number; width: number } | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  const commitTurn = useCallback(
    (direction: TurnDirection) => {
      setRawSpread((value) => {
        const current = Math.min(value, maxSpread);
        const next = current + (direction === 'next' ? 1 : -1);
        return Math.min(Math.max(0, next), maxSpread);
      });
    },
    [maxSpread],
  );

  const finishTurn = useCallback(() => {
    const current = turnRef.current;
    if (!current) return;
    if (current.target === 1) commitTurn(current.direction);
    turnRef.current = null;
    animatingRef.current = false;
    setTurn(null);
  }, [commitTurn]);

  // `transitionend` é frágil (não dispara se a aba perde foco ou o nó some).
  // Um timer é mais previsível e o custo de errar é só um frame.
  useEffect(() => {
    if (!turn?.animating) return;
    const timer = window.setTimeout(finishTurn, TURN_DURATION_MS + 40);
    return () => window.clearTimeout(timer);
  }, [turn?.animating, turn?.target, turn?.direction, finishTurn]);

  const isBusy = useCallback(
    () => animatingRef.current || dragRef.current !== null,
    [],
  );

  const canTurn = useCallback(
    (direction: TurnDirection) => (direction === 'next' ? canGoNext : canGoPrev),
    [canGoNext, canGoPrev],
  );

  const startTurn = useCallback(
    (direction: TurnDirection) => {
      if (isBusy() || !canTurn(direction)) return;

      setTurn(
        (current) =>
          current ?? { direction, progress: 0, animating: false, target: 1 },
      );

      // Dois frames: o primeiro pinta a folha parada, o segundo dispara a
      // transição. Num frame só o navegador junta as mudanças e não anima.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (dragRef.current) return;
          animatingRef.current = true;
          setTurn((current) =>
            current && !current.animating && current.progress === 0
              ? { ...current, progress: 1, animating: true }
              : current,
          );
        });
      });
    },
    [isBusy, canTurn],
  );

  const beginDrag = useCallback(
    (direction: TurnDirection, startX: number, width: number) => {
      if (isBusy() || !canTurn(direction)) return false;
      dragRef.current = { startX, width };
      const next: TurnState = {
        direction,
        progress: 0,
        animating: false,
        target: 1,
      };
      turnRef.current = next;
      setTurn(next);
      return true;
    },
    [isBusy, canTurn],
  );

  const updateDrag = useCallback((clientX: number) => {
    const drag = dragRef.current;
    const current = turnRef.current;
    if (!drag || !current) return;

    const travelled =
      current.direction === 'next' ? drag.startX - clientX : clientX - drag.startX;
    const progress = Math.min(1, Math.max(0, travelled / drag.width));

    const next = { ...current, progress, animating: false };
    turnRef.current = next;
    setTurn(next);
  }, []);

  /** `force` = clique na borda: vira mesmo sem arraste. */
  const endDrag = useCallback(
    (force = false) => {
      if (!dragRef.current) return;
      dragRef.current = null;

      const current = turnRef.current;
      if (!current) return;

      const target: 0 | 1 = force || current.progress > RELEASE_THRESHOLD ? 1 : 0;

      // Já está no destino: não haverá transição para esperar.
      if (current.progress === target) {
        if (target === 1) commitTurn(current.direction);
        turnRef.current = null;
        setTurn(null);
        return;
      }

      animatingRef.current = true;
      const next: TurnState = {
        ...current,
        progress: target,
        animating: true,
        target,
      };
      turnRef.current = next;
      setTurn(next);
    },
    [commitTurn],
  );

  const goToSpread = useCallback(
    (target: number) => {
      if (isBusy()) return;
      setRawSpread(Math.min(Math.max(0, target), maxSpread));
    },
    [isBusy, maxSpread],
  );

  /**
   * Pula para um spread que ainda não existe neste render — é o caso de quem
   * acabou de inserir uma página. O valor é limitado no próximo render, quando
   * a paginação já cresceu.
   */
  const jumpToSpread = useCallback((target: number) => {
    setRawSpread(Math.max(0, target));
  }, []);

  return {
    spread,
    turn,
    canGoNext,
    canGoPrev,
    startTurn,
    beginDrag,
    updateDrag,
    endDrag,
    goToSpread,
    jumpToSpread,
  };
}
