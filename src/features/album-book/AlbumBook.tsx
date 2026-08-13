'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { StyleDrawer } from '@/features/album-style/StyleDrawer';
import { themeToStyle } from '@/features/album-style/theme';
import {
  MAX_PHOTOS_PER_PAGE,
  STORY_ANCHOR_START,
  contentPagesOf,
  findPageOfPhoto,
  findSlotRect,
  findSpreadOfPhoto,
  layoutForCount,
  reorderContentPages,
  type AlbumPage,
} from '@/lib/paginate';
import type { Photo } from '@/types/photo';

import { leftIndexOf, resolveSpreadView, rightIndexOf } from './bookGeometry';
import { pageKeyFromDropId } from './BookPage';
import { snapToCursor } from './dragPreview';
import { BookStage } from './BookStage';
import { BookToolbar } from './BookToolbar';
import { PageStrip } from './PageStrip';
import { PhotoInspector } from './PhotoInspector';
import {
  PhotoTray,
  TRAY_DROP_ID,
  isTrayDragId,
  photoIdFromDragId,
} from './PhotoTray';
import type { AlbumBookState } from './useAlbumBook';

interface AlbumBookProps {
  book: AlbumBookState;
  albumName: string;
  /** Fotos que estão no álbum, na ordem. */
  photos: Photo[];
  /** Fotos importadas que ainda não estão em nenhuma página. */
  trayPhotos: Photo[];
  isImporting: boolean;
  onSwapPhotos: (aId: string, bId: string) => void;
  /** Traz uma foto do depósito para a ordem, logo depois de outra. */
  onPlaceAfter: (photoId: string, afterPhotoId: string | null) => void;
  onSendToTray: (photoIds: string | readonly string[]) => void;
  /** Reescreve a ordem das fotos do álbum (usado ao reordenar páginas). */
  onReorderPhotos: (orderedIds: string[]) => void;
  onAddFiles: (files: File[]) => void;
}

