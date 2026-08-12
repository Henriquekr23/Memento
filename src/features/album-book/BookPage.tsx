'use client';

import { useDroppable } from '@dnd-kit/core';

import type { FrameId } from '@/features/album-style/theme';
import { formatDate, formatDayLabel } from '@/lib/format';
import {
  MAX_PHOTOS_PER_PAGE,
  type AlbumPage,
  type StoryInsertion,
} from '@/lib/paginate';
import {
  PAGE_LAYOUTS,
  resolveRotation,
  type ComposeMode,
  type PageLayoutId,
  type PhotoAdjustment,
  type PhotoPlacement,
  type SlotRect,
} from '@/types/page';

import type { PageSide } from './bookGeometry';
import { LayoutPicker } from './LayoutPicker';
import { PhotoSlot } from './PhotoSlot';
import { isTrayDragId } from './PhotoTray';
import { StoryPage } from './StoryPage';

export interface BookPageProps {
  page: AlbumPage | null;
  side: PageSide;
  albumName: string;
  albumMeta: { firstDate: Date | null; lastDate: Date | null; photoCount: number };
  caption: string | undefined;
  frame: FrameId;
  /** Modo de composição desta página. */
  getComposeMode: (pageKey: string) => ComposeMode;
  onChangeComposeMode: (pageKey: string, mode: ComposeMode) => void;
  /** Inclinação automática das fotos que o usuário ainda não girou. */
  autoTiltEnabled: boolean;
  selectedPhotoId: string | null;
  photoCaptions: Record<string, string>;
  /** Páginas embaixo da folha que está virando não recebem interação. */
  interactive: boolean;
  getAdjustment: (photoId: string) => PhotoAdjustment;
  getPlacement: (photoId: string) => PhotoPlacement | null;
  onAdjust: (photoId: string, patch: Partial<PhotoAdjustment>) => void;
  onPlace: (
    photoId: string,
    rect: SlotRect,
    options?: { bringToFront?: boolean },
  ) => void;
  onSelectPhoto: (photoId: string | null) => void;
  onChangeLayout: (pageKey: string, layoutId: PageLayoutId) => void;
  onChangeCaption: (pageKey: string, caption: string) => void;
  onChangePhotoCaption: (photoId: string, caption: string) => void;
  onChangeStory: (
    id: string,
    patch: Partial<Pick<StoryInsertion, 'title' | 'body'>>,
  ) => void;
  onRemoveStory: (id: string) => void;
  onSendToTray: (photoId: string) => void;
}

const PAPER_TEXTURE =
  'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.5), transparent 45%), radial-gradient(circle at 82% 78%, rgba(0,0,0,0.05), transparent 55%)';

/** Prefixo do id de drop de uma página inteira. */
export const PAGE_DROP_PREFIX = 'page:';

export function pageKeyFromDropId(id: string): string | null {
  return id.startsWith(PAGE_DROP_PREFIX)
    ? id.slice(PAGE_DROP_PREFIX.length)
    : null;
}

/**
 * Área útil da página, que também é alvo para as fotos vindas do depósito.
 * Fica desabilitada nas páginas de baixo enquanto a folha vira.
 */
