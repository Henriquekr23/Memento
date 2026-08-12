'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import type { Photo } from '@/types/photo';

import {
  leftIndexOf,
  resolveSpreadView,
  rightIndexOf,
  type PageSide,
} from './bookGeometry';
import { BookPage } from './BookPage';
import { PhotoInspector } from './PhotoInspector';
import { TURN_DURATION_MS, type AlbumBookState, type TurnDirection } from './useAlbumBook';

interface AlbumBookProps {
  book: AlbumBookState;
  albumName: string;
  photos: Photo[];
  onSwapPhotos: (aId: string, bId: string) => void;
  onRemoveFromAlbum: (photoId: string) => void;
}

/** Faixa da largura do livro que conta como "borda" para clique de virar. */
const EDGE_RATIO = 0.12;
const CLICK_TOLERANCE_PX = 4;
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/** Lombada com espessura: as folhas que sobram de cada lado. */
function PageEdges({ side, remaining }: { side: PageSide; remaining: number }) {
  const layers = Math.max(0, Math.min(7, Math.ceil(remaining / 3)));
  return (
    // inset-0 (e não inset-y-0): a caixa precisa ter a largura do livro, senão
    // as folhas do lado direito iriam parar na lombada.
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {Array.from({ length: layers }, (_, index) => (
        <span
          key={index}
          style={{
            [side]: `${-(index + 1) * 2}px`,
            top: `${(index + 1) * 1.5}px`,
            bottom: `${(index + 1) * 1.5}px`,
            opacity: 1 - index * 0.11,
            background: 'var(--paper-base)',
          }}
          className="absolute w-[3px] rounded-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        />
      ))}
    </div>
  );
}

export function AlbumBook({
  book,
  albumName,
  photos,
  onSwapPhotos,
  onRemoveFromAlbum,
}: AlbumBookProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    direction: TurnDirection;
    startX: number;
    isEdge: boolean;
    moved: boolean;
  } | null>(null);
  const [isStyleOpen, setIsStyleOpen] = useState(false);

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

  // ── Gesto de folhear ────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const node = rootRef.current;
      if (!node) return;

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
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onSwapPhotos(String(active.id), String(over.id));
  }

  const pageProps = {
    albumName,
    albumMeta,
    frame: book.theme.frame,
    tiltMode: book.tiltMode,
    selectedPhotoId: book.selectedPhotoId,
    photoCaptions: book.photoCaptions,
    getAdjustment: book.getAdjustment,
    onAdjust: book.updateAdjustment,
    onSelectPhoto: book.setSelectedPhotoId,
    onChangeLayout: book.setPageLayout,
    onChangeCaption: book.setPageCaption,
    onChangePhotoCaption: book.setPhotoCaption,
    onChangeStory: book.updateStory,
    onRemoveStory: book.removeStory,
  };

  const animating = Boolean(turn?.animating);
  const leafTransition = animating
    ? `transform ${TURN_DURATION_MS}ms ${EASE}`
    : 'none';
  // Fechado, o livro fica centralizado numa página só; ao abrir, desliza para a
  // esquerda no mesmo ritmo em que a capa gira.
  const shift = -25 * (1 - view.openness);

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
            onClick={() =>
              book.setTiltMode(book.tiltMode === 'aligned' ? 'scattered' : 'aligned')
            }
            title="Inclinação das fotos"
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/35 hover:text-white"
          >
            {book.tiltMode === 'aligned' ? 'Alinhado' : 'Espontâneo'}
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
          <button
            type="button"
            onClick={book.resetPages}
            title="Volta layouts e enquadramentos ao automático (o texto fica)"
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/50 transition hover:border-white/35 hover:text-white"
          >
            Refazer páginas
          </button>
        </div>
      </div>

      {isStyleOpen && (
        <StylePanel
          theme={book.theme}
          onChange={book.setTheme}
          onClose={() => setIsStyleOpen(false)}
        />
      )}

      {book.spreadCount > 2 && (
        <input
          type="range"
          min={0}
          max={book.spreadCount - 1}
          value={spread}
          onChange={(event) => book.goToSpread(Number(event.target.value))}
          aria-label="Navegar pelo álbum"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-400"
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
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
            <PageEdges side="left" remaining={leftIndexOf(spread) + 1} />
            <PageEdges
              side="right"
              remaining={pages.length - rightIndexOf(spread) - 1}
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
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden' }}
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
                    className="pointer-events-none absolute inset-0 bg-black"
                    style={{ opacity: turn.progress * 0.5 }}
                  />
                </div>

                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
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
                    className="pointer-events-none absolute inset-0 bg-black"
                    style={{ opacity: (1 - turn.progress) * 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Vinco central */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/35 to-transparent"
              style={{ opacity: 0.45 + view.openness * 0.55 }}
            />
          </div>
        </div>
      </DndContext>

      {selectedPhoto ? (
        <PhotoInspector
          photo={selectedPhoto}
          adjustment={book.getAdjustment(selectedPhoto.id)}
          tiltMode={book.tiltMode}
          onAdjust={book.updateAdjustment}
          onReset={book.resetAdjustment}
          onRemoveFromAlbum={onRemoveFromAlbum}
          onClose={() => book.setSelectedPhotoId(null)}
        />
      ) : (
        <p className="text-center text-xs text-white/35">
          {spread === 0
            ? 'Clique na capa para abrir o álbum'
            : 'Arraste a página para folhear · ← → também viram · clique numa foto para ajustar'}
        </p>
      )}
    </div>
  );
}
