'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Media query como estado do React.
 *
 * `useSyncExternalStore` em vez de `useEffect` + `useState`: o snapshot do
 * servidor é sempre `false`, então a marcação renderizada no servidor e a
 * primeira do cliente combinam, e o valor real chega no mesmo commit da
 * hidratação — sem o "pisca" de um efeito que só roda depois de pintar.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Abaixo do `md` do Tailwind: onde o spread de duas páginas não cabe mais. */
export const NARROW_QUERY = '(max-width: 767px)';

export function useIsNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY);
}
