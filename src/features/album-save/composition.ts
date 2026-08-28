/**
 * A composição do álbum como documento — o que vai para a coluna `composition`
 * e o que volta dela.
 *
 * Funções puras, sem React e sem Supabase: dá para testar com `tsx` como as
 * outras de `lib/`, e é o único ponto que precisa mudar quando a UI ganhar um
 * campo novo. É aqui que mora a migração de versão.
 *
 * Por que um JSON e não colunas: são ids de foto, posições em milímetros e
 * elementos de capa — a interface é a única que sabe interpretá-los, nenhuma
 * consulta filtra ou ordena por eles, e cada ajuste de layout viraria uma
 * migração de banco.
 */

import {
  DEFAULT_PAPER,
  PAPERS,
  type Orientation,
  type PaperId,
} from '@/features/album-print/spec';
import { ALBUM_COLORS, COVER_FONTS, DEFAULT_COLOR } from '@/features/album-editor/palette';
import { emptyAlbum } from '@/features/album-editor/emptyAlbum';
import { MOTIF_SHAPES } from '@/features/album-editor/motifPaths';
import {
  EDITOR_LAYOUTS,
  MAX_SLOTS,
  emptyFrame,
  makePage,
  newId,
  type CoverElement,
  type CoverFontId,
  type EditorAlbum,
  type EditorLayoutId,
  type EditorPage,
  type FrameFit,
  type MotifShape,
  type PageTextBlock,
  type PhotoFrame,
  type TextAlign,
  type TextBackdrop,
} from '@/types/album-editor';

/**
 * Versão 2: a composição passou a guardar o álbum inteiro (capa, lombada e
 * páginas explícitas) em vez de ajustes sobre páginas derivadas da ordem das
 * fotos. Sobe de novo quando o formato mudar de um jeito que exija conversão.
 */
export const COMPOSITION_VERSION = 2;

export interface AlbumComposition {
  version: number;
  album: EditorAlbum;
}

export const EMPTY_COMPOSITION: AlbumComposition = {
  version: COMPOSITION_VERSION,
  album: emptyAlbum(),
};

// ── Leitura defensiva ──────────────────────────────────────────────────────
// O JSON vem do banco, então vem do passado: pode ter sido escrito por uma
// versão anterior do app. Nada aqui lança — campo estranho é campo ignorado, e
// um álbum antigo abre com o padrão em vez de dar tela branca.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min?: number, max?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const COLOR_IDS = ALBUM_COLORS.map((color) => color.id);
const PAPER_IDS = PAPERS.map((paper) => paper.id) as PaperId[];
const FONT_IDS = COVER_FONTS.map((font) => font.id) as CoverFontId[];
const LAYOUT_IDS = EDITOR_LAYOUTS.map((layout) => layout.id) as EditorLayoutId[];
const ALIGNS: TextAlign[] = ['left', 'center', 'right'];
const FITS: FrameFit[] = ['cover', 'contain'];
const BACKDROPS: TextBackdrop[] = ['none', 'paper', 'shade'];

function coverElement(value: unknown): CoverElement | null {
  if (!isRecord(value)) return null;

  const base = {
    id: str(value.id) || newId(),
    x: num(value.x, 50, -50, 150),
    y: num(value.y, 50, -50, 150),
    rotation: num(value.rotation, 0, -360, 360),
    color: typeof value.color === 'string' ? value.color : null,
  };

  if (value.kind === 'motif') {
    return {
      ...base,
      kind: 'motif',
      shape: oneOf<MotifShape>(value.shape, MOTIF_SHAPES, 'eye'),
      size: num(value.size, 46, 1, 200),
    };
  }

  return {
    ...base,
    kind: 'text',
    role: value.role === 'title' ? 'title' : 'free',
    text: str(value.text),
    width: num(value.width, 76, 5, 100),
    size: num(value.size, 18, 1, 200),
    font: oneOf<CoverFontId>(value.font, FONT_IDS, 'anton'),
    align: oneOf<TextAlign>(value.align, ALIGNS, 'center'),
    uppercase: bool(value.uppercase, true),
    tracking: num(value.tracking, 0, -50, 100),
    leading: num(value.leading, 1, 0.5, 3),
  };
}

function frame(value: unknown): PhotoFrame {
  if (!isRecord(value)) return emptyFrame();
  return {
    photoId: typeof value.photoId === 'string' ? value.photoId : null,
    fit: oneOf<FrameFit>(value.fit, FITS, 'cover'),
    zoom: num(value.zoom, 1, 0.5, 4),
    offsetX: num(value.offsetX, 0, -100, 100),
    offsetY: num(value.offsetY, 0, -100, 100),
  };
}

function textBlock(value: unknown): PageTextBlock | null {
  if (!isRecord(value)) return null;
  return {
    id: str(value.id) || newId(),
    text: str(value.text),
    x: num(value.x, 50, -50, 150),
    y: num(value.y, 50, -50, 150),
    width: num(value.width, 72, 5, 100),
    size: num(value.size, 5, 1, 100),
    font: oneOf<CoverFontId>(value.font, FONT_IDS, 'dm'),
    align: oneOf<TextAlign>(value.align, ALIGNS, 'center'),
    color: typeof value.color === 'string' ? value.color : null,
    uppercase: bool(value.uppercase, false),
    leading: num(value.leading, 1.35, 0.5, 3),
    tracking: num(value.tracking, 0, -50, 100),
    rotation: num(value.rotation, 0, -360, 360),
    behind: bool(value.behind, false),
    backdrop: oneOf<TextBackdrop>(value.backdrop, BACKDROPS, 'none'),
  };
}

