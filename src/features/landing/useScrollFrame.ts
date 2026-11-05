'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * O padrão de animação da landing, num lugar só.
 *
 * É o que `useHeroScroll` fazia para o parallax da foto antiga, generalizado
 * para quem precisar: a rolagem (e o que mais pedir um quadro, como o ponteiro)
 * vira **um** `requestAnimationFrame`, e dentro dele `paint` escreve variáveis
 * CSS direto nos nós. O React não participa — um `setState` por pixel rolado
 * reconciliaria a página inteira dezenas de vezes por segundo. Quem precisar
 * de estado discreto (seção ativa, por exemplo) chama `setState` de dentro do
 * `paint` só quando o valor muda.
 *
 * `measure` roda fora do quadro de pintura, quando a geometria pode ter
 * mudado: na montagem, no redimensionamento da janela, quando a altura da
 * página muda (`ResizeObserver` no `<body>`) e quando as fontes terminam de
 * carregar. É lá, e só lá, que se lê layout (`getBoundingClientRect`,
 * `offsetHeight`). `paint` só lê `window.scrollY` e escreve — sem alternar
 * leitura e escrita de layout no mesmo quadro.
 *
 * O primeiro `paint` acontece já na montagem, lendo a rolagem atual: a aba que
 * volta com a posição restaurada pinta o estado certo, e não o topo.
 *
 * `paint` devolve `true` quando ainda não assentou (a inclinação suavizada do
 * livro, por exemplo) e quer o quadro seguinte. A função devolvida pelo hook
 * pede um quadro de fora (um `pointermove`).
 */
export function useScrollFrame(
  paint: (scrollY: number) => boolean | void,
  measure?: () => void,
): () => void {
  const paintRef = useRef(paint);
  const measureRef = useRef(measure);
  const requestRef = useRef<() => void>(() => {});

  // As funções mais recentes, sem reinstalar os ouvintes a cada render.
  useEffect(() => {
    paintRef.current = paint;
    measureRef.current = measure;
  });

  useEffect(() => {
    let frame: number | null = null;

    const run = () => {
      frame = null;
      if (paintRef.current(window.scrollY)) schedule();
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(run);
    };
    const remeasure = () => {
      measureRef.current?.();
      schedule();
    };

    requestRef.current = schedule;
    measureRef.current?.();
    run();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) remeasure();
    });

    return () => {
      alive = false;
      requestRef.current = () => {};
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return useCallback(() => requestRef.current(), []);
}

/** `prefers-reduced-motion: reduce`, lido na hora (a preferência pode mudar com a página aberta). */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A mesma régua do CSS: abaixo de 768 px a landing usa o layout de celular. */
export const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileLayout(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** Posição absoluta do topo de um elemento na página. Só para `measure`. */
export function pageTop(node: Element): number {
  return node.getBoundingClientRect().top + window.scrollY;
}
