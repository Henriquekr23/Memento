'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  ANCHOR_END,
  buildAlbumPages,
  type EmptyPageInsertion,
} from '@/lib/paginate';
import { DEFAULT_THEME, type AlbumTheme } from '@/features/album-style/theme';
import type { AlbumComposition } from '@/features/album-save/composition';
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

import { spreadCountOf } from './bookGeometry';
import { usePageTurn } from './usePageTurn';

/**
 * Estado editorial do álbum: o que existe em cada página e como está composto.
 * A navegação (em que spread estamos, folha virando) mora em `usePageTurn`.
 */
/**
 * `initial` só é lido na primeira renderização — é o estado inicial de um
 * álbum vindo do banco (ver `features/album-save/composition`). Passar sem ele
 * é o caminho da Fase 1: álbum novo, tudo no padrão.
 */
export function useAlbumBook(
  photos: readonly Photo[],
  initial?: AlbumComposition,
) {
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, PageLayoutId>
  >(() => initial?.layoutOverrides ?? {});
  const [captions, setCaptions] = useState<Record<string, string>>(
    () => initial?.captions ?? {},
  );
  const [adjustments, setAdjustments] = useState<Record<string, PhotoAdjustment>>(
    () => initial?.adjustments ?? {},
  );
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>(
    () => initial?.photoCaptions ?? {},
  );
  /**
   * Diário de viagem: um texto por grupo de dia, na chave do grupo.
   * Fica ao lado das legendas de propósito — é o mesmo tipo de coisa (texto do
   * usuário indexado por chave derivada), só que a chave é o dia, que sobrevive
   * a remontagens de página.
   */
  const [dayNotes, setDayNotes] = useState<Record<string, string>>(
    () => initial?.dayNotes ?? {},
  );
  const [emptyPages, setEmptyPages] = useState<EmptyPageInsertion[]>(
    () => initial?.emptyPages ?? [],
  );
  const [theme, setThemeState] = useState<AlbumTheme>(
    () => initial?.theme ?? DEFAULT_THEME,
  );
  /**
   * Modo de composição **por página**: uma página pode ter as fotos encaixadas
   * no layout enquanto a seguinte tem tudo solto. Era uma chave do livro
   * inteiro, mas a escolha é editorial e muda de página para página.
   */
  const [pageComposeModes, setPageComposeModes] = useState<
    Record<string, ComposeMode>
  >(() => initial?.composeModes ?? {});
  /**
   * Inclinação automática do modo espontâneo. Separada do modo porque uma
   * coisa é querer posicionar as fotos à mão, outra é querer todas tortas.
   */
  const [autoTiltEnabled, setAutoTiltEnabled] = useState(
    () => initial?.autoTilt ?? true,
  );
  const [placements, setPlacements] = useState<Record<string, PhotoPlacement>>(
    () => initial?.placements ?? {},
  );
  /** Foto → grupo de página, quando o usuário a colocou numa página à mão. */
  const [groupKeys, setGroupKeys] = useState<Record<string, string>>(
    () => initial?.groupKeys ?? {},
  );
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  /** Contador de empilhamento: quem foi mexido por último fica por cima. */
  const zCounterRef = useRef(1);

  const pages = useMemo(
    () =>
      buildAlbumPages(photos, {
        layoutOverrides,
        emptyPages,
        groupKeys,
      }),
    [photos, layoutOverrides, emptyPages, groupKeys],
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

  /** Diário do dia. Chave é o grupo da página, não a página. */
  const setDayNote = useCallback((groupKey: string, text: string) => {
    setDayNotes((current) => ({ ...current, [groupKey]: text }));
  }, []);

  /**
   * Liga/desliga o diário daquele dia.
   *
   * A **presença da chave** é o que diz se o diário existe — nada de um segundo
   * registro de booleanos para sair de sincronia com o texto. Desligar apaga o
   * texto daquele dia, e é a única forma de apagá-lo.
   */
  const toggleDayNote = useCallback((groupKey: string) => {
    setDayNotes((current) => {
      if (groupKey in current) {
        const next = { ...current };
        delete next[groupKey];
        return next;
      }
      return { ...current, [groupKey]: '' };
    });
  }, []);

  // ── Inserções ───────────────────────────────────────────────────────────
  const newInsertionId = useCallback(
    (prefix: string) =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    [],
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

  /**
   * Cria uma página de fotos em branco no fim do álbum.
   * Nasce vazia, esperando o usuário trazer fotos do depósito. Antes ela era
   * ancorada na página aberta e aparecia num ponto qualquer do meio — quem
   * cria uma página espera encontrá-la no fim, e de lá pode arrastar para
   * onde quiser na tira de páginas.
   */
  const addEmptyPageAtEnd = useCallback(
    () => addEmptyPage(ANCHOR_END),
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
    dayNotes,
    setDayNote,
    toggleDayNote,
    addEmptyPage,
    addEmptyPageAtEnd,
    removeEmptyPage,
    setEmptyPageAnchors,
    theme,
    setTheme,
    // Os registros crus, para quem precisa da composição inteira de uma vez —
    // hoje a exportação em PDF, que desenha as páginas fora do React.
    adjustments,
    placements,
    pageComposeModes,
    // Fase 2: os dois últimos completam o que precisa ser salvo — sem eles a
    // composição volta do banco sem as páginas montadas à mão.
    layoutOverrides,
    groupKeys,
    emptyPages,
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
