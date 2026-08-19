'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Rolagem do topo da landing: o deslocamento da foto do herói e o momento em
 * que a barra de navegação ganha fundo.
 *
 * O deslocamento **não passa pelo React**: ele muda a cada quadro da rolagem e
 * um `setState` por pixel derrubaria a taxa de quadros. Ele é escrito direto
 * como custom property (`--parallax`) no nó da foto, dentro de um
 * `requestAnimationFrame` — a mesma decisão já tomada em `usePointerVars` para
 * o movimento do ponteiro.
 *
 * O `solid` da barra é o oposto: muda duas vezes na vida da página (passou de
 * 40px, voltou), então aí um estado do React é o certo — e é ele que troca o
 * `data-solid`, deixando o CSS decidir o resto.
 *
 * `prefers-reduced-motion` desliga só o parallax: o fundo da barra continua,
 * porque ali a transição é de cor, não de movimento.
 */
export function useHeroScroll() {
  const photoRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [solid, setSolid] = useState(false);

  const setPhotoNode = useCallback((node: HTMLElement | null) => {
    photoRef.current = node;
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const apply = () => {
      frameRef.current = null;
      const y = window.scrollY;
      if (!reduced && photoRef.current) {
        photoRef.current.style.setProperty('--parallax', String(Math.round(y * 0.3)));
      }
      setSolid((was) => (was === y > 40 ? was : y > 40));
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { setPhotoNode, solid };
}
