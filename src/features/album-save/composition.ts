/**
 * A composição do álbum como documento — o que vai para a coluna `composition`
 * e o que volta dela.
 *
 * Funções puras, sem React e sem Supabase: dá para testar com `tsx` como as
 * outras de `lib/`, e é o único ponto que precisa mudar quando a UI ganhar um
 * campo novo (é aqui que se acrescenta a migração de versão).
 *
 * Por que um JSON e não colunas: estas chaves são ids de foto e chaves de
 * página — a interface é a única que sabe interpretá-las, nenhuma consulta
 * filtra ou ordena por elas, e cada ajuste de layout viraria uma migração.
 */

import { DEFAULT_THEME, type AlbumTheme } from '@/features/album-style/theme';
import type { EmptyPageInsertion } from '@/lib/paginate';
import {
  PAGE_LAYOUTS,
  type ComposeMode,
  type PageLayoutId,
  type PhotoAdjustment,
  type PhotoPlacement,
} from '@/types/page';

/** Sobe de 1 quando o formato mudar de um jeito que exija conversão. */
export const COMPOSITION_VERSION = 1;

export interface AlbumComposition {
  version: number;
  layoutOverrides: Record<string, PageLayoutId>;
  /** Legenda por página, indexada pela chave da página. */
  captions: Record<string, string>;
  /** Legenda por foto, indexada pelo id da foto. */
  photoCaptions: Record<string, string>;
  /**
   * Diário de viagem: um texto por **grupo de dia**, indexado pela mesma chave
   * de grupo que a paginação usa (`YYYY-MM-DD`, ou `inserted:<id>` numa página
   * criada à mão).
   *
   * A chave é o grupo, e não a chave da página, porque a chave da página muda
   * quando o layout ou a ordem mudam — o dia, não. Texto escrito para o dia 12
   * continua sendo do dia 12 depois de qualquer remontagem.
   *
   * Escrito inteiramente pelo usuário: nada aqui é gerado pelo app.
   */
  dayNotes: Record<string, string>;
  adjustments: Record<string, PhotoAdjustment>;
  placements: Record<string, PhotoPlacement>;
  composeModes: Record<string, ComposeMode>;
  /** Foto → grupo de página, quando o usuário a colocou numa página à mão. */
  groupKeys: Record<string, string>;
  emptyPages: EmptyPageInsertion[];
  theme: AlbumTheme;
  autoTilt: boolean;
}

export const EMPTY_COMPOSITION: AlbumComposition = {
  version: COMPOSITION_VERSION,
  layoutOverrides: {},
  captions: {},
  photoCaptions: {},
  dayNotes: {},
  adjustments: {},
  placements: {},
  composeModes: {},
  groupKeys: {},
  emptyPages: [],
  theme: DEFAULT_THEME,
  autoTilt: true,
};

// ── Leitura defensiva ──────────────────────────────────────────────────────
// O JSON vem do banco, então vem do passado: pode ter sido escrito por uma
// versão anterior do app. Nada aqui lança — campo estranho é campo ignorado, e
// um álbum antigo abre com o padrão em vez de dar tela branca.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') out[key] = item;
  }
  return out;
}

const LAYOUT_IDS = new Set(Object.keys(PAGE_LAYOUTS));

function layoutMap(value: unknown): Record<string, PageLayoutId> {
  const out: Record<string, PageLayoutId> = {};
  for (const [key, item] of Object.entries(stringMap(value))) {
    if (LAYOUT_IDS.has(item)) out[key] = item as PageLayoutId;
  }
  return out;
}

function composeModeMap(value: unknown): Record<string, ComposeMode> {
  const out: Record<string, ComposeMode> = {};
  for (const [key, item] of Object.entries(stringMap(value))) {
    if (item === 'aligned' || item === 'free') out[key] = item;
  }
  return out;
}

function adjustmentMap(value: unknown): Record<string, PhotoAdjustment> {
  if (!isRecord(value)) return {};
  const out: Record<string, PhotoAdjustment> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    out[key] = {
      focusX: num(item.focusX, 50),
      focusY: num(item.focusY, 50),
      zoom: num(item.zoom, 1),
      rotation: typeof item.rotation === 'number' ? item.rotation : null,
    };
  }
  return out;
}

