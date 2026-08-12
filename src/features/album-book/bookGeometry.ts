import type { AlbumPage } from '@/lib/paginate';

import type { TurnState } from './useAlbumBook';

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
 * queremos. Virando para frente a folha da direita gira em torno da lombada e
 * o verso dela vira a esquerda do spread seguinte; para trás é o espelho.
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
  /** 0 = álbum fechado (só a capa), 1 = aberto. Valores no meio = virando. */
  openness: number;
}

function at(pages: readonly AlbumPage[], index: number): AlbumPage | null {
  return pages[index] ?? null;
}

/**
 * Quanto o álbum está aberto. Fechado, o livro aparece centralizado com uma
 * página só; ao virar a capa ele desliza para a esquerda no mesmo ritmo da
 * folha, e é isso que dá a sensação de abrir o álbum.
 */
function opennessOf(spread: number, turn: TurnState | null): number {
  if (spread === 0) return turn?.direction === 'next' ? turn.progress : 0;
  if (spread === 1 && turn?.direction === 'prev') return 1 - turn.progress;
  return 1;
}

export function resolveSpreadView(
  pages: readonly AlbumPage[],
  spread: number,
  turn: TurnState | null,
): SpreadView {
  const left = leftIndexOf(spread);
  const right = rightIndexOf(spread);
  const openness = opennessOf(spread, turn);

  if (!turn) {
    return {
      leftStatic: at(pages, left),
      rightStatic: at(pages, right),
      leaf: null,
      angle: 0,
      openness,
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
  };
}
