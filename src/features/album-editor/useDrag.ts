'use client';

import { useCallback } from 'react';

/**
 * Motor de arraste em pointer events.
 *
 * Os listeners vão na `window`, não no elemento: arrastar rápido tira o
 * ponteiro de cima da alça, e sem a captura global o gesto morre no meio.
 * Devolve deslocamento acumulado desde o `pointerdown`, em pixels de tela —
 * quem chama converte para milímetros ou porcentagem, porque só quem chama
 * sabe qual é a régua.
 *
 * Não usamos `react-moveable`: o requisito de travar elementos numa área segura
 * medida em milímetros exige controle da própria matemática que a biblioteca
 * abstrai, e o motor inteiro cabe aqui.
 */
export type DragMove = (dx: number, dy: number, event: PointerEvent) => void;
export type DragEnd = (event: PointerEvent) => void;

export function useDrag() {
  return useCallback(
    (event: React.PointerEvent, onMove: DragMove, onEnd?: DragEnd) => {
      event.preventDefault();
      event.stopPropagation();

      const origin = { x: event.clientX, y: event.clientY };

      const move = (ev: PointerEvent) =>
        onMove(ev.clientX - origin.x, ev.clientY - origin.y, ev);

      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        onEnd?.(ev);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [],
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