export function AlbumBook({
  book,
  albumName,
  photos,
  trayPhotos,
  isImporting,
  onSwapPhotos,
  onPlaceAfter,
  onSendToTray,
  onReorderPhotos,
  onAddFiles,
}: AlbumBookProps) {
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  // `document` não existe na pré-renderização. O portal não emite nada na
  // árvore do pai, então não há risco de divergência na hidratação.
  const portalTarget = typeof document === 'undefined' ? null : document.body;

  /** Foto colocada por último — marca a página que o usuário está montando. */
  const lastPlacedRef = useRef<string | null>(null);
  /** Foto que o álbum deve mostrar assim que a paginação for recalculada. */
  const pendingFocusRef = useRef<string | null>(null);

  const { pages, spread, turn } = book;
  const view = useMemo(
    () => resolveSpreadView(pages, spread, turn),
    [pages, spread, turn],
  );

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

  const selectedPhoto = useMemo(
    () => photos.find((photo) => photo.id === book.selectedPhotoId) ?? null,
    [photos, book.selectedPhotoId],
  );

  // Os controles finos seguem o modo da página onde a foto está.
  const selectedPhotoComposeMode = useMemo(() => {
    if (!selectedPhoto) return 'aligned' as const;
    const page = findPageOfPhoto(pages, selectedPhoto.id);
    return page ? book.getComposeMode(page.key) : ('aligned' as const);
  }, [selectedPhoto, pages, book]);

  // ── Teclado ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === 'ArrowRight') book.startTurn('next');
      else if (event.key === 'ArrowLeft') book.startTurn('prev');
      else if (event.key === 'Escape') book.setSelectedPhotoId(null);
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [book]);

  // ── Trocar fotos de lugar ───────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  /**
   * Coloca uma foto do depósito numa página.
   *
   * Três coisas acontecem juntas, e nessa ordem importa pouco porque tudo é
   * recalculado no próximo render:
   * 1. a foto passa a pertencer ao grupo daquela página (senão, sendo de outro
   *    dia, ela abriria uma página nova em vez de entrar nesta);
   * 2. o layout da página cresce só o necessário para caber mais uma;
   * 3. a foto entra na ordem logo depois da última foto da página.
   */
  const placePhotoOnPage = useCallback(
    (photoId: string, page: AlbumPage) => {
      if (page.kind !== 'photos' || page.photos.length >= MAX_PHOTOS_PER_PAGE) {
        return;
      }
      if (page.groupKey) book.assignToGroup(photoId, page.groupKey);
      book.setPageLayout(
        page.key,
        layoutForCount(page.photos.length + 1, page.layoutId),
      );

      // Numa página em branco não há última foto: o lugar na ordem vem da
      // âncora dela. `'start'` vira null (começo de tudo) e `'end'` não casa
      // com nenhuma foto, o que faz a foto ir para o fim da ordem — que é
      // exatamente onde essa página está.
      const anchor =
        page.anchorPhotoId === STORY_ANCHOR_START ? null : page.anchorPhotoId;
      onPlaceAfter(photoId, page.photos.at(-1)?.id ?? anchor ?? null);

      // Vale tanto para clique quanto para arraste: a próxima foto continua
      // nesta mesma página enquanto couber.
      lastPlacedRef.current = photoId;
    },
    [book, onPlaceAfter],
  );

  /** Tira a foto da página e devolve ao depósito, sem perder o arquivo. */
  const sendPhotoToTray = useCallback(
    (photoId: string) => {
      book.clearGroup(photoId);
      book.resetPlacement(photoId);
      book.setSelectedPhotoId(null);
      onSendToTray(photoId);
    },
    [book, onSendToTray],
  );

  /** Foto que precede uma página — é a âncora de qualquer inserção ali. */
  const anchorBefore = useCallback(
    (page: AlbumPage): string => {
      const index = pages.indexOf(page);
      for (let i = index - 1; i >= 0; i -= 1) {
        const previous = pages[i]?.photos.at(-1);
        if (previous) return previous.id;
      }
      return STORY_ANCHOR_START;
    },
    [pages],
  );

  /**
   * Remove uma página. Nenhuma foto é apagada: elas voltam para o depósito e
   * podem ser recolocadas onde o usuário quiser.
   */
  const removePage = useCallback(
    (page: AlbumPage) => {
      if (page.story) {
        book.removeStory(page.story.id);
        return;
      }
      if (page.emptyPageId) {
        book.removeEmptyPage(page.emptyPageId);
        return;
      }
      const ids = page.photos.map((photo) => photo.id);
      for (const id of ids) {
        book.clearGroup(id);
        book.resetPlacement(id);
      }
      book.setSelectedPhotoId(null);
      onSendToTray(ids);
    },
    [book, onSendToTray],
  );

  /** Transforma a página aberta em página de texto (e vice-versa). */
  const convertPage = useCallback(
    (page: AlbumPage, to: 'story' | 'photos') => {
      const anchor = anchorBefore(page);

      if (to === 'story') {
        if (page.story) return;
        removePage(page);
        book.addStory(anchor);
        return;
      }

      if (!page.story) return;
      book.removeStory(page.story.id);
      book.addEmptyPage(anchor);
    },
    [anchorBefore, removePage, book],
  );

  function handleDragStart(event: DragStartEvent) {
    setDraggingPhotoId(photoIdFromDragId(String(event.active.id)));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingPhotoId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const photoId = photoIdFromDragId(activeId);

    // Soltou no depósito: sai da página, sem apagar o arquivo.
    if (overId === TRAY_DROP_ID) {
      if (!isTrayDragId(activeId)) sendPhotoToTray(photoId);
      return;
    }

    // Alvo é uma página (a folha inteira ou uma vaga livre dela)?
    const droppedPageKey = pageKeyFromDropId(overId);
    const targetPage = droppedPageKey
      ? (pages.find((item) => item.key === droppedPageKey) ?? null)
      : findPageOfPhoto(pages, overId);

    // Veio do depósito: entra na página.
    if (isTrayDragId(activeId)) {
      if (targetPage) placePhotoOnPage(photoId, targetPage);
      return;
    }

    // Já estava no álbum. Soltar numa vaga livre (ou na folha) muda a foto de
    // página; soltar em cima de outra foto troca as duas de lugar.
    if (droppedPageKey !== null) {
      const origin = findPageOfPhoto(pages, photoId);
      if (targetPage && targetPage.key !== origin?.key) {
        placePhotoOnPage(photoId, targetPage);
      }
      return;
    }

    if (photoId === overId) return;
    onSwapPhotos(photoId, overId);
  }

  const draggingPhoto = draggingPhotoId
    ? ([...photos, ...trayPhotos].find((photo) => photo.id === draggingPhotoId) ??
      null)
    : null;

  /** Páginas à vista, da direita para a esquerda (onde o olho está primeiro). */
  const visiblePages = useMemo(
    () =>
      [view.rightStatic, view.leftStatic].filter(
        (page): page is AlbumPage => page !== null,
      ),
    [view.rightStatic, view.leftStatic],
  );

  /**
   * Clique numa foto do depósito.
   *
   * A ordem de preferência do destino importa mais do que parece:
   * 1. a página que o usuário está enchendo (a da última foto colocada), o que
   *    faz cliques seguidos irem todos para o mesmo lugar. Sem isso, a segunda
   *    foto podia cair na página vizinha só porque ela também tinha espaço;
   * 2. uma página em branco à vista — quem acabou de criar uma quer usá-la;
   * 3. qualquer página aberta com espaço;
   * 4. a primeira com espaço no álbum inteiro;
   * 5. e, se nada disso existir, a foto entra no fim formando página nova.
   *
   * Depois de colocar, o álbum vira até lá para o usuário ver onde ela caiu.
   */
  const placeFromTray = useCallback(
    (photoId: string) => {
      const hasRoom = (page: AlbumPage) =>
        page.kind === 'photos' && page.photos.length < MAX_PHOTOS_PER_PAGE;

      const beingFilled = lastPlacedRef.current
        ? findPageOfPhoto(pages, lastPlacedRef.current)
        : null;
      const continuation =
        beingFilled && visiblePages.includes(beingFilled) && hasRoom(beingFilled)
          ? beingFilled
          : null;

      const target =
        continuation ??
        visiblePages.find(
          (page) => page.kind === 'photos' && page.photos.length === 0,
        ) ??
        visiblePages.find(hasRoom) ??
        pages.find(hasRoom) ??
        null;

      if (target) {
        placePhotoOnPage(photoId, target);
      } else {
        onPlaceAfter(photoId, photos.at(-1)?.id ?? null);
        lastPlacedRef.current = photoId;
      }

      pendingFocusRef.current = photoId;
    },
    [visiblePages, pages, photos, placePhotoOnPage, onPlaceAfter],
  );

  // Depois que a paginação foi recalculada, leva o álbum até a foto colocada.
  useEffect(() => {
    const photoId = pendingFocusRef.current;
    if (!photoId) return;
    const target = findSpreadOfPhoto(pages, photoId);
    if (target === null) return;
    pendingFocusRef.current = null;
    book.goToSpread(target);
    book.setSelectedPhotoId(photoId);
  }, [pages, book]);

  /**
   * Decodifica adiantado as fotos dos spreads vizinhos.
   * Os arquivos já estão em memória, mas sem isso o navegador só decodifica na
   * hora de pintar — e a foto piscava em branco no meio da virada.
   */
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const alreadyLoaded = preloadedRef.current;

    for (const offset of [-1, 0, 1, 2]) {
      const target = spread + offset;
      for (const index of [leftIndexOf(target), rightIndexOf(target)]) {
        for (const photo of pages[index]?.photos ?? []) {
          // `pages` é recalculado a cada edição; sem esta memória o efeito
          // recriaria dezenas de Image a cada clique do usuário.
          if (alreadyLoaded.has(photo.previewUrl)) continue;
          alreadyLoaded.add(photo.previewUrl);
          const image = new Image();
          image.decoding = 'async';
          image.src = photo.previewUrl;
        }
      }
    }
  }, [pages, spread]);

  /** Reordenar páginas = reescrever a ordem das fotos e reancorar os textos. */
  const handleReorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      const { photoOrder, storyAnchors, emptyPageAnchors } =
        reorderContentPages(pages, fromIndex, toIndex);
      if (
        photoOrder.length === 0 &&
        Object.keys(storyAnchors).length === 0 &&
        Object.keys(emptyPageAnchors).length === 0
      ) {
        return;
      }
      onReorderPhotos(photoOrder);
      book.setStoryAnchors(storyAnchors);
      book.setEmptyPageAnchors(emptyPageAnchors);
    },
    [pages, onReorderPhotos, book],
  );

  const contentPages = useMemo(() => contentPagesOf(pages), [pages]);

  // Memoizado porque cada BookPage recebe o objeto inteiro: sem isso, um
  // objeto novo a cada render obrigaria as duas páginas (e todas as fotos
  // dentro delas) a redesenhar a cada quadro de um arraste.
  const pageProps = useMemo(
    () => ({
      albumName,
      albumMeta,
      frame: book.theme.frame,
      getComposeMode: book.getComposeMode,
      onChangeComposeMode: book.setPageComposeMode,
      autoTiltEnabled: book.autoTiltEnabled,
      selectedPhotoId: book.selectedPhotoId,
      photoCaptions: book.photoCaptions,
      getAdjustment: book.getAdjustment,
      getPlacement: book.getPlacement,
      onAdjust: book.updateAdjustment,
      onPlace: book.setPlacement,
      onSelectPhoto: book.setSelectedPhotoId,
      onChangeLayout: book.setPageLayout,
      onChangeCaption: book.setPageCaption,
      onChangePhotoCaption: book.setPhotoCaption,
      onChangeStory: book.updateStory,
      onConvertPage: convertPage,
      onSendToTray: sendPhotoToTray,
    }),
    [albumName, albumMeta, book, sendPhotoToTray, convertPage],
  );

  return (
    <div className="space-y-4" style={themeToStyle(book.theme)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingPhotoId(null)}
      >
        <PhotoTray
          photos={trayPhotos}
          albumCount={photos.length}
          isImporting={isImporting}
          onPlace={placeFromTray}
          onAddFiles={onAddFiles}
        />

        <BookStage
          pages={pages}
          view={view}
          spread={spread}
          turn={turn}
          captions={book.captions}
          pageProps={pageProps}
          onBeginDrag={book.beginDrag}
          onUpdateDrag={book.updateDrag}
          onEndDrag={book.endDrag}
        />

        {/* A prévia vai para o `body` num portal e é ancorada no cursor: dentro
            do livro ela herdava a perspectiva 3D e nascia longe do ponteiro,
            além de ser cortada pelo limite da folha. */}
        {portalTarget &&
          createPortal(
            <DragOverlay
              modifiers={[snapToCursor]}
              dropAnimation={{
                duration: 180,
                easing: 'cubic-bezier(0.2,0.8,0.3,1)',
              }}
            >
              {draggingPhoto && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={draggingPhoto.previewUrl}
                  alt=""
                  className="h-32 w-32 rotate-3 cursor-grabbing rounded-[3px] border-[3px] border-white object-cover shadow-2xl"
                />
              )}
            </DragOverlay>,
            portalTarget,
          )}
      </DndContext>

      <BookToolbar
        spread={spread}
        spreadCount={book.spreadCount}
        canGoNext={book.canGoNext}
        canGoPrev={book.canGoPrev}
        onTurn={book.startTurn}
      />

      <PageStrip
        pages={contentPages}
        currentSpread={spread}
        spreadOfPage={(page) => {
          const index = pages.indexOf(page);
          return index === -1 ? null : Math.ceil(index / 2);
        }}
        onReorder={handleReorderPages}
        onSelectPage={(page) => {
          const index = pages.indexOf(page);
          if (index !== -1) book.goToSpread(Math.ceil(index / 2));
        }}
        onAddPage={book.addEmptyPageAtEnd}
        onRemovePage={removePage}
      />

      {selectedPhoto ? (
        <PhotoInspector
          photo={selectedPhoto}
          adjustment={book.getAdjustment(selectedPhoto.id)}
          rect={
            book.getPlacement(selectedPhoto.id) ??
            findSlotRect(pages, selectedPhoto.id)
          }
          composeMode={selectedPhotoComposeMode}
          autoTiltEnabled={book.autoTiltEnabled}
          onAdjust={book.updateAdjustment}
          onPlace={book.setPlacement}
          onReset={(photoId) => {
            book.resetAdjustment(photoId);
            book.resetPlacement(photoId);
          }}
          onSendToTray={sendPhotoToTray}
          onClose={() => book.setSelectedPhotoId(null)}
        />
      ) : (
        <p className="text-center text-xs text-[color-mix(in_srgb,var(--color-text)_35%,transparent)]">
          {spread === 0
            ? 'Clique na capa para abrir o álbum'
            : 'Arraste a página para folhear · ← → também viram · clique numa foto para ajustar · o canto da página escolhe entre layout e livre'}
        </p>
      )}

      <StyleDrawer
        open={isStyleOpen}
        onOpenChange={setIsStyleOpen}
        theme={book.theme}
        onChange={book.setTheme}
        autoTiltEnabled={book.autoTiltEnabled}
        onAutoTiltChange={book.setAutoTiltEnabled}
        onResetPages={book.resetPages}
      />
    </div>
  );
}
