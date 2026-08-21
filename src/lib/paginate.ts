import {
  PAGE_LAYOUTS,
  PAGE_LAYOUT_IDS,
  type PageLayoutId,
  type SlotRect,
} from '@/types/page';
import type { Photo } from '@/types/photo';

import { toDayKey } from './sortPhotos';

/**
 * Paginação: transforma a lista ordenada de fotos nas páginas do álbum.
 * Função pura — nenhum estado de UI, fácil de testar.
 *
 * Ordem das páginas:
 *   capa · [guarda] · folha de rosto · miolo · contracapa
 *
 * O total é sempre par: a capa fica sozinha à direita no álbum fechado, todo
 * spread do meio tem esquerda e direita, e no fim a contracapa fica sozinha à
 * esquerda (ver bookGeometry).
 *
 * Quando o miolo tem um número par de páginas falta uma para fechar a conta.
 * Essa página entra **no começo**, como guarda logo atrás da capa, e a folha de
 * rosto passa para a página seguinte. Assim nunca sobra página vazia no fim do
 * álbum: a única sem conteúdo é a que fica atrás da capa, que é justamente
 * onde um álbum de verdade tem uma guarda.
 *
 * Regras do miolo:
 * - cada dia começa numa página nova (o álbum "respira" por dia);
 * - a ordem manual é respeitada: se o usuário jogou uma foto de outro dia no
 *   meio, ela abre uma nova sequência em vez de voltar para o dia dela;
 * - `groupKeys` é a exceção: quando o usuário coloca uma foto numa página
 *   específica, ela passa a pertencer àquele grupo mesmo sendo de outro dia;
 * - o layout de cada página pode ser trocado (`layoutOverrides`), e a
 *   quantidade de fotos da página segue a capacidade do layout escolhido.
 */

export type AlbumPageKind =
  | 'cover'
  | 'inside-cover'
  | 'title'
  | 'photos'
  | 'story'
  | 'back';

/**
 * Página escrita pelo usuário.
 *
 * A âncora é o **id de uma foto**, não a chave de uma página: a foto é a única
 * coisa que continua sendo a mesma quando o layout muda, quando a paginação
 * recalcula ou quando o usuário reordena as páginas. A história entra logo
 * depois da página que contém aquela foto.
 */
export interface StoryInsertion {
  id: string;
  /** `'start'` = antes de tudo; senão, o id da foto que a história segue. */
  anchorPhotoId: string;
  title: string;
  body: string;
}

export const STORY_ANCHOR_START = 'start';
/** Âncora especial: a inserção fica sempre no fim do miolo. */
export const STORY_ANCHOR_END = 'end';

/**
 * Página de fotos criada em branco pelo usuário, esperando receber fotos do
 * depósito.
 *
 * Ela não existe enquanto folha de papel no modelo: o que existe é um *grupo*
 * reservado. Enquanto nenhuma foto pertence a esse grupo, a página aparece
 * vazia; assim que a primeira foto entra nele, as fotos passam a formar a
 * página sozinhas e a inserção some de cena. Tirar as fotos de volta faz a
 * página vazia reaparecer.
 */
export interface EmptyPageInsertion {
  id: string;
  /** `'start'` ou o id da foto depois da qual a página entra. */
  anchorPhotoId: string;
}

export function emptyPageGroupKey(insertionId: string): string {
  return `inserted:${insertionId}`;
}

export interface AlbumPage {
  /** Chave estável: guarda layout, legenda e histórias do usuário. */
  key: string;
  kind: AlbumPageKind;
  layoutId: PageLayoutId;
  photos: Photo[];
  /** Grupo ao qual a página pertence (o dia, por padrão). */
  groupKey: string | null;
  dayNumber: number | null;
  date: Date | null;
  pageOfDay: number;
  totalPagesOfDay: number;
  /** Numeração visível — só o miolo é numerado. */
  number: number | null;
  story: StoryInsertion | null;
  /**
   * Primeira página do grupo no álbum — é nela que o diário daquele dia é
   * escrito e lido (ver `dayNotes` na composição).
   *
   * "Primeira do grupo" e não "primeira da sequência": o mesmo dia pode voltar
   * mais adiante, quando o usuário arrasta uma foto dele para outro ponto do
   * álbum. Sem essa distinção, o mesmo texto apareceria repetido em cada
   * reaparição do dia.
   */
  opensGroup: boolean;
  /** Preenchido nas páginas em branco criadas pelo usuário. */
  emptyPageId: string | null;
  /**
   * Foto depois da qual a página entra na ordem. Só existe em páginas
   * inseridas: é o que diz onde encaixar a primeira foto que chegar nelas.
   */
  anchorPhotoId: string | null;
}