function placementMap(value: unknown): Record<string, PhotoPlacement> {
  if (!isRecord(value)) return {};
  const out: Record<string, PhotoPlacement> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    out[key] = {
      x: num(item.x, 0),
      y: num(item.y, 0),
      w: num(item.w, 100),
      h: num(item.h, 100),
      z: num(item.z, 1),
    };
  }
  return out;
}

function emptyPages(value: unknown): EmptyPageInsertion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string') return [];
    return [
      {
        id: item.id,
        anchorPhotoId:
          typeof item.anchorPhotoId === 'string' ? item.anchorPhotoId : 'end',
      },
    ];
  });
}

const THEME_VALUES: Record<keyof AlbumTheme, readonly string[]> = {
  cover: ['leather', 'navy', 'linen', 'kraft', 'charcoal', 'burgundy'],
  paper: ['cream', 'white', 'kraft', 'charcoal'],
  frame: ['polaroid', 'corners', 'bleed'],
  font: ['serif', 'sans', 'typewriter', 'handwriting'],
};

function theme(value: unknown): AlbumTheme {
  if (!isRecord(value)) return DEFAULT_THEME;
  const next = { ...DEFAULT_THEME };
  for (const key of Object.keys(THEME_VALUES) as (keyof AlbumTheme)[]) {
    const item = value[key];
    if (typeof item === 'string' && THEME_VALUES[key].includes(item)) {
      // O `as never` é a forma honesta de dizer "já validei contra a lista
      // deste campo" sem um cast por campo.
      next[key] = item as never;
    }
  }
  return next;
}

/** Nunca lança. JSON inválido vira composição vazia. */
export function parseComposition(value: unknown): AlbumComposition {
  if (!isRecord(value)) return EMPTY_COMPOSITION;
  return {
    version: num(value.version, COMPOSITION_VERSION),
    layoutOverrides: layoutMap(value.layoutOverrides),
    captions: stringMap(value.captions),
    photoCaptions: stringMap(value.photoCaptions),
    // Álbum salvo antes do diário existir simplesmente não tem a chave: vira
    // `{}` e abre igual, que é o contrato deste arquivo.
    dayNotes: stringMap(value.dayNotes),
    adjustments: adjustmentMap(value.adjustments),
    placements: placementMap(value.placements),
    composeModes: composeModeMap(value.composeModes),
    groupKeys: stringMap(value.groupKeys),
    // `value.stories` (páginas só de texto) existiu numa versão anterior e é
    // simplesmente ignorado: o diário do dia tomou o lugar dele.
    emptyPages: emptyPages(value.emptyPages),
    theme: theme(value.theme),
    autoTilt: typeof value.autoTilt === 'boolean' ? value.autoTilt : true,
  };
}

/**
 * Remove das chaves tudo que aponta para foto que não vai ser salva.
 *
 * As fotos do depósito não entram no álbum salvo; sem esta limpeza, o JSON
 * cresceria com ajustes de fotos que não existem mais do outro lado.
 * (Não mexe nas chaves de *página* nem nas de *dia*: aquelas são derivadas e se
 * refazem — e, no caso do diário, apagar seria jogar fora texto escrito pelo
 * usuário só porque ele mandou as fotos daquele dia para o depósito por um
 * minuto.)
 */
export function pruneComposition(
  composition: AlbumComposition,
  keptPhotoIds: readonly string[],
): AlbumComposition {
  const kept = new Set(keptPhotoIds);
  const only = <T>(map: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(map).filter(([id]) => kept.has(id)));

  return {
    ...composition,
    photoCaptions: only(composition.photoCaptions),
    adjustments: only(composition.adjustments),
    placements: only(composition.placements),
    groupKeys: only(composition.groupKeys),
    // Âncora perdida vira fim do álbum, e não sumiço: a mesma regra que a
    // paginação já usa quando a foto âncora sai de cena.
    emptyPages: composition.emptyPages.map((page) =>
      kept.has(page.anchorPhotoId) || page.anchorPhotoId === 'start'
        ? page
        : { ...page, anchorPhotoId: 'end' },
    ),
  };
}