function PageDropArea({
  pageKey,
  photoCount,
  disabled,
  children,
}: {
  pageKey: string;
  photoCount: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${PAGE_DROP_PREFIX}${pageKey}`,
    disabled,
  });

  const isFull = photoCount >= MAX_PHOTOS_PER_PAGE;
  // Só destaca quando a foto vem do depósito: arraste entre fotos do álbum é
  // troca de lugar, e a página inteira não é alvo disso.
  const isTarget = isOver && active !== null && isTrayDragId(String(active.id));

  return (
    <div ref={setNodeRef} className="relative min-h-0 flex-1">
      {isTarget && (
        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-2 z-50 rounded-lg border-2 border-dashed',
            isFull ? 'border-red-400/70 bg-red-500/10' : 'border-amber-400 bg-amber-400/10',
          ].join(' ')}
        >
          <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-neutral-900">
            {isFull
              ? `máximo de ${MAX_PHOTOS_PER_PAGE} fotos nesta página`
              : 'soltar aqui'}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

function GutterShadow({ side }: { side: PageSide }) {
  return (
    <div
      aria-hidden
      className={[
        'pointer-events-none absolute inset-y-0 w-16',
        side === 'left'
          ? 'right-0 bg-gradient-to-l from-black/25 to-transparent'
          : 'left-0 bg-gradient-to-r from-black/25 to-transparent',
      ].join(' ')}
    />
  );
}

export function BookPage(props: BookPageProps) {
  const { page, side, albumName, albumMeta, interactive } = props;
  const rounded = side === 'left' ? 'rounded-l-[6px]' : 'rounded-r-[6px]';

  // Sem página: nada mesmo. É isso que deixa as capas isoladas nas pontas.
  if (!page) return null;

  if (page.kind === 'cover' || page.kind === 'back') {
    return (
      <div
        className={`relative h-full w-full overflow-hidden ${rounded}`}
        style={{
          background: 'var(--cover-base)',
          backgroundImage: 'var(--cover-texture)',
          color: 'var(--cover-ink)',
        }}
      >
        {page.kind === 'cover' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span
              className="text-[10px] uppercase tracking-[0.4em]"
              style={{ color: 'var(--cover-accent)' }}
            >
              Memento
            </span>
            <h2 className="text-balance text-2xl font-semibold leading-tight sm:text-3xl">
              {albumName || 'Minha viagem'}
            </h2>
            <span
              className="h-px w-16"
              style={{ background: 'var(--cover-accent)', opacity: 0.6 }}
            />
            {albumMeta.firstDate && albumMeta.lastDate && (
              <span className="text-xs opacity-70">
                {formatDate(albumMeta.firstDate)} — {formatDate(albumMeta.lastDate)}
              </span>
            )}
            <span
              className="mt-1 text-[11px] tracking-[0.2em] opacity-60"
              style={{ color: 'var(--cover-accent)' }}
            >
              KEEP THE JOURNEY
            </span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span
              className="h-px w-10"
              style={{ background: 'var(--cover-accent)', opacity: 0.5 }}
            />
            <span className="text-[11px] tracking-[0.3em] opacity-70">
              FIM DA VIAGEM
            </span>
            <span className="text-[10px] opacity-45">
              Memento · Keep the Journey
            </span>
          </div>
        )}
        <GutterShadow side={side} />
      </div>
    );
  }

  const paperStyle = {
    background: 'var(--paper-base)',
    backgroundImage: PAPER_TEXTURE,
    color: 'var(--paper-ink)',
    fontFamily: 'var(--album-font)',
  } as const;

  if (page.kind === 'title') {
    return (
      <div
        className={`relative h-full w-full overflow-hidden ${rounded}`}
        style={paperStyle}
      >
        <div className="flex h-full flex-col justify-center gap-3 px-10">
          <h2 className="text-2xl font-semibold leading-tight">
            {albumName || 'Minha viagem'}
          </h2>
          {albumMeta.firstDate && albumMeta.lastDate && (
            <p className="text-sm opacity-60">
              {formatDate(albumMeta.firstDate)} — {formatDate(albumMeta.lastDate)}
            </p>
          )}
          <p className="text-sm opacity-60">{albumMeta.photoCount} fotos</p>
          <p className="mt-6 max-w-xs text-xs leading-relaxed opacity-40">
            Arraste a página para folhear. Clique numa foto para ajustar o
            enquadramento ou escrever uma legenda.
          </p>
        </div>
        <GutterShadow side={side} />
      </div>
    );
  }

  // Guarda: a única página sem conteúdo do álbum, logo atrás da capa.
  if (page.kind === 'inside-cover') {
    return (
      <div
        className={`relative h-full w-full overflow-hidden ${rounded}`}
        style={paperStyle}
      >
        <GutterShadow side={side} />
      </div>
    );
  }

  if (page.kind === 'story' && page.story) {
    return (
      <div
        className={`group/page relative h-full w-full overflow-hidden ${rounded}`}
        style={paperStyle}
      >
        <StoryPage
          story={page.story}
          interactive={interactive}
          onChange={props.onChangeStory}
          onRemove={props.onRemoveStory}
        />
        <span className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[10px] opacity-30">
          {page.number}
        </span>
        <GutterShadow side={side} />
      </div>
    );
  }

  const layout = PAGE_LAYOUTS[page.layoutId];
  const composeMode = props.getComposeMode(page.key);
  const isFree = composeMode === 'free';
  const dayLabel = page.date ? formatDayLabel(page.date) : '';

  return (
    <div
      className={`group/page relative flex h-full w-full flex-col overflow-hidden ${rounded}`}
      style={paperStyle}
      onPointerDown={() => interactive && props.onSelectPhoto(null)}
    >
      <header className="relative px-5 pt-4">
        {page.dayNumber !== null && (
          <p
            className="truncate text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--paper-accent)' }}
          >
            Dia {page.dayNumber}
            {page.totalPagesOfDay > 1 &&
              ` · ${page.pageOfDay}/${page.totalPagesOfDay}`}
          </p>
        )}
        {/* O recuo só entra quando os controles aparecem: em repouso a data
            por extenso usa a página inteira e não é cortada. */}
        <input
          value={props.caption ?? ''}
          onChange={(event) => props.onChangeCaption(page.key, event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={!interactive}
          placeholder={dayLabel}
          aria-label="Legenda da página"
          className="w-full select-text truncate border-0 bg-transparent pr-0 text-[13px] leading-6 outline-none transition-[padding] duration-200 placeholder:text-current placeholder:opacity-35 group-hover/page:pr-24"
        />

        {/* Fora do fluxo: no fluxo, ele roubava a largura do campo de legenda
            e a data ficava cortada mesmo com a página inteira livre. */}
        {interactive && (
          <div className="absolute right-4 top-3 flex items-center gap-1.5 opacity-0 transition focus-within:opacity-100 group-hover/page:opacity-100">
            {!isFree && (
              <LayoutPicker
                value={page.layoutId}
                onChange={(layoutId) => props.onChangeLayout(page.key, layoutId)}
              />
            )}
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() =>
                props.onChangeComposeMode(page.key, isFree ? 'aligned' : 'free')
              }
              aria-pressed={isFree}
              title={
                isFree
                  ? 'Esta página está livre: arraste para mover, ◢ redimensiona, ↻ gira'
                  : 'Nesta página as fotos seguem o layout — clique para soltá-las'
              }
              className={[
                'rounded-full px-2.5 py-1.5 text-[11px] font-medium shadow-sm ring-1 ring-black/5 transition',
                isFree
                  ? 'bg-neutral-900 text-amber-300'
                  : 'bg-white/80 text-neutral-500 hover:text-neutral-800',
              ].join(' ')}
            >
              {isFree ? '✥ livre' : '▦ layout'}
            </button>
          </div>
        )}
      </header>

      {/* Área útil: todo posicionamento de foto é em % dela. */}
      <PageDropArea
        pageKey={page.key}
        photoCount={page.photos.length}
        disabled={!interactive}
      >
        <div className="absolute inset-x-3 inset-y-1">
          {page.photos.map((photo, index) => {
            const slot =
              layout.slots[index] ?? layout.slots[layout.slots.length - 1];
            const placement = props.getPlacement(photo.id);
            const rect = isFree && placement ? placement : slot;

            return (
              <PhotoSlot
                key={photo.id}
                photo={photo}
                adjustment={props.getAdjustment(photo.id)}
                rotation={resolveRotation(
                  photo.id,
                  props.getAdjustment(photo.id),
                  isFree && props.autoTiltEnabled,
                )}
                frame={props.frame}
                caption={props.photoCaptions[photo.id] ?? ''}
                isSelected={interactive && props.selectedPhotoId === photo.id}
                interactive={interactive}
                mode={composeMode}
                rect={rect}
                zIndex={(isFree && placement ? placement.z : 0) + index + 1}
                onSelect={props.onSelectPhoto}
                onAdjust={props.onAdjust}
                onCaptionChange={props.onChangePhotoCaption}
                onPlace={props.onPlace}
                onSendToTray={props.onSendToTray}
              />
            );
          })}

          {!isFree &&
            layout.slots.slice(page.photos.length).map((slot, index) => (
              <div
                key={`empty-${index}`}
                style={{
                  position: 'absolute',
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.w}%`,
                  height: `${slot.h}%`,
                }}
                className="p-2"
              >
                <div
                  className="h-full w-full rounded-[3px] border border-dashed opacity-25"
                  style={{ borderColor: 'var(--paper-ink-soft)' }}
                />
              </div>
            ))}
        </div>
      </PageDropArea>

      <footer className="flex items-center justify-between px-5 pb-3 text-[10px] opacity-30">
        <span>{side === 'left' ? page.number : ''}</span>
        <span>{side === 'right' ? page.number : ''}</span>
      </footer>

      <GutterShadow side={side} />
    </div>
  );
}
