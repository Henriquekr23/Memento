'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/**
 * `window.location.origin`, sem desencontro de hidratação: no servidor (e no
 * primeiro render do cliente) é vazio, depois o endereço de verdade. Ler
 * `window` direto no render montava um link diferente do HTML do servidor.
 */
export function useOrigin(): string {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => '',
  );
}
