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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { StylePanel } from '@/features/album-style/StylePanel';
import { themeToStyle } from '@/features/album-style/theme';
import {
  MAX_PHOTOS_PER_PAGE,
  contentPagesOf,
  findPageOfPhoto,
  findSlotRect,
  findSpreadOfPhoto,
  layoutForCount,
  reorderContentPages,
  type AlbumPage,
} from '@/lib/paginate';
import type { Photo } from '@/types/photo';

import {
  leftIndexOf,
  resolveSpreadView,
  rightIndexOf,
  type PageSide,
} from './bookGeometry';
import { BookPage, pageKeyFromDropId } from './BookPage';
import { PageStrip } from './PageStrip';
import { PhotoInspector } from './PhotoInspector';
import {
  PhotoTray,
  TRAY_DROP_ID,
  isTrayDragId,
  photoIdFromDragId,
} from './PhotoTray';
import { TURN_DURATION_MS, type AlbumBookState, type TurnDirection } from './useAlbumBook';

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
  onSendToTray: (photoId: string) => void;
  /** Reescreve a ordem das fotos do álbum (usado ao reordenar páginas). */
  onReorderPhotos: (orderedIds: string[]) => void;
  onAddFiles: (files: File[]) => void;
}

/** Faixa da largura do livro que conta como "borda" para clique de virar. */
const EDGE_RATIO = 0.12;
const CLICK_TOLERANCE_PX = 4;
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/**
 * Escurecimento da folha em movimento: mais forte junto à lombada, que é onde
 * o papel se dobra e recebe menos luz. Preto chapado deixava a página com cara
 * de cartão apagando, não de folha virando.
 */
function foldGradient(side: PageSide): string {
  const towardsSpine = side === 'right' ? 'left' : 'right';
  return `linear-gradient(to ${towardsSpine}, rgba(0,0,0,0.04), rgba(0,0,0,0.62))`;
}

/**
 * Espessura do livro: as folhas que sobram de cada lado.
 *
 * Só aparece com o álbum aberto. De frente para um livro fechado você vê a
 * capa e mais nada — as folhas estão atrás dela. Desenhar a espessura ali
 * criava justamente aquela faixa clara colada na capa, que parecia uma margem
 * sobrando de um lado ou do outro, dependendo de onde o álbum fechava.
 */
