/**
 * Especificação de impressão do álbum.
 *
 * Os números não são estimativa: saíram do gabarito R1219 (A5, lombada
 * quadrada) medido no PDF da gráfica — retângulos e linhas vetoriais, não
 * texto. Tudo aqui é função pura em milímetros, sem React e sem DOM, para que
 * a tela, o PDF e os scripts de verificação leiam a mesma régua.
 */

export interface PrintSpec {
  /** Área final, depois do corte. */
  trim: { w: number; h: number };
  /** Sangria em todos os lados do arquivo. */
  bleed: number;
  /** Recuo mínimo do conteúdo a partir do corte. */
  safe: { outer: number; spine: number; top: number; bottom: number };
  /** Faixa colada na parte interna, junto à lombada. */
  glue: number;
  /** Vinco/dobra da capa externa, medido do corte. */
  hinge: number;
  /** Altura mínima que a gráfica aceita para a lombada. */
  spineMin: number;
  /** Recuo da área segura em cada lado da lombada. */
  spineSafe: number;
}

export const SPEC: PrintSpec = {
  trim: { w: 148, h: 210 },
  bleed: 5,
  safe: { outer: 5, spine: 12, top: 5, bottom: 5 },
  glue: 7,
  hinge: 7,
  spineMin: 4,
  spineSafe: 1,
};

/** Retrato é o padrão; paisagem troca largura por altura e nada mais. */
export type Orientation = 'portrait' | 'landscape';

export function trimSize(orientation: Orientation): { w: number; h: number } {
  return orientation === 'landscape'
    ? { w: SPEC.trim.h, h: SPEC.trim.w }
    : { w: SPEC.trim.w, h: SPEC.trim.h };
}

/** Tamanho do arquivo entregue à gráfica: área final mais sangria dos dois lados. */
export function fileSize(orientation: Orientation): { w: number; h: number } {
  const t = trimSize(orientation);
  return { w: t.w + SPEC.bleed * 2, h: t.h + SPEC.bleed * 2 };
}

export interface PaperOption {
  id: PaperId;
  /** Chave de tradução; o nome visível vem do i18n, não daqui. */
  labelKey: string;
  /** Espessura de uma folha, em mm. */
  mm: number;
}

export type PaperId = 'c150' | 'c170' | 'm170' | 'c250';

export const PAPERS: PaperOption[] = [
  { id: 'c150', labelKey: 'paperC150', mm: 0.14 },
  { id: 'c170', labelKey: 'paperC170', mm: 0.16 },
  { id: 'm170', labelKey: 'paperM170', mm: 0.17 },
  { id: 'c250', labelKey: 'paperC250', mm: 0.24 },
];

export const DEFAULT_PAPER: PaperId = 'c170';

export function paperById(id: PaperId): PaperOption {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[1];
}

/** Capa mole envolvendo a lombada — soma aos dois lados do bloco de folhas. */
export const COVER_MM = 0.6;

function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/**
 * Espessura da lombada a partir da contagem de páginas.
 * Páginas são impressas em folhas: duas páginas por folha.
 */
export function spineWidth(pageCount: number, paperMm: number): number {
  const sheets = Math.ceil(pageCount / 2);
  return Math.max(SPEC.spineMin, round(sheets * paperMm + COVER_MM, 2));
}

/**
 * Corpo do texto da lombada.
 * Cabe na área segura (a lombada menos 1 mm de cada lado) e ainda respeita um
 * teto de leitura — passar disso não fica maior, fica apertado.
 */
export function spineTextSize(spine: number, custom: number | null): number {
  if (custom != null) return custom;
  return round(Math.min((spine - SPEC.spineSafe * 2) * 0.85, 4.6), 1);
}

/**
 * Largura útil da lombada, já descontada a área segura.
 *
 * Arredondado a duas casas de propósito: `5.72 - 2` dá 3,7199999999999998 em
 * ponto flutuante, e esse número vira o teto de um controle e o limiar de um
 * aviso na tela. Medida de gráfica não tem cauda binária.
 */
export function spineSafeWidth(spine: number): number {
  return Math.max(0, round(spine - SPEC.spineSafe * 2, 2));
}

/** Luminância relativa (WCAG) — usada para escolher a tinta por contraste real. */
export function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const parts = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(parts[0]) + 0.7152 * f(parts[1]) + 0.0722 * f(parts[2]);
}
