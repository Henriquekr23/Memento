'use client';

import { useCallback, useRef } from 'react';

import {
  isMobileLayout,
  pageTop,
  prefersReducedMotion,
  useScrollFrame,
} from '../useScrollFrame';
import { smoothScrollTo } from '../smoothScroll';
import { writeVars, type VarCache } from '../writeVars';
import { GEOMETRY, organizePhase, phaseScroll, type OrganizeLayout } from './organizeGeometry';

/**
 * Abaixo disto o desktop empilha fotos e texto (tablet em pé) em vez de pôr
 * lado a lado. A mesma régua do CSS (`@media (min-width: 1024px)`).
 */
const SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

/** Folgas usadas para caber o palco na tela, em px (as mesmas do CSS). */
const ROOM = {
  /** Espaço da barra no topo + respiro embaixo. */
  vertical: 140,
  /** Margens laterais + vão + largura mínima da coluna de texto (lado a lado). */
  sideBySide: 64 * 2 + 72 + 340,
  /** Margens laterais quando empilhado. */
  stacked: { desktop: 48 * 2, mobile: 24 * 2 },
  /** Entre o palco e o texto, quando empilhado. */
  gap: 28,
} as const;

/**
 * Rolagem → variáveis CSS da seção "Da bagunça ao álbum": `--q` (as fotos do
 * dia indo para o álbum), `--qa` (o livro aparecendo) e `--qt` (a troca do
 * texto). Mais `data-album` na seção, que decide qual dos dois blocos de texto
 * recebe cliques. A escala do palco (`--org-scale`) sai do redimensionamento, não
 * da rolagem.
 *
 * Organizar as fotos (pilha → dia) não passa por aqui: é estado discreto do
 * React e anima por `transition` no CSS, independente da rolagem.
 */
export function useOrganizeVars() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<VarCache>(new Map());
  const layoutRef = useRef<{ top: number; layout: OrganizeLayout; reduced: boolean }>({
    top: 0,
    layout: 'desktop',
    reduced: false,
  });
  const albumRef = useRef<boolean | null>(null);

  const setSection = useCallback((node: HTMLElement | null) => {
    sectionRef.current = node;
  }, []);
  const setStick = useCallback((node: HTMLDivElement | null) => {
    stickRef.current = node;
  }, []);
  const setCopy = useCallback((node: HTMLDivElement | null) => {
    copyRef.current = node;
  }, []);

  const measure = () => {
    const section = sectionRef.current;
    const stick = stickRef.current;
    if (!section || !stick) return;

    const layout: OrganizeLayout = isMobileLayout() ? 'mobile' : 'desktop';
    layoutRef.current = { top: pageTop(section), layout, reduced: prefersReducedMotion() };

    // O palco tem tamanho fixo em px e é escalado inteiro para caber: a conta
    // das posições das fotos não muda com a janela.
    const { stage } = GEOMETRY[layout];
    const width = document.documentElement.clientWidth;
    const height = stick.clientHeight;
    let scale: number;
    if (layout === 'desktop' && window.matchMedia(SIDE_BY_SIDE_QUERY).matches) {
      scale = Math.min((width - ROOM.sideBySide) / stage.w, (height - ROOM.vertical) / stage.h);
    } else {
      const copyHeight = copyRef.current?.offsetHeight ?? 0;
      scale = Math.min(
        (width - ROOM.stacked[layout]) / stage.w,
        (height - ROOM.vertical - copyHeight - ROOM.gap) / stage.h,
      );
    }
    writeVars(stick, cacheRef.current, { '--org-scale': clampScale(scale).toFixed(4) });
  };

  const paint = (scrollY: number) => {
    const section = sectionRef.current;
    const stick = stickRef.current;
    if (!section || !stick) return;
    const { top, layout, reduced } = layoutRef.current;
    const phase = organizePhase(scrollY - top, layout, reduced);
    writeVars(stick, cacheRef.current, {
      '--q': phase.q.toFixed(4),
      '--qa': phase.qa.toFixed(4),
      '--qt': phase.qt.toFixed(4),
    });
    if (albumRef.current !== phase.album) {
      albumRef.current = phase.album;
      section.dataset.album = String(phase.album);
    }
  };

  useScrollFrame(paint, measure);

  /**
   * Leva a rolagem até a fase em que um bloco de texto está visível. Os dois
   * blocos ocupam o mesmo lugar e trocam por opacidade; quem chega pelo Tab no
   * botão do bloco apagado é levado até onde ele aparece.
   */
  const revealPhase = useCallback((album: boolean) => {
    if (albumRef.current === album) return;
    const { top, layout } = layoutRef.current;
    smoothScrollTo(top + phaseScroll(layout, album));
  }, []);

  return { setSection, setStick, setCopy, revealPhase };
}

/** Nunca maior que o desenho original, nem tão pequeno que a foto vire selo. */
function clampScale(scale: number): number {
  return Math.min(1, Math.max(0.42, scale));
}
