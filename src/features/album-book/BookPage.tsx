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
import { DayNote } from './DayNote';
import { PageControls } from './PageControls';
import { PhotoSlot } from './PhotoSlot';
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
  /** Ponteiro que não paira: o que dependia de hover precisa de outro gatilho. */
  isTouch: boolean;
  selectedPhotoId: string | null;
  photoCaptions: Record<string, string>;
  /** Diário de viagem, indexado pela chave do grupo de dia. */
  dayNotes: Record<string, string>;
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
  onChangeDayNote: (groupKey: string, text: string) => void;
  onChangeStory: (
    id: string,
    patch: Partial<Pick<StoryInsertion, 'title' | 'body'>>,
  ) => void;
  /** Troca o tipo da página entre fotos e texto. */
  onConvertPage: (page: AlbumPage, to: 'story' | 'photos') => void;
  onSendToTray: (photoId: string) => void;
}

const PAPER_TEXTURE =
  'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.5), transparent 45%), radial-gradient(circle at 82% 78%, rgba(0,0,0,0.05), transparent 55%)';

/** Prefixos dos alvos de drop de uma página: a folha inteira e cada vaga. */
export const PAGE_DROP_PREFIX = 'page:';
export const SLOT_DROP_PREFIX = 'slot:';

/**
 * Chave da página a partir de um id de drop, seja da folha ou de uma vaga.
 * A vaga tem alvo próprio para o `closestCenter` não preferir a foto vizinha
 * quando o usuário mira justamente no espaço em branco.
 */
export function pageKeyFromDropId(id: string): string | null {
  if (id.startsWith(PAGE_DROP_PREFIX)) return id.slice(PAGE_DROP_PREFIX.length);
  if (id.startsWith(SLOT_DROP_PREFIX)) {
    // slot:<pageKey>#<índice>
    return id.slice(SLOT_DROP_PREFIX.length).split('#')[0] || null;
  }
  return null;
}

