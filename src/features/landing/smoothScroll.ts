'use client';

import { useEffect } from 'react';

import { clamp, easeInOutCubic } from './scrollMath';
import { prefersReducedMotion } from './useScrollFrame';

/** Folga padrão das âncoras (a mesma do `:target` em `globals.css`). */
const DEFAULT_ANCHOR_OFFSET = 88;

/**
 * Duração da viagem, pela distância: perto é rápido, longe não passa de 1,6 s.
 * A rolagem nativa (`scroll-behavior: smooth`) leva o mesmo tempo para 300 px
 * e para 6.000 px — atravessar o herói inteiro virava um borrão, e o livro
 * virava as quatro folhas num piscar.
 */
export function scrollDuration(distance: number): number {
  return clamp(450 + Math.abs(distance) * 0.18, 600, 1600);
}

let running: { cancel: () => void } | null = null;

/**
 * Rola a janela até `top` com a curva `--ease-in-out` dos tokens.
 *
 * Escreve `scrollTo` com `behavior: 'instant'` a cada quadro — o
 * `scroll-behavior: smooth` do `<html>` transformaria cada passo numa rolagem
 * suave própria e as duas brigariam. Roda do mouse, toque ou tecla durante a
 * viagem devolvem o controle a quem está rolando. Com movimento reduzido, pula.
 */
export function smoothScrollTo(top: number): void {
  running?.cancel();
  const start = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const end = clamp(top, 0, Math.max(0, max));
  const distance = end - start;
  if (prefersReducedMotion() || Math.abs(distance) < 2) {
    window.scrollTo({ top: end, behavior: 'instant' });
    return;
  }

  const duration = scrollDuration(distance);
  const t0 = performance.now();
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
    running = null;
  };
  const step = (now: number) => {
    const k = clamp((now - t0) / duration, 0, 1);
    window.scrollTo({ top: start + distance * easeInOutCubic(k), behavior: 'instant' });
    if (k < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', stop);
  running = { cancel: stop };
  frame = requestAnimationFrame(step);
}

/**
 * Leva até a âncora `id`, respeitando a folga dela (`--anchor-offset`, que é
 * 0 nas seções grudentas e 88 px nas outras), e deixa o endereço com o hash.
 */
export function scrollToAnchor(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const raw = getComputedStyle(target).getPropertyValue('--anchor-offset').trim();
  const offset = raw ? parseFloat(raw) : DEFAULT_ANCHOR_OFFSET;
  smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - offset);
  history.replaceState(history.state, '', `#${id}`);
}

/**
 * Todo link `href="#…"` dentro da landing (barra, gaveta, "Ver um exemplo")
 * passa por `scrollToAnchor` em vez da rolagem nativa. Um ouvinte só, no
 * wrapper — os componentes continuam sendo links comuns, e sem JavaScript a
 * âncora funciona do jeito do navegador.
 */
export function useAnchorScroll(rootRef: { readonly current: HTMLElement | null }): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || !root.contains(link)) return;
      const id = decodeURIComponent(link.hash.slice(1));
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      scrollToAnchor(id);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [rootRef]);
}
