'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

import type { Lang } from './lang';
import {
  getLangServerSnapshot,
  getLangSnapshot,
  subscribeLang,
  writeLang,
} from './langStore';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

/**
 * Idioma compartilhado por todas as telas.
 *
 * Antes o estado morava dentro da landing e, com "Sobre" e o rodapé em duas
 * páginas, a escolha se perdia na navegação. Agora vive na store (localStorage)
 * e o provider só distribui — quem quiser o idioma chama `useLang()`.
 */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, getLangServerSnapshot);

  const setLang = useCallback((next: Lang) => writeLang(next), []);
  const toggle = useCallback(() => writeLang(lang === 'pt' ? 'en' : 'pt'), [lang]);

  const value = useMemo(() => ({ lang, setLang, toggle }), [lang, setLang, toggle]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const value = useContext(LangContext);
  if (!value) throw new Error('useLang precisa estar dentro de <LangProvider>.');
  return value;
}
