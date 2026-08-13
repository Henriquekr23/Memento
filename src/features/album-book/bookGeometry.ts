import type { AlbumPage } from '@/lib/paginate';

import type { TurnState } from './usePageTurn';

/**
 * Geometria do livro: dado o spread atual e o estado da virada, decide qual
 * página aparece em cada lugar.
 *
 * É a parte que mais quebra ao mexer no visual, então mora aqui como função
 * pura — dá para testar sem navegador.
 *
 * O spread 0 é o álbum fechado: só a capa, sozinha, à direita. Daí sai a
 * fórmula usada em todo o resto:
 *
 *     esquerda(s) = 2s - 1        direita(s) = 2s
 *
 * No spread 0 a esquerda cai em -1, ou seja, não existe — é exatamente o que
 * queremos. No último spread a direita cai fora do array e a contracapa fica
 * sozinha à esquerda: o álbum fecha do outro lado. Virando para frente a folha
 * da direita gira em torno da lombada e o verso dela vira a esquerda do spread
 * seguinte; para trás é o espelho.
 */

export type PageSide = 'left' | 'right';

export function leftIndexOf(spread: number): number {
  return spread * 2 - 1;
}

export function rightIndexOf(spread: number): number {
  return spread * 2;
}

/** Quantos spreads o álbum tem, contando o fechado. */
export function spreadCountOf(pageCount: number): number {
  return 1 + Math.ceil(Math.max(0, pageCount - 1) / 2);
}

export interface LeafView {
  front: AlbumPage | null;
  back: AlbumPage | null;
  frontSide: PageSide;
  backSide: PageSide;
}

export interface SpreadView {
  leftStatic: AlbumPage | null;
  rightStatic: AlbumPage | null;
  leaf: LeafView | null;
  /** Graus de rotação da folha: negativo vira para a esquerda. */
  angle: number;
  /** 0 = álbum fechado (uma capa só), 1 = aberto. No meio = virando. */
  openness: number;
  /**
   * Quanto deslocar o livro, em % da largura, para a capa visível ficar
   * centralizada. Negativo no começo (capa à direita) e positivo no fim
   * (contracapa à esquerda).
   */
  offset: number;
}

function at(pages: readonly AlbumPage[], index: number): AlbumPage | null {
  return pages[index] ?? null;
}

/** Meia página: o quanto o livro anda para centralizar uma capa isolada. */
const HALF_PAGE_PERCENT = 25;

/**
 * Deslocamento do livro. Fechado, ele aparece centralizado com uma página só;
 * ao virar a capa desliza no mesmo ritmo da folha, e é isso que dá a sensação
 * de abrir (e, no fim, de fechar) o álbum.
 */
function offsetOf(
  spread: number,
  lastSpread: number,
  turn: TurnState | null,
): number {
  const closing = turn?.progress ?? 0;

  if (spread === 0) {
    return -HALF_PAGE_PERCENT * (turn?.direction === 'next' ? 1 - closing : 1);
  }
  if (spread === 1 && turn?.direction === 'prev') {
    return -HALF_PAGE_PERCENT * closing;
  }
  if (spread === lastSpread) {
    return HALF_PAGE_PERCENT * (turn?.direction === 'prev' ? 1 - closing : 1);
  }
  if (spread === lastSpread - 1 && turn?.direction === 'next') {
    return HALF_PAGE_PERCENT * closing;
  }
  return 0;
}

export function resolveSpreadView(
  pages: readonly AlbumPage[],
  spread: number,
  turn: TurnState | null,
): SpreadView {
  const left = leftIndexOf(spread);
  const right = rightIndexOf(spread);
  const offset = offsetOf(spread, spreadCountOf(pages.length) - 1, turn);
  const openness = 1 - Math.abs(offset) / HALF_PAGE_PERCENT;

  if (!turn) {
    return {
      leftStatic: at(pages, left),
      rightStatic: at(pages, right),
      leaf: null,
      angle: 0,
      openness,
      offset,
    };
  }

  if (turn.direction === 'next') {
    return {
      leftStatic: at(pages, left),
      rightStatic: at(pages, right + 2),
      leaf: {
        front: at(pages, right),
        back: at(pages, right + 1),
        frontSide: 'right',
        backSide: 'left',
      },
      angle: -turn.progress * 180,
      openness,
      offset,
    };
  }

  return {
    leftStatic: at(pages, left - 2),
    rightStatic: at(pages, right),
    leaf: {
      front: at(pages, left),
      back: at(pages, left - 1),
      frontSide: 'left',
      backSide: 'right',
    },
    angle: turn.progress * 180,
    openness,
    offset,
  };
}
