'use client';

import { useCallback, useMemo, useState } from 'react';

import type { Photo } from '@/types/photo';

import { includedInOrder, pruneExcluded } from './selection';

/**
 * O que está dentro e o que está fora do álbum, ao lado do acervo (`useAlbum`).
 *
 * O acervo sabe de onde a foto veio e em que ordem ela está; este hook só
 * guarda quem foi tirado. Separados de propósito, como acervo e composição:
 * a linha do tempo da etapa 2 precisa mostrar a foto tirada (cinza) e poder
 * devolvê-la, e para isso a foto não pode sumir da lista. Em que quadro ela
 * volta é decisão dos quadros (`album-flow/cells.ts`), não daqui.
 */
export function useAlbumSelection(photos: readonly Photo[]) {
  const [excludedRaw, setExcluded] = useState<ReadonlySet<string>>(() => new Set());

  // Foto que saiu do acervo (álbum descartado) não pode continuar "excluída":
  // o conjunto é podado na leitura, sem efeito nem estado duplicado.
  const excluded = useMemo(() => {
    if (excludedRaw.size === 0) return excludedRaw;
    const pruned = pruneExcluded(excludedRaw, photos);
    return pruned.size === excludedRaw.size ? excludedRaw : pruned;
  }, [excludedRaw, photos]);

  const included = useMemo(() => includedInOrder(photos, excluded), [photos, excluded]);

  const exclude = useCallback((id: string) => {
    setExcluded((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const include = useCallback((id: string) => {
    setExcluded((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => setExcluded(new Set()), []);

  return { excluded, included, exclude, include, reset };
}
