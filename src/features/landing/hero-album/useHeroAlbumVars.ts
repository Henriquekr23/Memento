'use client';

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import {
  isMobileLayout,
  pageTop,
  prefersReducedMotion,
  useScrollFrame,
} from '../useScrollFrame';
import { smoothScrollTo } from '../smoothScroll';
import { writeVars, type VarCache } from '../writeVars';
import {
  followProgress,
  heroProgress,
  heroState,
  spreadProgress,
  LEAVES,
  TINT_LAYERS,
} from './heroScroll';

/** Quanto a inclinação anda em direção ao ponteiro a cada quadro. */
const TILT_EASE = 0.1;
/** Abaixo disto a inclinação já assentou e o laço de quadros pode parar. */
const TILT_REST = 0.002;

/**
 * Tamanho do livro aberto, em px antes da escala (o mesmo do CSS), e a folga
 * mínima em volta. No desktop o livro aberto (760 px) cabe inteiro até ~1100 px
 * de janela com margem generosa; abaixo disso ele encolhe na proporção, sem
 * nunca encostar a menos de 64 px da borda. Na altura, 150 px ficam para a
 * barra e a sombra.
 */
const BOOK = {
  desktop: { w: 760, h: 500, sideGutter: 64, vertical: 150 },
  mobile: { w: 342, h: 540, sideGutter: 24, vertical: 200 },
} as const;

/**
 * Rolagem → variáveis CSS do herói: `--f0..3` (quanto cada folha virou),
 * `--z0..3` (quem fica por cima), `--tint-0..4` (camadas de tom do fundo) e
 * `--mx`/`--my` (inclinação pelo mouse, suavizada). Mais o `data-nav` no
 * wrapper da landing, que é o que libera a barra de navegação: o CSS lê o
 * atributo, o React não re-renderiza nada.
 *
 * Tudo é escrito no nó grudento (`sticky`) do herói; o livro e as camadas
 * herdam dali.
 */
export function useHeroAlbumVars(rootRef: { readonly current: HTMLElement | null }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<VarCache>(new Map());
  const layoutRef = useRef({ top: 0, pin: 1, mobile: false, reduced: false });
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const finishedRef = useRef<boolean | null>(null);
  /** Progresso que o livro mostra agora (persegue o da rolagem) e quando foi pintado. */
  const shownRef = useRef<{ p: number; at: number } | null>(null);

  const setSection = useCallback((node: HTMLElement | null) => {
    sectionRef.current = node;
  }, []);
  const setStick = useCallback((node: HTMLDivElement | null) => {
    stickRef.current = node;
  }, []);

  const measure = () => {
    const section = sectionRef.current;
    const stick = stickRef.current;
    if (!section || !stick) return;

    const mobile = isMobileLayout();
    const reduced = prefersReducedMotion();
    // O trecho preso é o que o contêiner tem a mais que a tela — a altura
    // vem do CSS (`--hero-pin`), então mudar o comprimento é mexer num lugar só.
    const pin = section.offsetHeight - stick.offsetHeight;
    layoutRef.current = { top: pageTop(section), pin, mobile, reduced };

    const width = document.documentElement.clientWidth;
    const height = stick.clientHeight;
    const book = mobile ? BOOK.mobile : BOOK.desktop;
    const scale = Math.min(
      1,
      (width - book.sideGutter * 2) / book.w,
      (height - book.vertical) / book.h,
    );
    writeVars(stick, cacheRef.current, { '--book-scale': Math.max(0.5, scale).toFixed(4) });
  };

  const paint = (scrollY: number) => {
    const stick = stickRef.current;
    if (!stick) return false;
    const { top, pin, mobile, reduced } = layoutRef.current;
    // O livro não pula para onde a rolagem está: ele persegue esse ponto
    // (`followProgress`), com teto de velocidade. Rolar rápido demais vira
    // virada rápida, e não abertura pulada. O primeiro quadro (aba voltando
    // com a rolagem restaurada) e o movimento reduzido vão direto.
    const target = heroProgress(scrollY - top, pin);
    const now = performance.now();
    const shown = shownRef.current;
    const p = !shown || reduced ? target : followProgress(shown.p, target, Math.min(64, now - shown.at));
    shownRef.current = { p, at: now };
    const state = heroState(p, reduced);

    const vars: Record<string, string> = {};
    for (let i = 0; i < LEAVES; i++) {
      vars[`--f${i}`] = state.f[i].toFixed(4);
      vars[`--z${i}`] = String(state.z[i]);
    }
    for (let t = 0; t < TINT_LAYERS; t++) vars[`--tint-${t}`] = state.tints[t].toFixed(3);

    // Inclinação: só com mouse, só no desktop e nunca com movimento reduzido.
    const tilt = tiltRef.current;
    let settling = false;
    if (mobile || reduced) {
      tilt.x = tilt.y = tilt.targetX = tilt.targetY = 0;
    } else {
      tilt.x += (tilt.targetX - tilt.x) * TILT_EASE;
      tilt.y += (tilt.targetY - tilt.y) * TILT_EASE;
      settling =
        Math.abs(tilt.targetX - tilt.x) > TILT_REST || Math.abs(tilt.targetY - tilt.y) > TILT_REST;
    }
    vars['--mx'] = tilt.x.toFixed(4);
    vars['--my'] = tilt.y.toFixed(4);
    writeVars(stick, cacheRef.current, vars);

    const root = rootRef.current;
    if (root && finishedRef.current !== state.finished) {
      finishedRef.current = state.finished;
      root.dataset.nav = state.finished ? 'open' : 'closed';
    }
    return settling || p !== target;
  };

  const requestFrame = useScrollFrame(paint, measure);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse') return;
      const tilt = tiltRef.current;
      tilt.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      tilt.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
      requestFrame();
    },
    [requestFrame],
  );

  const onPointerLeave = useCallback(() => {
    tiltRef.current.targetX = 0;
    tiltRef.current.targetY = 0;
    requestFrame();
  }, [requestFrame]);

  /**
   * Leva a rolagem até a última abertura. Os botões do fim moram no verso da
   * última folha: antes de ela virar, estão no DOM (o leitor de tela lê, o Tab
   * alcança) mas de costas. Quem chega neles pelo teclado é levado até onde
   * eles aparecem, em vez de focar um botão invisível.
   */
  const revealEnd = useCallback(() => {
    if (finishedRef.current) return;
    const { top, pin } = layoutRef.current;
    smoothScrollTo(top + pin * spreadProgress(LEAVES));
  }, []);

  return { setSection, setStick, onPointerMove, onPointerLeave, revealEnd };
}