/** Máximo de fotos numa página, pelo maior layout disponível. */
export const MAX_PHOTOS_PER_PAGE = Math.max(
  ...PAGE_LAYOUT_IDS.map((id) => PAGE_LAYOUTS[id].capacity),
);

export function defaultLayoutFor(remaining: number): PageLayoutId {
  if (remaining <= 1) return 'single';
  if (remaining === 2) return 'duo-vertical';
  if (remaining === 3) return 'trio';
  return 'quad';
}

/**
 * Menor layout que comporta `count` fotos, preferindo continuar no layout atual
 * quando ele já dá conta. Usado ao trazer uma foto da bandeja para a página.
 */
export function layoutForCount(
  count: number,
  current?: PageLayoutId,
): PageLayoutId {
  if (current && PAGE_LAYOUTS[current].capacity >= count) return current;
  return defaultLayoutFor(count);
}

export function groupKeyOf(
  photo: Photo,
  groupKeys: Readonly<Record<string, string>> = {},
): string {
  return groupKeys[photo.id] ?? toDayKey(photo.timestamp);
}

interface PhotoRun {
  groupKey: string;
  photos: Photo[];
}

/** Agrupa em sequências consecutivas do mesmo grupo, preservando a ordem. */
export function groupConsecutive(
  photos: readonly Photo[],
  groupKeys: Readonly<Record<string, string>> = {},
): PhotoRun[] {
  const runs: PhotoRun[] = [];

  for (const photo of photos) {
    const key = groupKeyOf(photo, groupKeys);
    const current = runs[runs.length - 1];
    if (current && current.groupKey === key) current.photos.push(photo);
    else runs.push({ groupKey: key, photos: [photo] });
  }

  return runs;
}

function emptyPage(key: string, kind: AlbumPageKind): AlbumPage {
  return {
    key,
    kind,
    layoutId: 'single',
    photos: [],
    groupKey: null,
    dayNumber: null,
    date: null,
    pageOfDay: 0,
    totalPagesOfDay: 0,
    number: null,
    story: null,
    opensGroup: false,
    emptyPageId: null,
    anchorPhotoId: null,
  };
}

function storyPage(story: StoryInsertion): AlbumPage {
  return { ...emptyPage(`story:${story.id}`, 'story'), story };
}

function blankPhotoPage(
  insertion: EmptyPageInsertion,
  layoutOverrides: Readonly<Record<string, PageLayoutId>>,
): AlbumPage {
  const key = emptyPageGroupKey(insertion.id);
  return {
    ...emptyPage(key, 'photos'),
    layoutId: layoutOverrides[key] ?? 'quad',
    groupKey: key,
    emptyPageId: insertion.id,
    anchorPhotoId: insertion.anchorPhotoId,
  };
}

export interface BuildAlbumPagesOptions {
  layoutOverrides?: Readonly<Record<string, PageLayoutId>>;
  stories?: readonly StoryInsertion[];
  /** Páginas de fotos criadas em branco pelo usuário. */
  emptyPages?: readonly EmptyPageInsertion[];
  /** Fotos que o usuário colocou à mão numa página de outro grupo. */
  groupKeys?: Readonly<Record<string, string>>;
}

