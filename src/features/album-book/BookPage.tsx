'use client';

import type { FrameId } from '@/features/album-style/theme';
import { formatDate, formatDayLabel } from '@/lib/format';
import type { AlbumPage, StoryInsertion } from '@/lib/paginate';
import {
  PAGE_LAYOUTS,
  resolveRotation,
  type PageLayoutId,
  type PhotoAdjustment,
  type TiltMode,
} from '@/types/page';

import type { PageSide } from './bookGeometry';
import { LayoutPicker } from './LayoutPicker';
import { PhotoSlot } from './PhotoSlot';
import { StoryPage } from './StoryPage';

export interface BookPageProps {
  page: AlbumPage | null;
  side: PageSide;
  albumName: string;
  albumMeta: { firstDate: Date | null; lastDate: Date | null; photoCount: number };
  caption: string | undefined;
  frame: FrameId;
  tiltMode: TiltMode;
  selectedPhotoId: string | null;
  photoCaptions: Record<string, string>;
  /** Páginas embaixo da folha que está virando não recebem interação. */
  interactive: boolean;
  getAdjustment: (photoId: string) => PhotoAdjustment;
  onAdjust: (photoId: string, patch: Partial<PhotoAdjustment>) => void;
  onSelectPhoto: (photoId: string | null) => void;
  onChangeLayout: (pageKey: string, layoutId: PageLayoutId) => void;
  onChangeCaption: (pageKey: string, caption: string) => void;
  onChangePhotoCaption: (photoId: string, caption: string) => void;
  onChangeStory: (
    id: string,
    patch: Partial<Pick<StoryInsertion, 'title' | 'body'>>,
  ) => void;
  onRemoveStory: (id: string) => void;
}

const PAPER_TEXTURE =
  'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.5), transparent 45%), radial-gradient(circle at 82% 78%, rgba(0,0,0,0.05), transparent 55%)';

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

  // Sem página: nada mesmo. É isso que deixa o álbum fechado com uma folha só.
  if (!page) return null;

  const isHardCover = page.kind === 'cover' || page.kind === 'back';

  if (isHardCover) {
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
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center opacity-70">
            <span className="text-[11px] tracking-[0.3em]">FIM DA VIAGEM</span>
            <span className="text-[10px] opacity-70">
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

  if (page.kind === 'inside-cover') {
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

  if (page.kind === 'blank') {
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
  const emptySlots = Math.max(0, layout.capacity - page.photos.length);
  const dayLabel = page.date ? formatDayLabel(page.date) : '';

  return (
    <div
      className={`group/page relative flex h-full w-full flex-col overflow-hidden ${rounded}`}
      style={paperStyle}
      onPointerDown={() => interactive && props.onSelectPhoto(null)}
    >
      <header className="flex items-start justify-between gap-2 px-5 pt-4">
        <div className="min-w-0">
          {page.dayNumber !== null && (
            <p
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ color: 'var(--paper-accent)' }}
            >
              Dia {page.dayNumber}
              {page.totalPagesOfDay > 1 &&
                ` · ${page.pageOfDay}/${page.totalPagesOfDay}`}
            </p>
          )}
          <input
            value={props.caption ?? ''}
            onChange={(event) => props.onChangeCaption(page.key, event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            disabled={!interactive}
            placeholder={dayLabel}
            aria-label="Legenda da página"
            className="w-full truncate border-0 bg-transparent text-sm outline-none placeholder:text-current placeholder:opacity-35"
          />
        </div>

        {interactive && (
          <div className="shrink-0 opacity-0 transition focus-within:opacity-100 group-hover/page:opacity-100">
            <LayoutPicker
              value={page.layoutId}
              onChange={(layoutId) => props.onChangeLayout(page.key, layoutId)}
            />
          </div>
        )}
      </header>

      <div
        className={`grid min-h-0 flex-1 gap-1 px-3 pb-1 pt-2 ${layout.gridClassName}`}
      >
        {page.photos.map((photo, index) => (
          <PhotoSlot
            key={photo.id}
            photo={photo}
            adjustment={props.getAdjustment(photo.id)}
            rotation={resolveRotation(
              photo.id,
              props.getAdjustment(photo.id),
              props.tiltMode,
            )}
            frame={props.frame}
            caption={props.photoCaptions[photo.id] ?? ''}
            isSelected={interactive && props.selectedPhotoId === photo.id}
            interactive={interactive}
            className={layout.slotClassNames[index] ?? ''}
            onSelect={props.onSelectPhoto}
            onAdjust={props.onAdjust}
            onCaptionChange={props.onChangePhotoCaption}
          />
        ))}

        {Array.from({ length: emptySlots }, (_, index) => (
          <div
            key={`empty-${index}`}
            className={`m-2 rounded-[3px] border border-dashed opacity-25 ${
              layout.slotClassNames[page.photos.length + index] ?? ''
            }`}
            style={{ borderColor: 'var(--paper-ink-soft)' }}
          />
        ))}
      </div>

      <footer className="flex items-center justify-between px-5 pb-3 text-[10px] opacity-30">
        <span>{side === 'left' ? page.number : ''}</span>
        <span>{side === 'right' ? page.number : ''}</span>
      </footer>

      <GutterShadow side={side} />
    </div>
  );
}