function PageEdges({
  side,
  remaining,
  openness,
}: {
  side: PageSide;
  remaining: number;
  openness: number;
}) {
  if (remaining <= 0 || openness <= 0.01) return null;

  const thickness = Math.min(9, Math.max(2, Math.round(remaining / 3)));
  const direction = side === 'left' ? 'left' : 'right';

  return (
    // inset-0 (e não inset-y-0): a caixa precisa ter a largura do livro, senão
    // as folhas do lado direito iriam parar na lombada.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{ opacity: openness }}
    >
      <span
        style={{
          [side]: `${-thickness}px`,
          top: '3px',
          bottom: '3px',
          width: `${thickness}px`,
          backgroundImage: `repeating-linear-gradient(to ${direction}, var(--paper-base) 0 1px, rgba(0,0,0,0.4) 1px 2px)`,
          borderRadius: side === 'left' ? '3px 0 0 3px' : '0 3px 3px 0',
          boxShadow: 'inset 0 0 5px rgba(0,0,0,0.45)',
        }}
        className="absolute"
      />
    </div>
  );
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    direction: TurnDirection;
    startX: number;
    isEdge: boolean;
    moved: boolean;
  } | null>(null);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);

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

  // ── Gesto de folhear ────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const node = rootRef.current;
      if (!node) return;

      // Sem isto o navegador começa a selecionar texto no meio do arraste e o
      // livro fica todo azul enquanto o usuário folheia. Os campos de texto
      // param a propagação antes daqui, então continuam selecionáveis.
      event.preventDefault();

      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const half = rect.width / 2;
      const direction: TurnDirection = x > half ? 'next' : 'prev';
      const distanceToEdge = direction === 'next' ? rect.width - x : x;

      if (!book.beginDrag(direction, event.clientX, half)) return;

      gestureRef.current = {
        direction,
        startX: event.clientX,
        // Com o álbum fechado, um clique em qualquer ponto da capa abre.
        isEdge: spread === 0 || distanceToEdge < rect.width * EDGE_RATIO,
        moved: false,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        const gesture = gestureRef.current;
        if (!gesture) return;
        if (Math.abs(moveEvent.clientX - gesture.startX) > CLICK_TOLERANCE_PX) {
          gesture.moved = true;
        }
        book.updateDrag(moveEvent.clientX);
      };

      const handleUp = () => {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        book.endDrag(gesture ? !gesture.moved && gesture.isEdge : false);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    },
    [book, spread],
  );

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
      onPlaceAfter(photoId, page.photos.at(-1)?.id ?? null);
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

    // Veio do depósito: o alvo pode ser a página inteira ou uma foto dela.
    if (isTrayDragId(activeId)) {
      const droppedPageKey = pageKeyFromDropId(overId);
      const page = droppedPageKey
        ? (pages.find((item) => item.key === droppedPageKey) ?? null)
        : findPageOfPhoto(pages, overId);
      if (page) placePhotoOnPage(photoId, page);
      return;
    }

    // Já estava no álbum: soltar sobre outra foto troca as duas de lugar.
    if (pageKeyFromDropId(overId) !== null || photoId === overId) return;
    onSwapPhotos(photoId, overId);
  }

  const draggingPhoto = draggingPhotoId
    ? ([...photos, ...trayPhotos].find((photo) => photo.id === draggingPhotoId) ??
      null)
    : null;

  // A página que recebe o clique do depósito: a da direita quando dá, senão a
  // da esquerda — é onde o olho do usuário está.
  const openPage = useMemo(() => {
    const candidates = [view.rightStatic, view.leftStatic];
    return (
      candidates.find(
        (page) =>
          page?.kind === 'photos' && page.photos.length < MAX_PHOTOS_PER_PAGE,
      ) ?? null
    );
  }, [view.leftStatic, view.rightStatic]);

  /**
   * Clique numa foto do depósito.
   *
   * Antes isso não fazia nada quando o álbum estava fechado na capa, e parecia
   * que o depósito não funcionava. Agora sempre há um destino: a página aberta,
   * senão a primeira com espaço, senão uma página nova no fim — e o álbum vira
   * até lá para o usuário ver onde a foto caiu.
   */
  const pendingFocusRef = useRef<string | null>(null);

  const placeFromTray = useCallback(
    (photoId: string) => {
      const target =
        openPage ??
        pages.find(
          (page) =>
            page.kind === 'photos' && page.photos.length < MAX_PHOTOS_PER_PAGE,
        ) ??
        null;

      if (target) placePhotoOnPage(photoId, target);
      else onPlaceAfter(photoId, photos.at(-1)?.id ?? null);

      pendingFocusRef.current = photoId;
    },
    [openPage, pages, photos, placePhotoOnPage, onPlaceAfter],
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
  useEffect(() => {
    const urls = new Set<string>();
    for (const offset of [-1, 0, 1, 2]) {
      const target = spread + offset;
      for (const index of [leftIndexOf(target), rightIndexOf(target)]) {
        for (const photo of pages[index]?.photos ?? []) urls.add(photo.previewUrl);
      }
    }
    for (const url of urls) {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
    }
  }, [pages, spread]);

  /** Reordenar páginas = reescrever a ordem das fotos e reancorar os textos. */
  const handleReorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      const { photoOrder, storyAnchors } = reorderContentPages(
        pages,
        fromIndex,
        toIndex,
      );
      if (photoOrder.length === 0 && Object.keys(storyAnchors).length === 0) {
        return;
      }
      onReorderPhotos(photoOrder);
      book.setStoryAnchors(storyAnchors);
    },
    [pages, onReorderPhotos, book],
  );

  const contentPages = useMemo(() => contentPagesOf(pages), [pages]);

  const pageProps = {
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
    onRemoveStory: book.removeStory,
    onSendToTray: sendPhotoToTray,
  };

  const animating = Boolean(turn?.animating);
  const leafTransition = animating
    ? `transform ${TURN_DURATION_MS}ms ${EASE}`
    : 'none';
  // Fechado, o livro fica centralizado numa capa só — à direita no começo, à
  // esquerda no fim. A conta de quanto deslocar vem da geometria.
  const shift = view.offset;

  return (
    <div className="space-y-4" style={themeToStyle(book.theme)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => book.startTurn('prev')}
            disabled={!book.canGoPrev}
            aria-label="Página anterior"
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-25"
          >
            ‹
          </button>
          <span className="min-w-24 text-center text-xs tabular-nums text-white/45">
            {spread === 0 ? 'capa' : `${spread} / ${book.spreadCount - 1}`}
          </span>
          <button
            type="button"
            onClick={() => book.startTurn('next')}
            disabled={!book.canGoNext}
            aria-label="Próxima página"
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-25"
          >
            ›
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={book.addStoryHere}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/35 hover:text-white"
          >
            + Página de texto
          </button>
          <button
            type="button"
            onClick={() => setIsStyleOpen((value) => !value)}
            aria-pressed={isStyleOpen}
            className={[
              'rounded-full px-4 py-1.5 text-xs transition',
              isStyleOpen
                ? 'bg-white/90 font-medium text-neutral-900'
                : 'border border-white/15 text-white/70 hover:border-white/35 hover:text-white',
            ].join(' ')}
          >
            Estilo
          </button>
        </div>
      </div>

      {isStyleOpen && (
        <StylePanel
          theme={book.theme}
          onChange={book.setTheme}
          autoTiltEnabled={book.autoTiltEnabled}
          onAutoTiltChange={book.setAutoTiltEnabled}
          onResetPages={book.resetPages}
          onClose={() => setIsStyleOpen(false)}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingPhotoId(null)}
      >
        <PhotoTray
          photos={trayPhotos}
          isImporting={isImporting}
          onPlace={placeFromTray}
          onAddFiles={onAddFiles}
        />

        <div
          className="mt-4 select-none"
          style={{
            perspective: '2600px',
            perspectiveOrigin: '50% 45%',
            transform: `translateX(${shift}%)`,
            transition: animating ? `transform ${TURN_DURATION_MS}ms ${EASE}` : 'none',
          }}
        >
          <div
            ref={rootRef}
            onPointerDown={handlePointerDown}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative mx-auto aspect-[8/5] w-full max-w-5xl cursor-grab touch-none active:cursor-grabbing"
          >
            <PageEdges
              side="left"
              remaining={leftIndexOf(spread) + 1}
              openness={view.openness}
            />
            <PageEdges
              side="right"
              remaining={pages.length - rightIndexOf(spread) - 1}
              openness={view.openness}
            />

            {/* Páginas paradas */}
            <div
              className="absolute left-0 top-0 z-10 h-full w-1/2"
              style={{
                boxShadow: view.leftStatic
                  ? '0 30px 60px -25px rgba(0,0,0,0.85)'
                  : undefined,
              }}
            >
              <BookPage
                {...pageProps}
                page={view.leftStatic}
                side="left"
                caption={
                  view.leftStatic ? book.captions[view.leftStatic.key] : undefined
                }
                interactive={!turn}
              />
            </div>
            <div
              className="absolute right-0 top-0 z-10 h-full w-1/2"
              style={{
                boxShadow: view.rightStatic
                  ? '0 30px 60px -25px rgba(0,0,0,0.85)'
                  : undefined,
              }}
            >
              <BookPage
                {...pageProps}
                page={view.rightStatic}
                side="right"
                caption={
                  view.rightStatic ? book.captions[view.rightStatic.key] : undefined
                }
                interactive={!turn}
              />
            </div>

            {/* Folha em movimento */}
            {turn && view.leaf && (
              <div
                className="absolute top-0 z-20 h-full w-1/2"
                style={{
                  left: turn.direction === 'next' ? '50%' : 0,
                  transformOrigin:
                    turn.direction === 'next' ? 'left center' : 'right center',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${view.angle}deg)`,
                  transition: leafTransition,
                  willChange: 'transform',
                }}
              >
                {/* Miolo opaco da folha: papel não é translúcido, e isso evita
                    qualquer vazamento pelos cantos arredondados. */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[6px]"
                  style={{ background: 'var(--paper-base)' }}
                />

                {/* As duas faces são afastadas meio pixel no eixo Z. Coplanares
                    elas brigam pelo mesmo pixel (z-fighting) e a foto da frente
                    vaza por cima da contracapa no meio da virada. */}
                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0.5px)',
                    boxShadow: '0 24px 48px -18px rgba(0,0,0,0.9)',
                  }}
                >
                  <BookPage
                    {...pageProps}
                    page={view.leaf.front}
                    side={view.leaf.frontSide}
                    caption={
                      view.leaf.front
                        ? book.captions[view.leaf.front.key]
                        : undefined
                    }
                    interactive={false}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: foldGradient(view.leaf.frontSide),
                      opacity: turn.progress,
                    }}
                  />
                </div>

                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg) translateZ(0.5px)',
                    boxShadow: '0 24px 48px -18px rgba(0,0,0,0.9)',
                  }}
                >
                  <BookPage
                    {...pageProps}
                    page={view.leaf.back}
                    side={view.leaf.backSide}
                    caption={
                      view.leaf.back ? book.captions[view.leaf.back.key] : undefined
                    }
                    interactive={false}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: foldGradient(view.leaf.backSide),
                      opacity: 1 - turn.progress,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sombra que a folha levantada projeta na página de baixo. Nasce
                na lombada e é mais forte no meio do giro, quando a folha está
                perpendicular à página. */}
            {turn && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-[16] w-1/2"
                style={{
                  left: turn.direction === 'next' ? 0 : '50%',
                  background: `linear-gradient(to ${
                    turn.direction === 'next' ? 'left' : 'right'
                  }, rgba(0,0,0,0.6), transparent 65%)`,
                  opacity: Math.sin(turn.progress * Math.PI) * 0.9,
                }}
              />
            )}

            {/* Vinco central. Fica abaixo da folha que gira (z-20): acima
                dela, a sombra ficava parada cortando a página em movimento. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-1/2 z-[15] w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/35 to-transparent"
              style={{ opacity: view.openness }}
            />
          </div>
        </div>

        {/* A prévia arrastada vive num portal, fora da página: sem ela a foto
            não acompanhava o cursor e ainda era cortada pelo limite da folha. */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2,0.8,0.3,1)' }}>
          {draggingPhoto && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={draggingPhoto.previewUrl}
              alt=""
              className="h-36 w-36 rotate-3 cursor-grabbing rounded-[3px] border-[3px] border-white object-cover shadow-2xl"
            />
          )}
        </DragOverlay>
      </DndContext>

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
        <p className="text-center text-xs text-white/35">
          {spread === 0
            ? 'Clique na capa para abrir o álbum'
            : 'Arraste a página para folhear · ← → também viram · clique numa foto para ajustar · o canto da página escolhe entre layout e livre'}
        </p>
      )}
    </div>
  );
}
