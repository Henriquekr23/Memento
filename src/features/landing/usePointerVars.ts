'use client';

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Paralaxe e inclinação sem re-render.
 *
 * O movimento do ponteiro vira variáveis CSS (`--mx`, `--my`, `--angle`)
 * escritas direto no elemento, dentro de um `requestAnimationFrame`. O React
 * não participa: se cada `pointermove` virasse `setState`, a página inteira
 * reconciliaria dezenas de vezes por segundo — que é justamente o tipo de
 * "site pesado" que se quer evitar aqui.
 *
 * Os filhos leem as variáveis em `calc()`, então quem anima é o compositor.
 */
export function usePointerVars<T extends HTMLElement>() {
  const nodeRef = useRef<T | null>(null);
  const frameRef = useRef(0);

  /** Ref de callback: nada é lido durante o render. */
  const setNode = useCallback((node: T | null) => {
    nodeRef.current = node;
  }, []);

  const write = useCallback((mx: number, my: number) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const node = nodeRef.current;
      if (!node) return;
      node.style.setProperty('--mx', mx.toFixed(3));
      node.style.setProperty('--my', my.toFixed(3));
      node.style.setProperty(
        '--angle',
        `${((Math.atan2(my, mx) * 180) / Math.PI + 90).toFixed(1)}deg`,
      );
    });
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      write(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      );
    },
    [write],
  );

  const onPointerLeave = useCallback(() => write(0, 0), [write]);

  return { setNode, onPointerMove, onPointerLeave };
}
