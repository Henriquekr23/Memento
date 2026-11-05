'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

/** Quanto o ponteiro anda antes de um clique virar arraste, em px. */
const DRAG_THRESHOLD = 4;
/** Até quando a pílula espera a rolagem chegar na seção escolhida, em ms. */
const PENDING_TIMEOUT = 2500;

interface DragState {
  pointerId: number;
  startX: number;
  /** Distância do ponteiro até o centro da pílula no momento em que segurou. */
  grabOffset: number;
  moved: boolean;
}

/**
 * O fundinho da opção ativa como peça só, que desliza entre as opções — e que
 * dá para segurar e arrastar, como o seletor segmentado da Apple: a seção só
 * muda quando a pessoa solta, na opção que estiver embaixo.
 *
 * A posição é escrita direto como variável CSS (`--px` e `--pw` na pílula),
 * fora do React; o React só guarda o que muda poucas vezes: qual opção está
 * embaixo da pílula durante o arraste e qual foi escolhida até a rolagem
 * chegar lá (sem isso, a pílula voltaria a cada seção atravessada no caminho).
 *
 * Só a opção acesa é alça: tocar numa opção apagada continua sendo um link
 * comum, e tocar na acesa sem arrastar também.
 *
 * Os nós (a faixa das opções e a pílula) são criados por quem chama, como em
 * `useTrackDrag`: ref devolvido de dentro de hook e usado no JSX é o que a
 * regra `react-hooks/refs` proíbe.
 *
 * Também serve fora da landing (as etapas da /album): `itemSelector` diz quais
 * filhos são as opções, e `canPick` deixa de fora as que não podem ser
 * escolhidas agora — a pílula não para em cima delas.
 */
export function useSlidingPill(
  navRef: RefObject<HTMLElement | null>,
  pillRef: RefObject<HTMLSpanElement | null>,
  active: number,
  onPick: (index: number) => void,
  {
    itemSelector = '.lp-link',
    canPick,
  }: { itemSelector?: string; canPick?: (index: number) => boolean } = {},
) {
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [under, setUnder] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const lit = under ?? pending ?? active;

  /** Retângulos das opções, relativos à faixa. Lido só no gesto e no resize. */
  const linkBoxes = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return [];
    return Array.from(nav.querySelectorAll<HTMLElement>(itemSelector)).map((link) => ({
      left: link.offsetLeft,
      width: link.offsetWidth,
    }));
  }, [navRef, itemSelector]);

  const place = useCallback((left: number, width: number) => {
    const pill = pillRef.current;
    if (!pill) return;
    pill.style.setProperty('--px', `${left.toFixed(2)}px`);
    pill.style.setProperty('--pw', width.toFixed(2));
  }, [pillRef]);

  // Pílula parada: em cima da opção acesa. Também na mudança de largura (a
  // fonte chegando, a janela mudando).
  useEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const snap = () => {
      if (dragRef.current?.moved) return;
      const box = linkBoxes()[lit];
      if (!box) return;
      place(box.left, box.width);
      // A primeira posição aparece sem viagem desde a ponta esquerda.
      if (!pill.dataset.ready) requestAnimationFrame(() => (pill.dataset.ready = 'true'));
    };
    snap();
    const observer = new ResizeObserver(snap);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [lit, linkBoxes, place, navRef, pillRef]);

  // A escolha vale até a rolagem chegar na seção (ou desistir de chegar).
  useEffect(() => {
    if (pending === null) return;
    if (pending === active) {
      const id = requestAnimationFrame(() => setPending(null));
      return () => cancelAnimationFrame(id);
    }
    const timer = setTimeout(() => setPending(null), PENDING_TIMEOUT);
    return () => clearTimeout(timer);
  }, [pending, active]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const link = (event.target as HTMLElement).closest<HTMLElement>(itemSelector);
    const nav = navRef.current;
    if (!link || !nav) return;
    const index = Array.from(nav.querySelectorAll(itemSelector)).indexOf(link);
    if (index !== lit) return;
    const box = linkBoxes()[index];
    const navLeft = nav.getBoundingClientRect().left;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      grabOffset: event.clientX - navLeft - (box.left + box.width / 2),
      moved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const nav = navRef.current;
    if (!drag || !nav || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return;
      drag.moved = true;
      // Capturado só agora: um toque sem arraste continua sendo clique no link.
      nav.setPointerCapture(event.pointerId);
      nav.dataset.dragging = 'true';
    }
    const boxes = linkBoxes();
    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    const center = Math.min(
      last.left + last.width / 2,
      Math.max(first.left + first.width / 2, event.clientX - nav.getBoundingClientRect().left - drag.grabOffset),
    );
    // A opção embaixo é a de centro mais próximo; a pílula segue o dedo e
    // toma a largura dela.
    let nearest = lit;
    boxes.forEach((box, i) => {
      if (i !== lit && canPick && !canPick(i)) return;
      const best = boxes[nearest];
      if (Math.abs(box.left + box.width / 2 - center) < Math.abs(best.left + best.width / 2 - center)) {
        nearest = i;
      }
    });
    const width = boxes[nearest].width;
    place(center - width / 2, width);
    if (nearest !== under) setUnder(nearest);
  };

  const finish = (event: ReactPointerEvent<HTMLElement>, commit: boolean) => {
    const drag = dragRef.current;
    const nav = navRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved || !nav) return;
    delete nav.dataset.dragging;
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
    suppressClickRef.current = true;
    const chosen = commit ? (under ?? lit) : active;
    const box = linkBoxes()[chosen];
    if (box) place(box.left, box.width);
    setUnder(null);
    if (commit && chosen !== active) {
      setPending(chosen);
      onPick(chosen);
    }
  };

  // O clique que o navegador ainda manda depois de um arraste não navega.
  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    lit,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: ReactPointerEvent<HTMLElement>) => finish(event, true),
      onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => finish(event, false),
      onClickCapture,
    },
  };
}
