/**
 * O idioma escolhido, guardado fora do React.
 *
 * Por que uma "store" e não `useState` + `useEffect`: o valor vem do
 * localStorage, que é um sistema externo ao React. Ler no efeito e chamar
 * `setState` funciona, mas provoca render em cascata (e o lint do React 19
 * reprova). Com `useSyncExternalStore` o React lê o valor real do cliente
 * direto na hidratação, usando 'pt' como instantâneo do servidor — sem
 * divergência de HTML e sem render extra.
 */

import { isLang, LANG_STORAGE_KEY, type Lang } from './lang';

/** Idioma do primeiro render no servidor: o do conteúdo escrito no HTML. */
const DEFAULT_LANG: Lang = 'pt';

let cached: Lang | null = null;
const listeners = new Set<() => void>();

export function subscribeLang(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Instantâneo no cliente. `cached` mantém a referência estável entre renders. */
export function getLangSnapshot(): Lang {
  if (cached === null) {
    const stored =
      typeof window === 'undefined' ? null : window.localStorage.getItem(LANG_STORAGE_KEY);
    cached = isLang(stored) ? stored : DEFAULT_LANG;
  }
  return cached;
}

export function getLangServerSnapshot(): Lang {
  return DEFAULT_LANG;
}

export function writeLang(next: Lang): void {
  if (cached === next) return;
  cached = next;
  window.localStorage.setItem(LANG_STORAGE_KEY, next);
  // O atributo do <html> é o que leitor de tela e tradutor de página usam.
  document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
  listeners.forEach((notify) => notify());
}
