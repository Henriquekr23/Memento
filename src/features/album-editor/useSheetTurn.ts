'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Máquina de virar folha.
 *
 * Só sabe de navegação: em que folha o miolo está e como o papel se move de uma
 * para a outra. Não conhece fotos, layouts nem textos — quem desenha é o
 * `SheetStage`. Foi trazida de volta do `album-book/` porque o editor de
 * impressão perdeu o gesto de folhear quando substituiu aquele módulo, e é o
 * gesto que faz a tela parecer um álbum em vez de um formulário.
 */

/** Duração da virada, em ms. Também é o fallback que encerra a animação. */
export const TURN_MS = 520;

/** A partir de quanto do arraste a folha "cai" para o outro lado. */
const RELEASE_THRESHOLD = 0.3;

export type TurnDirection = 'next' | 'prev';

export interface TurnState {
  direction: TurnDirection;
  /** 0 = folha parada, 1 = folha virada. */
  progress: number;
  animating: boolean;
  target: 0 | 1;
}

export interface SheetTurn {
  turn: TurnState | null;
  canTurn: (direction: TurnDirection) => boolean;
  /** Virada por clique/botão, sem arraste. */
  go: (direction: TurnDirection) => void;
  begin: (direction: TurnDirection, startX: number, width: number) => boolean;
  update: (clientX: number) => void;
  end: (force?: boolean) => void;
}

export function useSheetTurn(
  count: number,
  index: number,
  setIndex: (updater: (current: number) => number) => void,
): SheetTurn {
  const [turn, setTurn] = useState<TurnState | null>(null);

  // Espelho do estado em ref: os handlers de ponteiro leem o valor atual fora
  // do ciclo de render, e mutar estado dentro de um updater seria impuro.
  const turnRef = useRef<TurnState | null>(null);
  const dragRef = useRef<{ startX: number; width: number } | null>(null);
  const animatingRef = useRef(false);

  const max = Math.max(0, count - 1);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  const commit = useCallback(
    (direction: TurnDirection) => {
      setIndex((current) =>
        Math.min(Math.max(0, current + (direction === 'next' ? 1 : -1)), max),
      );
    },
    [max, setIndex],
  );

  const finish = useCallback(() => {
    const current = turnRef.current;
    if (!current) return;
    if (current.target === 1) commit(current.direction);
    turnRef.current = null;
    animatingRef.current = false;
    setTurn(null);
  }, [commit]);

  // `transitionend` é frágil (não dispara se a aba perde foco ou o nó some).
  // Um timer é mais previsível e o custo de errar é um quadro.
  useEffect(() => {
    if (!turn?.animating) return;
    const timer = window.setTimeout(finish, TURN_MS + 40);
    return () => window.clearTimeout(timer);
  }, [turn?.animating, turn?.target, turn?.direction, finish]);

  const isBusy = useCallback(
    () => animatingRef.current || dragRef.current !== null,
    [],
  );

  const canTurn = useCallback(
    (direction: TurnDirection) => (direction === 'next' ? index < max : index > 0),
    [index, max],
  );

  const go = useCallback(
    (direction: TurnDirection) => {
      if (isBusy() || !canTurn(direction)) return;

      setTurn((current) => current ?? { direction, progress: 0, animating: false, target: 1 });

      // Dois quadros: o primeiro pinta a folha parada, o segundo dispara a
      // transição. Num quadro só o navegador junta as mudanças e não anima.
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

  const begin = useCallback(
    (direction: TurnDirection, startX: number, width: number) => {
      if (isBusy() || !canTurn(direction)) return false;
      dragRef.current = { startX, width };
      const next: TurnState = { direction, progress: 0, animating: false, target: 1 };
      turnRef.current = next;
      setTurn(next);
      return true;
    },
    [isBusy, canTurn],
  );

  const update = useCallback((clientX: number) => {
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
  const end = useCallback(
    (force = false) => {
      if (!dragRef.current) return;
      dragRef.current = null;

      const current = turnRef.current;
      if (!current) return;

      const target: 0 | 1 = force || current.progress > RELEASE_THRESHOLD ? 1 : 0;

      if (current.progress === target) {
        if (target === 1) commit(current.direction);
        turnRef.current = null;
        setTurn(null);
        return;
      }

      animatingRef.current = true;
      const next: TurnState = { ...current, progress: target, animating: true, target };
      turnRef.current = next;
      setTurn(next);
    },
    [commit],
  );

  return { turn, canTurn, go, begin, update, end };
}
