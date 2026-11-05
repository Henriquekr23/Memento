/**
 * O herói "o álbum é a página", em números — sem DOM e sem React.
 *
 * Entra o progresso da rolagem dentro do herói (0..1); sai o quanto cada folha
 * já virou, a ordem de empilhamento delas e a opacidade de cada camada de tom
 * do fundo. `useHeroAlbumVars` só escreve o resultado em variáveis CSS.
 */

import { clamp, seg, step } from '../scrollMath';

/** Capa + 3 folhas. A página-base da direita (o mosaico) não vira. */
export const LEAVES = 4;

/** Um tom de fundo por estado do livro: fechado + uma por abertura. */
export const TINT_LAYERS = LEAVES + 1;

/** Abaixo disto a soma das folhas é considerada "álbum aberto até o fim". */
const FINISHED_EPSILON = 0.02;

export interface HeroState {
  /** Quanto cada folha virou: 0 = deitada à direita (ou embaixo), 1 = virada. */
  f: number[];
  /**
   * `z-index` de cada folha. Antes da metade da virada, a de índice menor fica
   * por cima (é a página de cima da pilha da direita); depois, a de índice
   * maior fica por cima (é a última que caiu na pilha da esquerda).
   */
  z: number[];
  /** Opacidade das camadas de tom, de baixo (0) para cima. */
  tints: number[];
  /** Todas as folhas viradas: libera menu, logo à esquerda e botões. */
  finished: boolean;
}

/** Pixels rolados dentro do herói → progresso 0..1. */
export function heroProgress(scrolledInHero: number, pinLength: number): number {
  if (pinLength <= 0) return 0;
  return clamp(scrolledInHero / pinLength, 0, 1);
}

export function heroState(p: number, reduced: boolean): HeroState {
  const f = Array.from({ length: LEAVES }, (_, i) => {
    const v = seg(p, i / LEAVES, 1 / LEAVES);
    return reduced ? step(v) : v;
  });

  const z = f.map((v, i) => (v >= 0.5 ? 40 + i : 30 - i));

  // A soma (0..4, contínua) diz entre quais tons o fundo está. A camada 0 fica
  // sempre acesa, a camada do estado atual também, e a seguinte acende na
  // proporção do caminho — empilhar opacidades de cor sólida é o que deixa a
  // troca de cor ser só `opacity`, que o compositor anima sem repintar.
  const sum = f.reduce((a, b) => a + b, 0);
  const current = Math.min(TINT_LAYERS - 1, Math.floor(sum));
  const k = sum - current;
  const tints = Array.from({ length: TINT_LAYERS }, (_, t) =>
    t === 0 || t === current ? 1 : t === current + 1 ? k : 0,
  );

  return { f, z, tints, finished: sum >= LEAVES - FINISHED_EPSILON };
}

/**
 * Onde a rolagem precisa estar para a abertura `opening` (1..4) ficar parada
 * na tela. A folha `i` vira entre `i/4 + 0,05` e `i/4 + 0,2`, então a abertura
 * seguinte fica quieta até `(i+1)/4 + 0,05` — o meio dessa pausa é `(i+1)/4`.
 * A âncora `#como-funciona` e o foco nos botões do fim usam isto para chegar
 * numa página legível, e não no meio de uma folha virando.
 */
export function spreadProgress(opening: number): number {
  return clamp(opening / LEAVES, 0, 1);
}

/**
 * Quanto do caminho até o alvo o livro anda por quadro de 60 fps. Com 0,12 a
 * folha acompanha a rolagem com um leve atraso — o que faz a rodinha do mouse,
 * que anda em degraus, virar movimento contínuo.
 */
const FOLLOW_PER_FRAME = 0.12;
/**
 * Velocidade máxima, em progresso por milissegundo: o livro inteiro (0 → 1)
 * leva pelo menos 1,6 s, e cada virada pelo menos ~240 ms. Sem esse teto, uma
 * rolagem rápida pulava de uma abertura para outra num quadro só.
 */
const MAX_SPEED = 1 / 1600;
/** Perto disto do alvo, o livro chega e o laço de quadros pode parar. */
const SNAP = 0.0004;

/**
 * Um passo do progresso mostrado em direção ao progresso da rolagem.
 *
 * A rolagem diz para onde o livro vai; isto diz quanto ele anda neste quadro:
 * aproxima uma fração do que falta (suavização exponencial, corrigida pelo
 * tempo real do quadro — 30 e 120 fps dão o mesmo movimento) e nunca mais
 * rápido que `MAX_SPEED`.
 */
export function followProgress(shown: number, target: number, dtMs: number): number {
  const gap = target - shown;
  if (Math.abs(gap) <= SNAP) return target;
  const frames = Math.max(0, dtMs) / (1000 / 60);
  const eased = gap * (1 - Math.pow(1 - FOLLOW_PER_FRAME, frames));
  const limit = MAX_SPEED * Math.max(0, dtMs);
  const next = shown + clamp(eased, -limit, limit);
  return Math.abs(target - next) <= SNAP ? target : next;
}
