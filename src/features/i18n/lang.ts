/** Idioma do site. Tipo isolado para copy, provider e toggle importarem daqui. */

export type Lang = 'pt' | 'en';

export const LANGS: Lang[] = ['pt', 'en'];

/** Chave do localStorage. A escolha sobrevive à navegação entre páginas. */
export const LANG_STORAGE_KEY = 'memento:lang';

export function isLang(value: unknown): value is Lang {
  return value === 'pt' || value === 'en';
}
