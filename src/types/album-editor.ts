/**
 * Modelo do editor de álbum.
 *
 * A regra que separa este arquivo de `types/photo.ts`: aqui mora *composição*
 * (o que vai em que página, onde está o título na capa), lá mora o *acervo*
 * (quais fotos existem, quando cada uma foi tirada). Slot guarda `photoId`,
 * nunca a URL — a URL de preview troca quando o álbum vai para a nuvem, o id
 * gerado no navegador não muda nunca.
 */

import type { PaperId, Orientation } from '@/features/album-print/spec';

/* ── capa ────────────────────────────────────────────────────────────────── */

/** Papel do elemento. O título é único e não pode ser removido: é ele que a
 *  lombada reflete. */
export type CoverElementRole = 'title' | 'free';

export type CoverFontId =
  | 'anton'
  | 'archivo'
  | 'bebas'
  | 'serif'
  | 'grotesk'
  | 'dm';

export type TextAlign = 'left' | 'center' | 'right';

interface CoverElementBase {
  id: string;
  /**
   * Posição do centro do elemento, em % da **área final** — não do arquivo com
   * sangria. Centralizar precisa cair no centro da página impressa; medir a
   * partir do arquivo deixaria tudo 2,5 mm fora do lugar.
   */
  x: number;
  y: number;
  /** Graus. */
  rotation: number;
  /** `null` = herda a tinta pareada da cor do álbum. */
  color: string | null;
}

export interface CoverTextElement extends CoverElementBase {
  kind: 'text';
  role: CoverElementRole;
  text: string;
  /** Largura da caixa de texto, em % da largura da área final. */
  width: number;
  /** Corpo em milímetros — a mesma unidade que a gráfica usa. */
  size: number;
  font: CoverFontId;
  align: TextAlign;
  uppercase: boolean;
  /** Entreletra em centésimos de em (o que a UI mostra como %). */
  tracking: number;
  /** Entrelinha como múltiplo do corpo. */
  leading: number;
}

export type MotifShape =
  | 'eye'
  | 'disc'
  | 'arch'
  | 'stripes'
  | 'waves'
  | 'frame';

export interface CoverMotifElement extends CoverElementBase {
  kind: 'motif';
  shape: MotifShape;
  /** Lado do quadrado, em % da largura da área final. */
  size: number;
}

export type CoverElement = CoverTextElement | CoverMotifElement;

export interface BackCover {
  show: boolean;
  text: string;
}

export type SpineDirection = 'ascending' | 'descending';

export interface SpineConfig {
  show: boolean;
  direction: SpineDirection;
  /** Corpo em mm informado à mão; `null` = calculado pela área segura. */
  size: number | null;
  /** Posição vertical do texto, em % da altura. */
  offset: number;
  showYear: boolean;
  year: string;
  /** Espessura informada pela gráfica; `null` = calculada pelas páginas. */
  mm: number | null;
}

/* ── miolo ───────────────────────────────────────────────────────────────── */

export type EditorLayoutId =
  | 'full'
  | 'inset'
  | 'duoV'
  | 'duoH'
  | 'trio'
  | 'quad'
  | 'text';

export interface EditorLayout {
  id: EditorLayoutId;
  slots: number;
}

/** "Página inteira" é o padrão pedido: a foto sangra até a borda do papel. */
export const EDITOR_LAYOUTS: EditorLayout[] = [
  { id: 'full', slots: 1 },
  { id: 'inset', slots: 1 },
  { id: 'duoV', slots: 2 },
  { id: 'duoH', slots: 2 },
  { id: 'trio', slots: 3 },
  { id: 'quad', slots: 4 },
  { id: 'text', slots: 0 },
];

export const MAX_SLOTS = 4;

export function layoutById(id: EditorLayoutId): EditorLayout {
  return EDITOR_LAYOUTS.find((l) => l.id === id) ?? EDITOR_LAYOUTS[0];
}

/** Quadro de uma página. `photoId` aponta para uma foto do acervo. */
export interface PhotoFrame {
  photoId: string | null;
  /** 1–3. */
  zoom: number;
  /** Deslocamento do enquadramento, em % do quadro. */
  offsetX: number;
  offsetY: number;
}

export interface EditorPage {
  id: string;
  layout: EditorLayoutId;
  /** Só vale na página da esquerda: a foto atravessa a folha inteira. */
  spread: boolean;
  heading: string;
  body: string;
  slots: PhotoFrame[];
}

/* ── álbum ───────────────────────────────────────────────────────────────── */

export interface EditorAlbum {
  name: string;
  orientation: Orientation;
  paper: PaperId;
  /** Id de uma cor da paleta do álbum. */
  color: string;
  elements: CoverElement[];
  back: BackCover;
  spine: SpineConfig;
  pages: EditorPage[];
}

/* ── construtores ────────────────────────────────────────────────────────── */

export function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function emptyFrame(): PhotoFrame {
  return { photoId: null, zoom: 1, offsetX: 0, offsetY: 0 };
}

export function makePage(over: Partial<EditorPage> = {}): EditorPage {
  return {
    id: newId(),
    // `full`: a foto sangra até a borda, como num fotolivro impresso. O que a
    // margem branca resolvia — distinguir a foto da página — passou a ser
    // trabalho do efeito de dobra e das bordas de corte desenhados por cima
    // dela (ver `ae-fold`). Quem quiser a moldura tem o layout `inset`.
    layout: 'full',
    spread: false,
    heading: '',
    body: '',
    slots: Array.from({ length: MAX_SLOTS }, emptyFrame),
    ...over,
  };
}

export function makeText(over: Partial<CoverTextElement> = {}): CoverTextElement {
  return {
    id: newId(),
    kind: 'text',
    role: 'free',
    text: '',
    x: 50,
    y: 50,
    width: 76,
    size: 18,
    font: 'anton',
    align: 'center',
    uppercase: true,
    tracking: -2,
    leading: 0.9,
    rotation: 0,
    color: null,
    ...over,
  };
}

export function makeMotif(over: Partial<CoverMotifElement> = {}): CoverMotifElement {
  return {
    id: newId(),
    kind: 'motif',
    shape: 'eye',
    x: 50,
    y: 22,
    size: 46,
    rotation: 0,
    color: null,
    ...over,
  };
}

/** O título é o único elemento com papel fixo — a lombada lê dele. */
export function titleOf(album: EditorAlbum): CoverTextElement | null {
  const found = album.elements.find(
    (el): el is CoverTextElement => el.kind === 'text' && el.role === 'title',
  );
  return found ?? null;
}