/** Vaga livre do layout: decorativa e, ao mesmo tempo, alvo de drop. */
function EmptySlot({
  pageKey,
  index,
  slot,
  disabled,
}: {
  pageKey: string;
  index: number;
  slot: SlotRect;
  disabled: boolean;
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${SLOT_DROP_PREFIX}${pageKey}#${index}`,
    disabled,
  });

  const isTarget = isOver && active !== null;

  return (
    <div
      ref={setNodeRef}
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
        className={[
          'h-full w-full rounded-[3px] border border-dashed transition',
          isTarget ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] opacity-100' : 'opacity-25',
        ].join(' ')}
        style={{
          borderColor: isTarget ? undefined : 'var(--paper-ink-soft)',
        }}
      />
    </div>
  );
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
  // Vale tanto para foto vinda do depósito quanto para foto que está mudando
  // de página — as duas terminam entrando nesta folha.
  const isTarget = isOver && active !== null;

  return (
    <div ref={setNodeRef} className="relative min-h-0 flex-1">
      {isTarget && (
        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-2 z-50 rounded-lg border-2 border-dashed',
            isFull ? 'border-red-400/70 bg-red-500/10' : 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]',
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

/**
 * Onde e quando os controles da página aparecem.
 *
 * No mouse: canto superior direito, revelados pelo hover — a página fica limpa
 * e eles surgem onde o cursor já está.
 *
 * No toque não há hover, então o gatilho passa a ser a escolha de uma foto
 * **desta** página: quem tocou numa foto está editando esta folha. Página sem
 * foto nenhuma não tem como ser escolhida, e ali eles ficam à vista.
 *
 * E no toque eles mudam de lugar: descem para logo abaixo do cabeçalho,
 * centralizados. A pílula tem seis botões e, no canto de uma folha de 390px,
 * cobria a legenda da página inteira; no rodapé da folha ela ficava abaixo da
 * dobra, e só aparecia para quem já tivesse rolado. Aqui ela cobre a borda de
 * cima da primeira foto — e só enquanto essa foto está escolhida.
 */
function controlsClassOf(
  isTouch: boolean,
  isPageSelected: boolean,
  hasPhotos: boolean,
): string {
  if (!isTouch) {
    return 'absolute right-4 top-3 z-10 opacity-0 transition focus-within:opacity-100 group-hover/page:opacity-100';
  }
  const base = 'absolute left-1/2 top-[52px] z-10 -translate-x-1/2 transition';
  return isPageSelected || !hasPhotos
    ? `${base} opacity-100`
    : `${base} pointer-events-none opacity-0`;
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
              {albumName || 'Meu álbum'}
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
              GUARDE A MEMÓRIA
            </span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span
              className="h-px w-10"
              style={{ background: 'var(--cover-accent)', opacity: 0.5 }}
            />
            <span className="text-[11px] tracking-[0.3em] opacity-70">
              FIM DO ÁLBUM
            </span>
            <span className="text-[10px] opacity-45">
              Memento · Guarde a memória
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
            {albumName || 'Meu álbum'}
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
        {interactive && (
          <div className={controlsClassOf(props.isTouch, false, false)}>
            <PageControls
              variant="text"
              onChangeVariant={(variant) => {
                if (variant !== 'text') props.onConvertPage(page, 'photos');
              }}
            />
          </div>
        )}

        <StoryPage
          story={page.story}
          interactive={interactive}
          onChange={props.onChangeStory}
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
  const isPageSelected = page.photos.some(
    (photo) => photo.id === props.selectedPhotoId,
  );
  const controlsClass = controlsClassOf(
    props.isTouch,
    isPageSelected,
    page.photos.length > 0,
  );

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
          className={[
            'w-full select-text truncate border-0 bg-transparent text-[13px] leading-6 outline-none transition-[padding] duration-200 placeholder:text-current placeholder:opacity-35',
            // O recuo só existe para não colidir com a pílula de controles. No
            // toque ela mora no rodapé, então a legenda usa a linha inteira.
            props.isTouch ? 'pr-0' : 'pr-0 group-hover/page:pr-24',
          ].join(' ')}
        />

      </header>

      {/* O diário só na página que abre o dia: é o texto do dia inteiro, não
          desta folha. Nas outras páginas do mesmo dia ele nem é renderizado. */}
      {page.opensGroup && page.groupKey && (
        <DayNote
          groupKey={page.groupKey}
          value={props.dayNotes[page.groupKey] ?? ''}
          interactive={interactive}
          onChange={props.onChangeDayNote}
        />
      )}

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
                isTouch={props.isTouch}
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

          {page.photos.length === 0 && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-xs opacity-45">
              Página em branco — traga fotos do depósito
            </p>
          )}

          {!isFree &&
            layout.slots.slice(page.photos.length).map((slot, index) => (
              <EmptySlot
                key={`empty-${index}`}
                pageKey={page.key}
                index={page.photos.length + index}
                slot={slot}
                disabled={!interactive}
              />
            ))}
        </div>
      </PageDropArea>

      <footer className="flex items-center justify-between px-5 pb-3 text-[10px] opacity-30">
        <span>{side === 'left' ? page.number : ''}</span>
        <span>{side === 'right' ? page.number : ''}</span>
      </footer>

      {/* Filho direto da folha, e não do cabeçalho: `<header>` é `relative`, e
          de dentro dele o "ancorar no rodapé" do modo toque ancorava no rodapé
          do próprio cabeçalho — a pílula voltava para cima da legenda.
          Fora do fluxo em qualquer caso: no fluxo, ela roubava a largura do
          campo de legenda e a data ficava cortada. */}
      {interactive && (
        <div className={controlsClass}>
          <PageControls
            variant={page.layoutId}
            onChangeVariant={(variant) => {
              if (variant === 'text') props.onConvertPage(page, 'story');
              else props.onChangeLayout(page.key, variant);
            }}
            composeMode={composeMode}
            onToggleComposeMode={() =>
              props.onChangeComposeMode(page.key, isFree ? 'aligned' : 'free')
            }
          />
        </div>
      )}

      <GutterShadow side={side} />
    </div>
  );
}
