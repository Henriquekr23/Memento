/**
 * Contas da rolagem da landing — funções puras, sem DOM.
 *
 * O herói e a seção "Da bagunça ao álbum" traduzem pixels rolados em
 * progresso (0..1) com as mesmas três peças. Ficam aqui, num arquivo só, para
 * a curva de uma não divergir da curva da outra; `scripts/checkLanding.mts`
 * confere os valores sem abrir navegador.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A mesma curva `--ease-in-out` dos tokens, em forma de função. */
export function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

/**
 * Progresso de um trecho com pausa nas pontas: 20% parado, 60% andando e 20%
 * parado de novo. A pausa é o que deixa cada abertura do livro ser lida — sem
 * ela, a próxima folha já começava a virar enquanto a anterior assentava.
 */
export function seg(p: number, start: number, length: number): number {
  return easeInOutCubic(clamp((p - start - length * 0.2) / (length * 0.6), 0, 1));
}

/** Degrau para `prefers-reduced-motion`: o estado muda, mas sem meio-termo. */
export function step(value: number): number {
  return value >= 0.5 ? 1 : 0;
}
