'use client';

import { DndContext } from '@dnd-kit/core';
import { useCallback, useEffect, useMemo } from 'react';

import { BookStage } from '@/features/album-book/BookStage';
import { BookToolbar } from '@/features/album-book/BookToolbar';
import {
  leftIndexOf,
  resolveSpreadView,
  rightIndexOf,
} from '@/features/album-book/bookGeometry';
import { useAlbumBook } from '@/features/album-book/useAlbumBook';
import { useSinglePageNav } from '@/features/album-book/useSinglePageNav';
import { themeToStyle } from '@/features/album-style/theme';
import { useIsNarrow, useIsTouch } from '@/hooks/useMediaQuery';
import type { AlbumComposition } from '@/features/album-save/composition';
import type { Photo } from '@/types/photo';

/**
 * O álbum salvo, só para ler.
 *
 * É o **mesmo livro** da tela de edição: mesma paginação, mesmo tema, mesma
 * virada de página. O que muda é que nada aqui edita — `readOnly` desliga as
 * alças, as legendas viram texto e o depósito, a tira de páginas e o inspetor
 * nem existem.
 *
 * Reaproveitar em vez de fazer uma galeria simples não foi economia de código:
 * folhear *é* o produto. Uma grade de imagens seria outro produto com o mesmo
 * conteúdo.
 */
export function AlbumViewer({
  title,
  photos,
  composition,
}: {
  title: string;
  photos: Photo[];
  composition: AlbumComposition;
}) {
  const book = useAlbumBook(photos, composition);
  const isNarrow = useIsNarrow();
  const isTouch = useIsTouch();

  const { pages, spread, turn } = book;
  const view = useMemo(
    () => resolveSpreadView(pages, spread, turn),
    [pages, spread, turn],
  );

  const leftIndex = leftIndexOf(spread);
  const rightIndex = rightIndexOf(spread);
  const nav = useSinglePageNav({
    hasLeft: leftIndex >= 0 && leftIndex < pages.length,
    hasRight: rightIndex < pages.length,
    turn,
    canGoNext: book.canGoNext,
    canGoPrev: book.canGoPrev,
    startTurn: book.startTurn,
  });

  const contentPageCount = Math.max(0, pages.length - 2);
  const pagerLabel = (() => {
    if (spread === 0) return 'Capa';
    if (!isNarrow) return `${spread} de ${book.spreadCount - 1}`;
    const index = nav.side === 'left' ? leftIndex : rightIndex;
    if (index >= pages.length - 1 || contentPageCount === 0) return 'Fim';
    return `${index} de ${contentPageCount}`;
  })();

  const albumMeta = useMemo(() => {
    if (photos.length === 0) {
      return { firstDate: null, lastDate: null, photoCount: 0 };
    }
    const times = photos.map((photo) => photo.timestamp.getTime());
    return {
      firstDate: new Date(Math.min(...times)),
      lastDate: new Date(Math.max(...times)),
      photoCount: photos.length,
    };
  }, [photos]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') book.startTurn('next');
      else if (event.key === 'ArrowLeft') book.startTurn('prev');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [book]);

  /** Decodifica adiantado as páginas vizinhas: sem isto a foto pisca em branco
   *  no meio da virada — e aqui elas vêm da rede, o que piora o efeito. */
  useEffect(() => {
    for (const offset of [-1, 0, 1, 2]) {
      const target = spread + offset;
      for (const index of [leftIndexOf(target), rightIndexOf(target)]) {
        for (const photo of pages[index]?.photos ?? []) {
          const image = new Image();
          image.decoding = 'async';
          image.src = photo.previewUrl;
        }
      }
    }
  }, [pages, spread]);

  const noop = useCallback(() => {}, []);

  // As mesmas props que o editor monta, com as ações desligadas. `readOnly` no
  // BookStage já impede a interação; passar funções vazias é o que satisfaz o
  // contrato sem inventar um segundo tipo de página.
  const pageProps = useMemo(
    () => ({
      albumName: title,
      albumMeta,
      frame: book.theme.frame,
      getComposeMode: book.getComposeMode,
      onChangeComposeMode: noop,
      autoTiltEnabled: book.autoTiltEnabled,
      isTouch,
      selectedPhotoId: null,
      photoCaptions: book.photoCaptions,
      dayNotes: book.dayNotes,
      getAdjustment: book.getAdjustment,
      getPlacement: book.getPlacement,
      onAdjust: noop,
      onPlace: noop,
      onSelectPhoto: noop,
      onChangeLayout: noop,
      onChangeCaption: noop,
      onChangePhotoCaption: noop,
      onChangeDayNote: noop,
      onToggleDayNote: noop,
      onSendToTray: noop,
    }),
    [title, albumMeta, book, isTouch, noop],
  );

  return (
    <div className="space-y-4" style={themeToStyle(book.theme)}>
      {/* O DndContext existe só para os hooks de arraste dentro das fotos
          encontrarem um provedor. Nenhum arraste é possível: as fotos estão
          desabilitadas em modo leitura. */}
      <DndContext>
        <BookStage
          pages={pages}
          view={view}
          spread={spread}
          turn={turn}
          captions={book.captions}
          pageProps={pageProps}
          singlePage={isNarrow}
          side={nav.side}
          readOnly
          onNavigate={nav.go}
          onBeginDrag={book.beginDrag}
          onUpdateDrag={book.updateDrag}
          onEndDrag={book.endDrag}
        />
      </DndContext>

      <BookToolbar
        label={pagerLabel}
        canGoNext={isNarrow ? nav.canNext : book.canGoNext}
        canGoPrev={isNarrow ? nav.canPrev : book.canGoPrev}
        onTurn={isNarrow ? nav.go : book.startTurn}
      />

      <p className="text-center text-xs text-[color-mix(in_srgb,var(--color-text)_35%,transparent)]">
        {isTouch
          ? 'Deslize para virar a página'
          : 'Arraste a página para folhear · ← → também viram'}
      </p>
    </div>
  );
}
