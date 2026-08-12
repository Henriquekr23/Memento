import { PAGE_LAYOUTS, type PageLayoutId } from '@/types/page';
import type { Photo } from '@/types/photo';

import { buildTripDayIndex, toDayKey } from './sortPhotos';

/**
 * Paginação: transforma a lista ordenada de fotos nas páginas do álbum.
 * Função pura — nenhum estado de UI, fácil de testar.
 *
 * Ordem das páginas:
 *   capa · verso da capa · miolo (fotos e histórias) · [folha em branco] · contracapa
 *
 * O total é sempre ímpar de propósito: a capa fica sozinha à direita no álbum
 * fechado, e a partir daí todo spread tem esquerda e direita (ver bookGeometry).
 *
 * Regras do miolo:
 * - cada dia da viagem começa numa página nova (o álbum "respira" por dia);
 * - a ordem manual é respeitada: se o usuário jogou uma foto de outro dia no
 *   meio, ela abre uma nova sequência em vez de voltar para o dia dela;
 * - o layout de cada página pode ser trocado (`layoutOverrides`), e a
 *   quantidade de fotos da página segue a capacidade do layout escolhido.
 */

export type AlbumPageKind =
  | 'cover'
  | 'inside-cover'
  | 'photos'
  | 'story'
  | 'blank'
  | 'back';

/** Página escrita pelo usuário, ancorada a uma página de fotos. */
export interface StoryInsertion {
  id: string;
  /** `'start'` = antes de tudo; senão, a `key` da página de fotos anterior. */
  anchorKey: string;
  title: string;
  body: string;
}

export interface AlbumPage {
  /** Chave estável: guarda layout, legenda e histórias do usuário. */
  key: string;
  kind: AlbumPageKind;
  layoutId: PageLayoutId;
  photos: Photo[];
  dayNumber: number | null;
  date: Date | null;
  pageOfDay: number;
  totalPagesOfDay: number;
  /** Numeração visível — só o miolo é numerado. */
  number: number | null;
  story: StoryInsertion | null;
}

export function defaultLayoutFor(remaining: number): PageLayoutId {
  if (remaining <= 1) return 'single';
  if (remaining === 2) return 'duo-vertical';
  if (remaining === 3) return 'trio';
  return 'quad';
}

interface DayRun {
  dayKey: string;
  photos: Photo[];
}

/** Agrupa em sequências consecutivas do mesmo dia, preservando a ordem manual. */
export function groupConsecutiveByDay(photos: readonly Photo[]): DayRun[] {
  const runs: DayRun[] = [];

  for (const photo of photos) {
    const dayKey = toDayKey(photo.timestamp);
    const current = runs[runs.length - 1];
    if (current && current.dayKey === dayKey) current.photos.push(photo);
    else runs.push({ dayKey, photos: [photo] });
  }

  return runs;
}

function blankPage(key: string, kind: AlbumPageKind): AlbumPage {
  return {
    key,
    kind,
    layoutId: 'single',
    photos: [],
    dayNumber: null,
    date: null,
    pageOfDay: 0,
    totalPagesOfDay: 0,
    number: null,
    story: null,
  };
}

function storyPage(story: StoryInsertion): AlbumPage {
  return { ...blankPage(`story:${story.id}`, 'story'), story };
}

export interface BuildAlbumPagesOptions {
  layoutOverrides?: Readonly<Record<string, PageLayoutId>>;
  stories?: readonly StoryInsertion[];
}

function buildPhotoPages(
  photos: readonly Photo[],
  layoutOverrides: Readonly<Record<string, PageLayoutId>>,
): AlbumPage[] {
  const tripDays = buildTripDayIndex(photos);
  const result: AlbumPage[] = [];

  groupConsecutiveByDay(photos).forEach((run, runIndex) => {
    const pagesOfRun: AlbumPage[] = [];
    let cursor = 0;
    let indexInRun = 0;

    while (cursor < run.photos.length) {
      const key = `${run.dayKey}@${runIndex}#${indexInRun}`;
      const remaining = run.photos.length - cursor;
      const layoutId = layoutOverrides[key] ?? defaultLayoutFor(remaining);
      const capacity = PAGE_LAYOUTS[layoutId].capacity;

      pagesOfRun.push({
        ...blankPage(key, 'photos'),
        layoutId,
        photos: run.photos.slice(cursor, cursor + capacity),
        dayNumber: tripDays.get(run.dayKey) ?? null,
        date: run.photos[cursor].timestamp,
        pageOfDay: indexInRun + 1,
      });

      cursor += capacity;
      indexInRun += 1;
    }

    for (const page of pagesOfRun) page.totalPagesOfDay = pagesOfRun.length;
    result.push(...pagesOfRun);
  });

  return result;
}

/**
 * Intercala as páginas de história entre as de fotos.
 * História cuja âncora sumiu (a foto foi removida) vai para o fim em vez de
 * desaparecer — perder texto escrito pelo usuário seria imperdoável.
 */
function interleaveStories(
  photoPages: readonly AlbumPage[],
  stories: readonly StoryInsertion[],
): AlbumPage[] {
  const byAnchor = new Map<string, StoryInsertion[]>();
  for (const story of stories) {
    const list = byAnchor.get(story.anchorKey);
    if (list) list.push(story);
    else byAnchor.set(story.anchorKey, [story]);
  }

  const used = new Set<string>();
  const content: AlbumPage[] = [];

  for (const story of byAnchor.get('start') ?? []) {
    content.push(storyPage(story));
    used.add(story.id);
  }

  for (const page of photoPages) {
    content.push(page);
    for (const story of byAnchor.get(page.key) ?? []) {
      content.push(storyPage(story));
      used.add(story.id);
    }
  }

  for (const story of stories) {
    if (!used.has(story.id)) content.push(storyPage(story));
  }

  return content;
}

export function buildAlbumPages(
  photos: readonly Photo[],
  { layoutOverrides = {}, stories = [] }: BuildAlbumPagesOptions = {},
): AlbumPage[] {
  const content = interleaveStories(
    buildPhotoPages(photos, layoutOverrides),
    stories,
  );

  // Total ímpar: capa sozinha + spreads completos até a contracapa.
  if (content.length % 2 !== 0) content.push(blankPage('blank', 'blank'));

  let number = 0;
  for (const page of content) {
    if (page.kind === 'photos' || page.kind === 'story') {
      number += 1;
      page.number = number;
    }
  }

  return [
    blankPage('cover', 'cover'),
    blankPage('inside-cover', 'inside-cover'),
    ...content,
    blankPage('back', 'back'),
  ];
}

/** Índice do spread que contém determinada foto (ver bookGeometry). */
export function findSpreadOfPhoto(
  pages: readonly AlbumPage[],
  photoId: string,
): number | null {
  const pageIndex = pages.findIndex((page) =>
    page.photos.some((photo) => photo.id === photoId),
  );
  return pageIndex === -1 ? null : Math.ceil(pageIndex / 2);
}
