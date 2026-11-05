/**
 * Geometria da seção "Da bagunça ao álbum" — funções puras, sem DOM.
 *
 * Cada foto tem três lugares possíveis, todos dados pelo **centro** da foto em
 * pixels do palco (o palco é escalado inteiro depois, então estes números não
 * dependem do tamanho da janela):
 *
 *   pilha  → bagunçada, girada, cada uma num canto;
 *   dia    → organizada, reta e menor, na coluna do dia em que foi tirada;
 *   álbum  → dentro do livro aberto, na ordem entre as organizadas.
 *
 * A passagem pilha → dia é uma transição CSS no elemento externo da foto; a
 * passagem dia → álbum é o elemento interno, deslocado por `--q` (a rolagem).
 * Por isso o deslocamento até o álbum é dividido pela escala do dia: o interno
 * herda a escala do externo.
 *
 * Desktop e celular têm números próprios (o celular empilha a seção e usa
 * fotos menores); os dois conjuntos saem daqui, e o CSS escolhe qual vale por
 * media query — assim o servidor já manda a página certa, sem esperar o
 * JavaScript descobrir a largura da tela.
 */

import type { DayGroup } from '@/lib/sortPhotos';

import { clamp, easeInOutCubic, step } from '../scrollMath';

export type OrganizeLayout = 'desktop' | 'mobile';

export interface Size {
  w: number;
  h: number;
}

