'use client';

import { useRef, useState } from 'react';

import { pageTop, useScrollFrame } from '../useScrollFrame';
import { activeSectionAt } from './activeSection';

/**
 * A seção visível, para o fundinho da opção ativa do menu.
 *
 * Muda poucas vezes na vida da página, então aqui um estado do React é o
 * certo — mas ele só é tocado quando o índice muda, não a cada quadro. As
 * seções se anunciam com `data-lp-section="<id>"`; a posição delas é medida no
 * redimensionamento, e a rolagem só compara números.
 */
export function useActiveSection(
  rootRef: { readonly current: HTMLElement | null },
  ids: readonly string[],
): number {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const layoutRef = useRef({ tops: [] as number[], viewport: 0, document: 0 });

  const measure = () => {
    const root = rootRef.current;
    if (!root) return;
    layoutRef.current = {
      tops: ids.map((id) => {
        const node = root.querySelector(`[data-lp-section="${id}"]`);
        return node ? pageTop(node) : Number.POSITIVE_INFINITY;
      }),
      viewport: window.innerHeight,
      document: document.documentElement.scrollHeight,
    };
  };

  const paint = (scrollY: number) => {
    const { tops, viewport, document: height } = layoutRef.current;
    const index = activeSectionAt(tops, scrollY, viewport, height);
    if (index !== activeRef.current) {
      activeRef.current = index;
      setActive(index);
    }
  };

  useScrollFrame(paint, measure);
  return active;
}