function buildPhotoPages(
  photos: readonly Photo[],
  layoutOverrides: Readonly<Record<string, PageLayoutId>>,
  groupKeys: Readonly<Record<string, string>>,
): AlbumPage[] {
  const runs = groupConsecutive(photos, groupKeys);

  // "Dia 1, 2, 3…" pela ordem cronológica dos grupos, não pela ordem no álbum.
  const dayNumbers = new Map(
    [...new Set(runs.map((run) => run.groupKey))]
      .sort()
      .map((key, index) => [key, index + 1] as const),
  );

  const result: AlbumPage[] = [];
  /** Grupos que já abriram uma vez — o diário pertence à primeira abertura. */
  const opened = new Set<string>();

  runs.forEach((run, runIndex) => {
    const pagesOfRun: AlbumPage[] = [];
    const opensGroup = !opened.has(run.groupKey);
    opened.add(run.groupKey);
    let cursor = 0;
    let indexInRun = 0;

    while (cursor < run.photos.length) {
      const key = `${run.groupKey}@${runIndex}#${indexInRun}`;
      const remaining = run.photos.length - cursor;
      const layoutId = layoutOverrides[key] ?? defaultLayoutFor(remaining);
      const capacity = PAGE_LAYOUTS[layoutId].capacity;

      pagesOfRun.push({
        ...emptyPage(key, 'photos'),
        layoutId,
        photos: run.photos.slice(cursor, cursor + capacity),
        groupKey: run.groupKey,
        dayNumber: dayNumbers.get(run.groupKey) ?? null,
        date: run.photos[cursor].timestamp,
        pageOfDay: indexInRun + 1,
        opensGroup: opensGroup && indexInRun === 0,
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
function groupByAnchor<T extends { anchorPhotoId: string }>(
  items: readonly T[],
): Map<string, T[]> {
  const byAnchor = new Map<string, T[]>();
  for (const item of items) {
    const list = byAnchor.get(item.anchorPhotoId);
    if (list) list.push(item);
    else byAnchor.set(item.anchorPhotoId, [item]);
  }
  return byAnchor;
}

/**
 * Intercala as páginas inseridas pelo usuário — textos e páginas em branco —
 * entre as páginas de fotos, seguindo a foto âncora de cada uma.
 *
 * Quando duas inserções dividem a mesma âncora, o texto vem antes da página em
 * branco. Inserção cuja âncora sumiu (a foto foi para o depósito) vai para o
 * fim em vez de desaparecer: perder o que o usuário criou é inaceitável.
 */
function interleaveInsertions(
  photoPages: readonly AlbumPage[],
  stories: readonly StoryInsertion[],
  emptyPages: readonly EmptyPageInsertion[],
  layoutOverrides: Readonly<Record<string, PageLayoutId>>,
): AlbumPage[] {
  const storiesByAnchor = groupByAnchor(stories);
  const emptyByAnchor = groupByAnchor(emptyPages);

  // Página em branco que já recebeu fotos não é mais "em branco": as próprias
  // fotos formam a página, e renderizar a inserção duplicaria a folha.
  const filledGroups = new Set(
    photoPages.map((page) => page.groupKey).filter(Boolean) as string[],
  );
  const isStillEmpty = (insertion: EmptyPageInsertion) =>
    !filledGroups.has(emptyPageGroupKey(insertion.id));

  const used = new Set<string>();
  const content: AlbumPage[] = [];

  const emitAt = (anchor: string) => {
    for (const story of storiesByAnchor.get(anchor) ?? []) {
      content.push(storyPage(story));
      used.add(story.id);
    }
    for (const insertion of emptyByAnchor.get(anchor) ?? []) {
      used.add(insertion.id);
      if (isStillEmpty(insertion)) {
        content.push(blankPhotoPage(insertion, layoutOverrides));
      }
    }
  };

  emitAt(STORY_ANCHOR_START);

  for (const page of photoPages) {
    content.push(page);
    for (const photo of page.photos) emitAt(photo.id);
  }

  // Ancoradas no fim: entram depois de tudo, aconteça o que acontecer com as
  // fotos. É o que faz "nova página" nascer sempre no fim do álbum.
  emitAt(STORY_ANCHOR_END);

  for (const story of stories) {
    if (!used.has(story.id)) content.push(storyPage(story));
  }
  for (const insertion of emptyPages) {
    if (!used.has(insertion.id) && isStillEmpty(insertion)) {
      content.push(blankPhotoPage(insertion, layoutOverrides));
    }
  }

  return content;
}

export function buildAlbumPages(
  photos: readonly Photo[],
  {
    layoutOverrides = {},
    stories = [],
    emptyPages = [],
    groupKeys = {},
  }: BuildAlbumPagesOptions = {},
): AlbumPage[] {
  const content = interleaveInsertions(
    buildPhotoPages(photos, layoutOverrides, groupKeys),
    stories,
    emptyPages,
    layoutOverrides,
  );

  let number = 0;
  for (const page of content) {
    number += 1;
    page.number = number;
  }

  // Falta uma página para o total fechar par: ela entra atrás da capa, como
  // guarda, e nunca no fim.
  const needsFlyleaf = content.length % 2 === 0;

  return [
    emptyPage('cover', 'cover'),
    ...(needsFlyleaf ? [emptyPage('inside-cover', 'inside-cover')] : []),
    emptyPage('title', 'title'),
    ...content,
    emptyPage('back', 'back'),
  ];
}

/** Páginas que o usuário pode reordenar — capa, guarda e contracapa ficam. */
export function contentPagesOf(pages: readonly AlbumPage[]): AlbumPage[] {
  return pages.filter(
    (page) => page.kind === 'photos' || page.kind === 'story',
  );
}

export interface PageReorder {
  /** Ids das fotos do álbum na nova ordem. */
  photoOrder: string[];
  /** História → nova foto âncora, para o texto seguir a página. */
  storyAnchors: Record<string, string>;
  /** Página em branco → nova foto âncora, pelo mesmo motivo. */
  emptyPageAnchors: Record<string, string>;
}

/**
 * Move uma página do miolo para outra posição.
 *
 * A ordem das fotos continua sendo a fonte de verdade, então reordenar páginas
 * é reescrever essa ordem — e reancorar as histórias na foto que passou a
 * vir antes delas. Função pura: quem chama aplica o resultado no estado.
 */
export function reorderContentPages(
  pages: readonly AlbumPage[],
  fromIndex: number,
  toIndex: number,
): PageReorder {
  const content = contentPagesOf(pages);

  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= content.length ||
    toIndex >= content.length
  ) {
    return { photoOrder: [], storyAnchors: {}, emptyPageAnchors: {} };
  }

  const reordered = [...content];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  const photoOrder: string[] = [];
  const storyAnchors: Record<string, string> = {};
  const emptyPageAnchors: Record<string, string> = {};
  let lastPhotoId = STORY_ANCHOR_START;

  for (const page of reordered) {
    if (page.story) {
      storyAnchors[page.story.id] = lastPhotoId;
      continue;
    }
    if (page.emptyPageId) {
      emptyPageAnchors[page.emptyPageId] = lastPhotoId;
      continue;
    }
    for (const photo of page.photos) {
      photoOrder.push(photo.id);
      lastPhotoId = photo.id;
    }
  }

  return { photoOrder, storyAnchors, emptyPageAnchors };
}

/**
 * Retângulo que a foto ocupa pelo layout da página dela.
 * É o ponto de partida do modo espontâneo: a foto começa a ser movida de onde
 * já estava, em vez de pular para um canto.
 */
export function findSlotRect(
  pages: readonly AlbumPage[],
  photoId: string,
): SlotRect | null {
  for (const page of pages) {
    const index = page.photos.findIndex((photo) => photo.id === photoId);
    if (index === -1) continue;
    const slots = PAGE_LAYOUTS[page.layoutId].slots;
    return slots[index] ?? slots[slots.length - 1] ?? null;
  }
  return null;
}

export function findPageOfPhoto(
  pages: readonly AlbumPage[],
  photoId: string,
): AlbumPage | null {
  return (
    pages.find((page) => page.photos.some((photo) => photo.id === photoId)) ??
    null
  );
}

/** Índice do spread que contém determinada página (ver bookGeometry). */
export function findSpreadOfPhoto(
  pages: readonly AlbumPage[],
  photoId: string,
): number | null {
  const pageIndex = pages.findIndex((page) =>
    page.photos.some((photo) => photo.id === photoId),
  );
  return pageIndex === -1 ? null : Math.ceil(pageIndex / 2);
}