function page(value: unknown): EditorPage {
  if (!isRecord(value)) return makePage();
  const slots = Array.isArray(value.slots) ? value.slots : [];
  const blocks = Array.isArray(value.textBlocks) ? value.textBlocks : [];
  return {
    id: str(value.id) || newId(),
    layout: oneOf<EditorLayoutId>(value.layout, LAYOUT_IDS, 'full'),
    spread: bool(value.spread, false),
    // Página **nova** nasce com preenchimento total (`makePage`), mas página
    // salva antes de o campo existir não pode mudar de cara ao ser reaberta:
    // quem montou uma grade com margem branca guardou aquilo, não isto.
    fill: bool(value.fill, false),
    gap: num(value.gap, 0, 0, 30),
    heading: str(value.heading),
    body: str(value.body),
    textBlocks: blocks
      .map(textBlock)
      .filter((block): block is PageTextBlock => block !== null),
    // Sempre `MAX_SLOTS` quadros: trocar de layout não pode perder a foto que
    // estava no quadro 4 só porque o layout novo tem três.
    slots: Array.from({ length: MAX_SLOTS }, (_, i) => frame(slots[i])),
  };
}

function editorAlbum(value: unknown): EditorAlbum {
  const fallback = emptyAlbum();
  if (!isRecord(value)) return fallback;

  const elements = Array.isArray(value.elements)
    ? value.elements.map(coverElement).filter((el): el is CoverElement => el !== null)
    : [];

  // Sem título não há o que refletir na lombada: o padrão entra de volta.
  const hasTitle = elements.some((el) => el.kind === 'text' && el.role === 'title');
  if (!hasTitle) elements.unshift(...fallback.elements);

  const pages = Array.isArray(value.pages) && value.pages.length > 0
    ? value.pages.map(page)
    : fallback.pages;

  const back = isRecord(value.back) ? value.back : {};
  const spine = isRecord(value.spine) ? value.spine : {};

  return {
    name: str(value.name),
    orientation: oneOf<Orientation>(value.orientation, ['portrait', 'landscape'], 'portrait'),
    paper: oneOf<PaperId>(value.paper, PAPER_IDS, DEFAULT_PAPER),
    color: oneOf(value.color, COLOR_IDS, DEFAULT_COLOR),
    elements,
    back: { show: bool(back.show, false), text: str(back.text) },
    showPageNumbers: bool(value.showPageNumbers, true),
    spine: {
      show: bool(spine.show, true),
      direction: spine.direction === 'descending' ? 'descending' : 'ascending',
      size: typeof spine.size === 'number' ? num(spine.size, 4, 1, 40) : null,
      offset: num(spine.offset, 50, 0, 100),
      showYear: bool(spine.showYear, false),
      year: str(spine.year),
      mm: typeof spine.mm === 'number' ? num(spine.mm, 4, 1, 100) : null,
    },
    pages,
  };
}

/**
 * Nunca lança. JSON inválido vira composição vazia.
 *
 * Álbum salvo na versão 1 (páginas derivadas da ordem das fotos, tema de capa
 * de couro/linho, ajustes por foto) não tem equivalente no modelo novo: as
 * fotos continuam lá, na ordem em que foram salvas, e o editor as recoloca
 * cronologicamente ao abrir. O que se perde são os ajustes finos daquele
 * formato — é o preço de trocar o modelo, e perder o álbum inteiro seria pior.
 */
export function parseComposition(value: unknown): AlbumComposition {
  if (!isRecord(value)) return EMPTY_COMPOSITION;

  const version = num(value.version, COMPOSITION_VERSION);
  if (version < 2 || !isRecord(value.album)) {
    return { version: COMPOSITION_VERSION, album: emptyAlbum() };
  }

  return { version: COMPOSITION_VERSION, album: editorAlbum(value.album) };
}

/**
 * Remove dos quadros toda foto que não vai ser salva.
 *
 * As fotos que ficaram de fora não sobem para o Storage; sem esta limpeza, o
 * JSON apontaria para imagens que não existem do outro lado e os quadros
 * abririam vazios sem explicação.
 */
export function pruneComposition(
  composition: AlbumComposition,
  keptPhotoIds: readonly string[],
): AlbumComposition {
  const kept = new Set(keptPhotoIds);
  return {
    ...composition,
    album: {
      ...composition.album,
      pages: composition.album.pages.map((item) => ({
        ...item,
        slots: item.slots.map((slot) =>
          slot.photoId && !kept.has(slot.photoId) ? { ...slot, photoId: null } : slot,
        ),
      })),
    },
  };
}

/** Ids das fotos usadas em alguma página — quem precisa subir para o Storage. */
export function photoIdsInComposition(composition: AlbumComposition): string[] {
  const ids = new Set<string>();
  for (const item of composition.album.pages) {
    for (const slot of item.slots) {
      if (slot.photoId) ids.add(slot.photoId);
    }
  }
  return [...ids];
}
