/** Último valor escrito em cada variável de um nó. */
export type VarCache = Map<string, string>;

/**
 * Escreve variáveis CSS num nó, pulando as que não mudaram.
 *
 * Rolando o rodapé, o herói continua recebendo quadros, e todos repetem o
 * estado final. Reescrever o mesmo valor ainda invalida o estilo da árvore
 * inteira abaixo do nó; com o cache, um quadro sem mudança não toca o DOM.
 */
export function writeVars(node: HTMLElement, cache: VarCache, vars: Record<string, string>): void {
  for (const name in vars) {
    const value = vars[name];
    if (cache.get(name) === value) continue;
    cache.set(name, value);
    node.style.setProperty(name, value);
  }
}

/** `style` do React aceitando variáveis CSS (`{ '--f': 'var(--f0)' }`). */
export type VarStyle = import('react').CSSProperties & Record<`--${string}`, string | number>;
