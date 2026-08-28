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

/**
 * Como a foto ocupa o quadro.
 *
 * `cover` preenche o quadro e recorta o excesso; `contain` mostra a foto
 * inteira e deixa o papel aparecer em volta. Os dois são só o **encaixe de
 * partida**: o zoom multiplica a partir dele e o arraste escolhe o pedaço, com
 * os limites calculados pelo tamanho real da imagem (ver `frameCrop.ts`).
 */
export type FrameFit = 'cover' | 'contain';

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
  /** Encaixe de partida da foto no quadro. */
  fit: FrameFit;
  /** Escala sobre o encaixe. 1 = o encaixe puro. */
  zoom: number;
  /**
   * Deslocamento do enquadramento, em % do **lado desenhado da foto** — não do
   * quadro. É a mesma régua que o PDF usa (`drawCovered`), e é ela que deixa o
   * limite ser calculado sem saber o tamanho do quadro em pixels: o quanto
   * sobra da foto para fora do quadro é uma razão, não um número de tela.
   *
   * O valor guardado nunca é podado: quem desenha é que o limita ao que aquele
   * zoom permite (`clampOffset`). Assim afastar e voltar a aproximar devolve o
   * enquadramento que a pessoa tinha escolhido, em vez de esquecê-lo.
   */
  offsetX: number;
  offsetY: number;
}

/** Fundo da caixa de texto — o que deixa uma legenda legível sobre a foto. */
export type TextBackdrop = 'none' | 'paper' | 'shade';

/**
 * Um bloco de texto solto na página: legenda, frase sobre a foto, título no
 * alto. É um só mecanismo para os três — o que muda entre eles é a posição, o
 * corpo e a ordem em relação à foto, não a natureza da peça.
 */
export interface PageTextBlock {
  id: string;
  text: string;
  /** Centro da caixa, em % da **área final** (o retângulo depois do corte). */
  x: number;
  y: number;
  /** Largura da caixa, em % da largura da área final. */
  width: number;
  /** Corpo em milímetros — a mesma unidade da capa e da gráfica. */
  size: number;
  font: CoverFontId;
  align: TextAlign;
  /** `null` = herda a tinta pareada da cor do álbum. */
  color: string | null;
  uppercase: boolean;
  /** Entrelinha como múltiplo do corpo. */
  leading: number;
  /** Entreletra em centésimos de em (o que a UI mostra como %). */
  tracking: number;
  rotation: number;
  /** Atrás das fotos, em vez de por cima delas. */
  behind: boolean;
  backdrop: TextBackdrop;
}

export interface EditorPage {
  id: string;
  layout: EditorLayoutId;
  /** Só vale na página da esquerda: a foto atravessa a folha inteira. */
  spread: boolean;
  /**
   * Preenchimento total: os quadros vão até a borda do papel, sem margem
   * branca, inclusive quando a página está dividida em vários. Desligado, a
   * página volta a ter a margem de 10 mm (12 mm do lado da lombada).
   */
  fill: boolean;
  /** Respiro entre quadros, em milímetros. 0 = quadros encostados. */
  gap: number;
  heading: string;
  body: string;
  slots: PhotoFrame[];
  textBlocks: PageTextBlock[];
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
  /** Numeração impressa no pé da página. Ligada por padrão. */
  showPageNumbers: boolean;
  pages: EditorPage[];
}

/* ── construtores ────────────────────────────────────────────────────────── */

export function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function emptyFrame(): PhotoFrame {
  return { photoId: null, fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 };
}

/** Deslocamento e zoom de volta ao começo, mantendo o encaixe escolhido. */
export function resetFraming(fit: FrameFit = 'cover'): Partial<PhotoFrame> {
  return { fit, zoom: 1, offsetX: 0, offsetY: 0 };
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
    // Preenchimento total é o padrão também quando a página se divide: quatro
    // fotos sangradas continuam sendo uma página de fotolivro; quatro fotos
    // com margem branca em volta são uma folha de contato.
    fill: true,
    gap: 0,
    heading: '',
    body: '',
    slots: Array.from({ length: MAX_SLOTS }, emptyFrame),
    textBlocks: [],
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

export function makeTextBlock(over: Partial<PageTextBlock> = {}): PageTextBlock {
  return {
    id: newId(),
    text: '',
    x: 50,
    y: 50,
    width: 72,
    size: 5,
    font: 'dm',
    align: 'center',
    color: null,
    uppercase: false,
    leading: 1.35,
    tracking: 0,
    rotation: 0,
    behind: false,
    backdrop: 'none',
    ...over,
  };
}

/**
 * Os três lugares que um texto ocupa numa página de álbum. São **partidas**,
 * não formatos fechados: nascido o bloco, tudo nele continua editável e ele
 * anda para onde a pessoa arrastar.
 */
export type TextBlockPreset = 'caption' | 'overlay' | 'header';

export function makePresetTextBlock(preset: TextBlockPreset): PageTextBlock {
  if (preset === 'overlay') {
    return makeTextBlock({
      y: 50,
      width: 78,
      size: 13,
      font: 'anton',
      uppercase: true,
      tracking: -2,
      leading: 0.92,
      color: '#FFFFFF',
      backdrop: 'shade',
    });
  }
  if (preset === 'header') {
    return makeTextBlock({
      y: 12,
      width: 80,
      size: 6,
      font: 'grotesk',
      align: 'left',
      leading: 1.15,
    });
  }
  // Legenda: rente ao pé da área segura, discreta, sobre papel ou sobre foto.
  return makeTextBlock({
    y: 88,
    width: 76,
    size: 3.6,
    font: 'dm',
    leading: 1.4,
    color: '#FFFFFF',
    backdrop: 'shade',
  });
}

/** O título é o único elemento com papel fixo — a lombada lê dele. */
export function titleOf(album: EditorAlbum): CoverTextElement | null {
  const found = album.elements.find(
    (el): el is CoverTextElement => el.kind === 'text' && el.role === 'title',
  );
  return found ?? null;
}
