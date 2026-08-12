'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildAlbumPages, type StoryInsertion } from '@/lib/paginate';
import { DEFAULT_THEME, type AlbumTheme } from '@/features/album-style/theme';
import {
  DEFAULT_ADJUSTMENT,
  clampRect,
  type ComposeMode,
  type PageLayoutId,
  type PhotoAdjustment,
  type PhotoPlacement,
  type SlotRect,
} from '@/types/page';
import type { Photo } from '@/types/photo';

import { rightIndexOf, spreadCountOf } from './bookGeometry';

/** Duração da virada, em ms. Também é o fallback que encerra a animação. */
export const TURN_DURATION_MS = 620;

/** A partir de quanto do arraste a página "cai" para o outro lado. */
const RELEASE_THRESHOLD = 0.3;

export type TurnDirection = 'next' | 'prev';

export interface TurnState {
  direction: TurnDirection;
  /** 0 = folha parada, 1 = folha virada. */
  progress: number;
  animating: boolean;
  target: 0 | 1;
}

export function useAlbumBook(photos: readonly Photo[]) {
  const [rawSpread, setSpread] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, PageLayoutId>
  >({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<Record<string, PhotoAdjustment>>(
    {},
  );
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({});
  const [stories, setStories] = useState<StoryInsertion[]>([]);
  const [theme, setThemeState] = useState<AlbumTheme>(DEFAULT_THEME);
  const [composeMode, setComposeMode] = useState<ComposeMode>('aligned');
  /**
   * Inclinação automática do modo espontâneo. Separada do modo porque uma
   * coisa é querer posicionar as fotos à mão, outra é querer todas tortas.
   */
  const [autoTiltEnabled, setAutoTiltEnabled] = useState(true);
  const [placements, setPlacements] = useState<Record<string, PhotoPlacement>>({});
  /** Foto → grupo de página, quando o usuário a colocou numa página à mão. */
  const [groupKeys, setGroupKeys] = useState<Record<string, string>>({});
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  /** Contador de empilhamento: quem foi mexido por último fica por cima. */
  const zCounterRef = useRef(1);

  const pages = useMemo(
    () => buildAlbumPages(photos, { layoutOverrides, stories, groupKeys }),
    [photos, layoutOverrides, stories, groupKeys],
  );

  const spreadCount = spreadCountOf(pages.length);
  const maxSpread = spreadCount - 1;

  // Se o álbum encolher (fotos removidas), o spread é corrigido no próprio
  // render — sem efeito, sem render em cascata.
  const spread = Math.min(rawSpread, maxSpread);

  const canGoNext = spread < maxSpread;
  const canGoPrev = spread > 0;

  // ── Máquina de virar página ─────────────────────────────────────────────
  // Espelho do estado em ref: os handlers de ponteiro precisam ler o valor
  // atual fora do ciclo de render, e mutar estado dentro de um updater seria
  // impuro (o StrictMode chama o updater duas vezes).
  const turnRef = useRef<TurnState | null>(null);
  const dragRef = useRef<{ startX: number; width: number } | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  const commitTurn = useCallback(
    (direction: TurnDirection) => {
      setSpread((value) => {
        const current = Math.min(value, maxSpread);
        const next = current + (direction === 'next' ? 1 : -1);
        return Math.min(Math.max(0, next), maxSpread);
      });
    },
    [maxSpread],
  );

  const finishTurn = useCallback(() => {
    const current = turnRef.current;
    if (!current) return;
    if (current.target === 1) commitTurn(current.direction);
    turnRef.current = null;
    animatingRef.current = false;
    setTurn(null);
  }, [commitTurn]);

  // `transitionend` é frágil (não dispara se a aba perde foco ou o nó some).
  // Um timer é mais previsível e o custo de errar é só um frame.
  useEffect(() => {
    if (!turn?.animating) return;
    const timer = window.setTimeout(finishTurn, TURN_DURATION_MS + 40);
    return () => window.clearTimeout(timer);
  }, [turn?.animating, turn?.target, turn?.direction, finishTurn]);

  const isBusy = useCallback(
    () => animatingRef.current || dragRef.current !== null,
    [],
  );

  const canTurn = useCallback(
    (direction: TurnDirection) =>
      direction === 'next' ? canGoNext : canGoPrev,
    [canGoNext, canGoPrev],
  );

  const startTurn = useCallback(
    (direction: TurnDirection) => {
      if (isBusy() || !canTurn(direction)) return;

      setTurn((current) => current ?? { direction, progress: 0, animating: false, target: 1 });

      // Dois frames: o primeiro pinta a folha parada, o segundo dispara a
      // transição. Num frame só o navegador junta as mudanças e não anima.
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

  const beginDrag = useCallback(
    (direction: TurnDirection, startX: number, width: number) => {
      if (isBusy() || !canTurn(direction)) return false;
      dragRef.current = { startX, width };
      const next: TurnState = {
        direction,
        progress: 0,
        animating: false,
        target: 1,
      };
      turnRef.current = next;
      setTurn(next);
      return true;
    },
    [isBusy, canTurn],
  );

  const updateDrag = useCallback((clientX: number) => {
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
  const endDrag = useCallback(
    (force = false) => {
      if (!dragRef.current) return;
      dragRef.current = null;

      const current = turnRef.current;
      if (!current) return;

      const target: 0 | 1 =
        force || current.progress > RELEASE_THRESHOLD ? 1 : 0;

      // Já está no destino: não haverá transição para esperar.
      if (current.progress === target) {
        if (target === 1) commitTurn(current.direction);
        turnRef.current = null;
        setTurn(null);
        return;
      }

      animatingRef.current = true;
      const next: TurnState = {
        ...current,
        progress: target,
        animating: true,
        target,
      };
      turnRef.current = next;
      setTurn(next);
    },
    [commitTurn],
  );

  const goToSpread = useCallback(
    (target: number) => {
      if (isBusy()) return;
      setSpread(Math.min(Math.max(0, target), maxSpread));
    },
    [isBusy, maxSpread],
  );

  // ── Edição de página ────────────────────────────────────────────────────
  const setPageLayout = useCallback((pageKey: string, layoutId: PageLayoutId) => {
    setLayoutOverrides((current) => ({ ...current, [pageKey]: layoutId }));
  }, []);

  const setPageCaption = useCallback((pageKey: string, caption: string) => {
    setCaptions((current) => ({ ...current, [pageKey]: caption }));
  }, []);

  const getAdjustment = useCallback(
    (photoId: string): PhotoAdjustment =>
      adjustments[photoId] ?? DEFAULT_ADJUSTMENT,
    [adjustments],
  );

  const updateAdjustment = useCallback(
    (photoId: string, patch: Partial<PhotoAdjustment>) => {
      setAdjustments((current) => ({
        ...current,
        [photoId]: { ...(current[photoId] ?? DEFAULT_ADJUSTMENT), ...patch },
      }));
    },
    [],
  );

  const resetAdjustment = useCallback((photoId: string) => {
    setAdjustments((current) => {
      const next = { ...current };
      delete next[photoId];
      return next;
    });
  }, []);

  // ── Posição livre na página (modo espontâneo) ───────────────────────────
  const getPlacement = useCallback(
    (photoId: string): PhotoPlacement | null => placements[photoId] ?? null,
    [placements],
  );

  /**
   * Move/redimensiona uma foto. `fallbackRect` é o slot do layout: a primeira
   * vez que o usuário mexe numa foto, ela sai exatamente de onde já estava, em
   * vez de pular para um canto.
   */
  const setPlacement = useCallback(
    (photoId: string, rect: SlotRect, options?: { bringToFront?: boolean }) => {
      setPlacements((current) => {
        const previous = current[photoId];
        const z = options?.bringToFront
          ? (zCounterRef.current += 1)
          : (previous?.z ?? 1);
        return { ...current, [photoId]: { ...clampRect(rect), z } };
      });
    },
    [],
  );

  const resetPlacement = useCallback((photoId: string) => {
    setPlacements((current) => {
      const next = { ...current };
      delete next[photoId];
      return next;
    });
  }, []);

  /** Faz a foto pertencer ao grupo de uma página, mesmo sendo de outro dia. */
  const assignToGroup = useCallback((photoId: string, groupKey: string) => {
    setGroupKeys((current) => ({ ...current, [photoId]: groupKey }));
  }, []);

  const clearGroup = useCallback((photoId: string) => {
    setGroupKeys((current) => {
      const next = { ...current };
      delete next[photoId];
      return next;
    });
  }, []);

  const setPhotoCaption = useCallback((photoId: string, caption: string) => {
    setPhotoCaptions((current) => ({ ...current, [photoId]: caption }));
  }, []);

  // ── Páginas de história ─────────────────────────────────────────────────
  /**
   * Insere uma página de texto logo depois da página aberta à direita, e já
   * avança um spread — a página nova cai justamente na esquerda do seguinte,
   * então o usuário vê onde ela foi parar em vez de ter que procurar.
   */
  const addStoryHere = useCallback(() => {
    const right = pages[rightIndexOf(spread)];
    let anchorKey = 'start';
    // Para onde navegar depois de inserir, quando dá para saber com certeza.
    let targetSpread: number | null = null;

    if (right?.kind === 'photos') {
      anchorKey = right.key;
      targetSpread = spread + 1;
    } else if (right?.kind === 'story' && right.story) {
      anchorKey = right.story.anchorKey;
      targetSpread = spread + 1;
    } else if (spread > 1) {
      const lastPhotoPage = [...pages].reverse().find((p) => p.kind === 'photos');
      anchorKey = lastPhotoPage?.key ?? 'start';
    } else {
      // Na capa ou no verso dela: o texto abre o álbum, no primeiro spread.
      targetSpread = 1;
    }

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `story_${Date.now()}`;

    setStories((current) => [...current, { id, anchorKey, title: '', body: '' }]);
    if (targetSpread !== null) setSpread(targetSpread);
    return id;
  }, [pages, spread]);

  const updateStory = useCallback(
    (id: string, patch: Partial<Pick<StoryInsertion, 'title' | 'body'>>) => {
      setStories((current) =>
        current.map((story) => (story.id === id ? { ...story, ...patch } : story)),
      );
    },
    [],
  );

  const removeStory = useCallback((id: string) => {
    setStories((current) => current.filter((story) => story.id !== id));
  }, []);

  const setTheme = useCallback((patch: Partial<AlbumTheme>) => {
    setThemeState((current) => ({ ...current, ...patch }));
  }, []);

  /** Desfaz só o visual das páginas. Texto escrito pelo usuário fica. */
  const resetPages = useCallback(() => {
    setLayoutOverrides({});
    setAdjustments({});
    setPlacements({});
    setGroupKeys({});
  }, []);

  return {
    pages,
    spread,
    spreadCount,
    canGoNext,
    canGoPrev,
    turn,
    startTurn,
    beginDrag,
    updateDrag,
    endDrag,
    goToSpread,
    setPageLayout,
    captions,
    setPageCaption,
    photoCaptions,
    setPhotoCaption,
    stories,
    addStoryHere,
    updateStory,
    removeStory,
    theme,
    setTheme,
    getAdjustment,
    updateAdjustment,
    resetAdjustment,
    getPlacement,
    setPlacement,
    resetPlacement,
    assignToGroup,
    clearGroup,
    resetPages,
    composeMode,
    setComposeMode,
    autoTiltEnabled,
    setAutoTiltEnabled,
    selectedPhotoId,
    setSelectedPhotoId,
  };
}

export type AlbumBookState = ReturnType<typeof useAlbumBook>;
