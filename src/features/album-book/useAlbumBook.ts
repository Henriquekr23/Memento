'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  STORY_ANCHOR_END,
  STORY_ANCHOR_START,
  buildAlbumPages,
  type EmptyPageInsertion,
  type StoryInsertion,
} from '@/lib/paginate';
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
import { usePageTurn } from './usePageTurn';

/**
 * Estado editorial do álbum: o que existe em cada página e como está composto.
 * A navegação (em que spread estamos, folha virando) mora em `usePageTurn`.
 */
export function useAlbumBook(photos: readonly Photo[]) {
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, PageLayoutId>
  >({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<Record<string, PhotoAdjustment>>(
    {},
  );
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({});
  const [stories, setStories] = useState<StoryInsertion[]>([]);
  const [emptyPages, setEmptyPages] = useState<EmptyPageInsertion[]>([]);
  const [theme, setThemeState] = useState<AlbumTheme>(DEFAULT_THEME);
  /**
   * Modo de composição **por página**: uma página pode ter as fotos encaixadas
   * no layout enquanto a seguinte tem tudo solto. Era uma chave do livro
   * inteiro, mas a escolha é editorial e muda de página para página.
   */
  const [pageComposeModes, setPageComposeModes] = useState<
    Record<string, ComposeMode>
  >({});
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
    () =>
      buildAlbumPages(photos, {
        layoutOverrides,
        stories,
        emptyPages,
        groupKeys,
      }),
    [photos, layoutOverrides, stories, emptyPages, groupKeys],
  );

  const spreadCount = spreadCountOf(pages.length);
  const {
    spread,
    turn,
    canGoNext,
    canGoPrev,
    startTurn,
    beginDrag,
    updateDrag,
    endDrag,
    goToSpread,
    jumpToSpread,
  } = usePageTurn(spreadCount);

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

  const getComposeMode = useCallback(
    (pageKey: string): ComposeMode => pageComposeModes[pageKey] ?? 'aligned',
    [pageComposeModes],
  );

  const setPageComposeMode = useCallback(
    (pageKey: string, mode: ComposeMode) => {
      setPageComposeModes((current) => ({ ...current, [pageKey]: mode }));
    },
    [],
  );

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
  const newInsertionId = useCallback(
    (prefix: string) =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    [],
  );

  /** Insere uma página de texto numa âncora escolhida por quem chama. */
  const addStory = useCallback(
    (anchorPhotoId: string) => {
      const id = newInsertionId('story');
      setStories((current) => [
        ...current,
        { id, anchorPhotoId, title: '', body: '' },
      ]);
      return id;
    },
    [newInsertionId],
  );

  /** Insere uma página de fotos em branco numa âncora escolhida. */
  const addEmptyPage = useCallback(
    (anchorPhotoId: string) => {
      const id = newInsertionId('page');
      setEmptyPages((current) => [...current, { id, anchorPhotoId }]);
      return id;
    },
    [newInsertionId],
  );

  const addStoryHere = useCallback(() => {
    const right = pages[rightIndexOf(spread)];
    let anchorPhotoId = STORY_ANCHOR_START;
    // Para onde navegar depois de inserir, quando dá para saber com certeza.
    let targetSpread: number | null = null;

    if (right?.kind === 'photos') {
      anchorPhotoId = right.photos.at(-1)?.id ?? STORY_ANCHOR_START;
      targetSpread = spread + 1;
    } else if (right?.kind === 'story' && right.story) {
      anchorPhotoId = right.story.anchorPhotoId;
      targetSpread = spread + 1;
    } else if (spread > 1) {
      const lastPhotoPage = [...pages].reverse().find((p) => p.kind === 'photos');
      anchorPhotoId = lastPhotoPage?.photos.at(-1)?.id ?? STORY_ANCHOR_START;
    } else {
      // Na capa ou na folha de rosto: o texto abre o álbum, no primeiro spread.
      targetSpread = 1;
    }

    const id = addStory(anchorPhotoId);
    if (targetSpread !== null) jumpToSpread(targetSpread);
    return id;
  }, [pages, spread, jumpToSpread, addStory]);

  /**
   * Cria uma página de fotos em branco no fim do álbum.
   * Nasce vazia, esperando o usuário trazer fotos do depósito. Antes ela era
   * ancorada na página aberta e aparecia num ponto qualquer do meio — quem
   * cria uma página espera encontrá-la no fim, e de lá pode arrastar para
   * onde quiser na tira de páginas.
   */
  const addEmptyPageAtEnd = useCallback(
    () => addEmptyPage(STORY_ANCHOR_END),
    [addEmptyPage],
  );

  const removeEmptyPage = useCallback((id: string) => {
    setEmptyPages((current) => current.filter((page) => page.id !== id));
  }, []);

  const setEmptyPageAnchors = useCallback(
    (anchors: Record<string, string>) => {
      setEmptyPages((current) =>
        current.map((page) =>
          anchors[page.id] !== undefined
            ? { ...page, anchorPhotoId: anchors[page.id] }
            : page,
        ),
      );
    },
    [],
  );

  /** Reancora as histórias depois de uma reordenação de páginas. */
  const setStoryAnchors = useCallback((anchors: Record<string, string>) => {
    setStories((current) =>
      current.map((story) =>
        anchors[story.id] !== undefined
          ? { ...story, anchorPhotoId: anchors[story.id] }
          : story,
      ),
    );
  }, []);

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
    setPageComposeModes({});
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
    addStory,
    addStoryHere,
    setStoryAnchors,
    addEmptyPage,
    addEmptyPageAtEnd,
    removeEmptyPage,
    setEmptyPageAnchors,
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
    getComposeMode,
    setPageComposeMode,
    autoTiltEnabled,
    setAutoTiltEnabled,
    selectedPhotoId,
    setSelectedPhotoId,
  };
}

export type AlbumBookState = ReturnType<typeof useAlbumBook>;