/** Centro, giro (graus) e escala de uma foto. */
export interface Pose {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

interface OrganizeGeometry {
  /** Área das fotos, em px antes da escala do palco. */
  stage: Size;
  /** Foto inteira (com a moldura branca) no tamanho da pilha. */
  photo: Size;
  /** Canto superior esquerdo + giro de cada foto bagunçada. */
  pile: readonly (readonly [number, number, number])[];
  /** Deslocamento do canto superior esquerdo até o centro, na pilha. */
  pileOffset: { x: number; y: number };
  dayScale: number;
  albumScale: number;
  /** Colunas de dias por linha. */
  dayColumns: number;
  /** Largura de uma coluna de dia e altura de uma linha de dias. */
  dayCell: Size;
  /** Distância vertical entre a 1ª e a 2ª foto de um mesmo dia. */
  dayStep: number;
  /** Centro da 1ª foto do 1º dia. */
  dayOrigin: { x: number; y: number };
  /** Onde fica o rótulo do 1º dia ("sáb 14"). */
  labelOrigin: { x: number; y: number };
  /** O livro aberto do fim: posição, tamanho e largura de uma página. */
  album: { x: number; y: number; w: number; h: number; pageW: number };
  /** Centro da 1ª foto da página esquerda e o passo entre colunas e linhas. */
  albumOrigin: { x: number; y: number };
  albumStep: { x: number; y: number };
}

/** O que a grade comporta: 4 × 2 dias, 2 fotos por dia, 2 páginas de 6. */
export const ORGANIZE_CAPACITY = { days: 8, perDay: 2, perPage: 6, pages: 2 } as const;

/**
 * Ordem de empilhamento na pilha (`z-index`), por foto. Igual nos dois
 * layouts: é ela que decide quais fotos ficam por cima no monte.
 */
export const PILE_Z = [7, 3, 10, 1, 5, 12, 2, 8, 11, 4, 9, 6] as const;

export const GEOMETRY: Record<OrganizeLayout, OrganizeGeometry> = {
  desktop: {
    stage: { w: 700, h: 680 },
    photo: { w: 220, h: 165 },
    pile: [
      [250, 240, -8], [90, 120, 6], [400, 100, -4], [300, 400, 11],
      [60, 360, -13], [450, 280, 7], [190, 70, -2], [470, 440, -9],
      [140, 240, 14], [360, 190, -12], [210, 450, 4], [30, 210, -5],
    ],
    pileOffset: { x: 110, y: 82.5 + 20 },
    dayScale: 0.62,
    albumScale: 0.582,
    dayColumns: 4,
    dayCell: { w: 176, h: 300 },
    dayStep: 114,
    dayOrigin: { x: 68.2, y: 20 + 34 + 51.15 },
    labelOrigin: { x: 0, y: 20 },
    album: { x: 30, y: 110, w: 640, h: 430, pageW: 320 },
    albumOrigin: { x: 30 + 24 + 64, y: 110 + 52 + 48 },
    albumStep: { x: 144, y: 112 },
  },
  mobile: {
    stage: { w: 342, h: 400 },
    photo: { w: 150, h: 113 },
    pile: [
      [100, 140, -8], [20, 40, 7], [180, 20, -5], [130, 260, 11],
      [10, 230, -12], [190, 170, 6], [80, 10, -3], [190, 280, -9],
      [50, 130, 13], [160, 100, -11], [90, 280, 4], [0, 120, -6],
    ],
    pileOffset: { x: 75, y: 56.5 },
    dayScale: 0.5,
    albumScale: 0.45,
    dayColumns: 4,
    dayCell: { w: 88, h: 176 },
    dayStep: 62.5,
    dayOrigin: { x: 39.5, y: 20 + 18 + 28.25 },
    labelOrigin: { x: 2, y: 20 },
    album: { x: 6, y: 90, w: 330, h: 222, pageW: 165 },
    albumOrigin: { x: 6 + 12 + 33.75, y: 90 + 30 + 25.3 },
    albumStep: { x: 73.5, y: 57 },
  },
};

/** Uma foto já posicionada na viagem: em que dia (0..7) e em que vaga do dia (0..1). */
export interface DayItem<T> {
  photo: T;
  day: number;
  k: number;
}

/**
 * Achata os grupos por dia (`groupPhotosByDay`) em itens com dia e vaga.
 * O que passa da capacidade da grade fica de fora — e não se sobrepõe a outra
 * foto. Com a viagem de exemplo isso nunca acontece; com as fotos da própria
 * pessoa (Fase 2) é quem chama que escolhe as que entram.
 */
export function indexByDay<T extends { timestamp: Date }>(groups: readonly DayGroup<T>[]): DayItem<T>[] {
  return groups.slice(0, ORGANIZE_CAPACITY.days).flatMap((group, day) =>
    group.photos.slice(0, ORGANIZE_CAPACITY.perDay).map((photo, k) => ({ photo, day, k })),
  );
}

export function pilePose(g: OrganizeGeometry, index: number): Pose {
  const [x, y, rotate] = g.pile[index % g.pile.length];
  return { x: x + g.pileOffset.x, y: y + g.pileOffset.y, rotate, scale: 1 };
}

export function dayPose(g: OrganizeGeometry, day: number, k: number): Pose {
  const col = day % g.dayColumns;
  const row = Math.floor(day / g.dayColumns);
  return {
    x: col * g.dayCell.w + g.dayOrigin.x,
    y: row * g.dayCell.h + g.dayOrigin.y + k * g.dayStep,
    rotate: 0,
    scale: g.dayScale,
  };
}

export function dayLabelPosition(g: OrganizeGeometry, day: number): { x: number; y: number } {
  return {
    x: (day % g.dayColumns) * g.dayCell.w + g.labelOrigin.x,
    y: Math.floor(day / g.dayColumns) * g.dayCell.h + g.labelOrigin.y,
  };
}

/** Centro da foto de posição `rank` entre as organizadas: 2 colunas × 3 linhas por página. */
export function albumPose(g: OrganizeGeometry, rank: number): Pose {
  const page = rank < ORGANIZE_CAPACITY.perPage ? 0 : 1;
  const i = rank % ORGANIZE_CAPACITY.perPage;
  return {
    x: g.albumOrigin.x + page * g.album.pageW + (i % 2) * g.albumStep.x,
    y: g.albumOrigin.y + Math.floor(i / 2) * g.albumStep.y,
    rotate: 0,
    scale: g.albumScale,
  };
}

export interface Placement {
  /** Pose do elemento externo (anima por `transition` quando muda). */
  outer: Pose;
  z: number;
  /**
   * Deslocamento do elemento interno no fim da rolagem (`--q` = 1), já em px
   * do elemento externo. `null` para foto não organizada: ela some em vez de
   * entrar no álbum.
   */
  toAlbum: { dx: number; dy: number; k: number } | null;
}

/**
 * Onde cada foto está, dado quais já foram organizadas. A posição no álbum é
 * a ordem cronológica **entre as organizadas** — organizar uma foto do meio
 * empurra as seguintes uma vaga para a frente, o que não aparece na tela
 * porque o deslocamento até o álbum é multiplicado por `--q`, que vale 0
 * enquanto a pessoa está organizando.
 */
export function placePhotos(
  g: OrganizeGeometry,
  items: readonly { day: number; k: number }[],
  placed: readonly boolean[],
): Placement[] {
  let rank = 0;
  return items.map((item, index) => {
    if (!placed[index]) {
      return { outer: pilePose(g, index), z: PILE_Z[index % PILE_Z.length], toAlbum: null };
    }
    const day = dayPose(g, item.day, item.k);
    const album = albumPose(g, rank++);
    return {
      outer: day,
      z: 20 + index,
      toAlbum: {
        dx: (album.x - day.x) / g.dayScale,
        dy: (album.y - day.y) / g.dayScale,
        k: g.albumScale / g.dayScale - 1,
      },
    };
  });
}

/** O rótulo de um dia só aparece quando **todas** as fotos daquele dia estão no lugar. */
export function completeDays(
  items: readonly { day: number }[],
  placed: readonly boolean[],
  dayCount: number,
): boolean[] {
  return Array.from({ length: dayCount }, (_, day) =>
    items.every((item, index) => item.day !== day || placed[index]),
  );
}

/** Onde a rolagem começa e quanto dura a passagem dos dias para o álbum. */
const PHASE: Record<OrganizeLayout, { start: number; length: number }> = {
  desktop: { start: 400, length: 900 },
  mobile: { start: 300, length: 700 },
};

export interface OrganizePhase {
  /** Progresso já suavizado — vai para `--q`. */
  q: number;
  /** O livro aparecendo, mais rápido que as fotos (`--qa`). */
  qa: number;
  /** A troca do texto da direita (`--qt`). */
  qt: number;
  /** Qual bloco de texto recebe cliques. */
  album: boolean;
}

/** Pixels rolados dentro da seção → as três variáveis da fase "vira álbum". */
export function organizePhase(scrolled: number, layout: OrganizeLayout, reduced: boolean): OrganizePhase {
  const { start, length } = PHASE[layout];
  let raw = clamp((scrolled - start) / length, 0, 1);
  if (reduced) raw = step(raw);
  const qt = clamp((raw - 0.3) / 0.4, 0, 1);
  return { q: easeInOutCubic(raw), qa: clamp(raw * 1.6, 0, 1), qt, album: qt > 0.5 };
}

/** Rolagem que deixa cada fase parada na tela (para o foco do teclado levar até ela). */
export function phaseScroll(layout: OrganizeLayout, album: boolean): number {
  const { start, length } = PHASE[layout];
  return album ? start + length + 100 : 0;
}

/** `transform` do elemento externo, a partir de uma pose. */
export function poseTransform(pose: Pose): string {
  return `translate(${round(pose.x)}px, ${round(pose.y)}px) rotate(${pose.rotate}deg) scale(${pose.scale})`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
