'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import type { AlbumBookState } from '@/features/album-book/useAlbumBook';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { Photo } from '@/types/photo';

import { saveAlbumToCloud, type SaveProgress } from './saveAlbum';
import { snapshotComposition } from './snapshot';

export interface SaveInput {
  title: string;
  photos: readonly Photo[];
  book: AlbumBookState;
}

/**
 * O gesto "guardar na nuvem" visto pela interface.
 *
 * Espelha `useAlbumExport` de propósito: mesmo formato (`isSaving`,
 * `progress`, `error`), porque para a barra de ferramentas as duas coisas são
 * a mesma — o álbum saindo daqui.
 *
 * A parte não óbvia é o login. Salvar exige conta, mas mandar a pessoa para a
 * tela de login destruiria o álbum montado (ele só existe na memória desta
 * aba). Então, sem sessão, o pedido fica **guardado** e o diálogo de entrar
 * aparece por cima; assim que a sessão existe, `resume()` continua de onde
 * parou, sem que ela precise clicar de novo.
 */
export function useAlbumSave() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const pendingRef = useRef<SaveInput | null>(null);

  const run = useCallback(
    async (input: SaveInput): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      setProgress({ processed: 0, total: input.photos.length });

      try {
        const result = await saveAlbumToCloud({
          title: input.title,
          photos: input.photos,
          composition: snapshotComposition(input.book),
          onProgress: setProgress,
        });

        if (!result.ok) {
          setError(result.error);
          return false;
        }

        // `refresh` antes de navegar: a lista é um server component e, sem
        // isto, apareceria com o cache anterior — sem o álbum recém-salvo.
        router.refresh();
        router.push('/albums');
        return true;
      } finally {
        setIsSaving(false);
        setProgress(null);
      }
    },
    [router],
  );

  const save = useCallback(
    async (input: SaveInput): Promise<boolean> => {
      if (isSaving) return false;
      if (!isSupabaseConfigured) {
        setError('A nuvem não está configurada nesta instalação.');
        return false;
      }

      // A rede pode simplesmente não responder (projeto pausado, offline).
      // Nesse caso tratamos como "sem sessão": o diálogo aparece e o erro real
      // some junto com a tentativa seguinte, que é o que a pessoa vai fazer.
      const user = await getBrowserSupabase()
        .auth.getUser()
        .then(({ data }) => data.user)
        .catch(() => null);

      if (!user) {
        pendingRef.current = input;
        setNeedsAuth(true);
        return false;
      }

      return run(input);
    },
    [isSaving, run],
  );

  /** Chamado pelo diálogo de login assim que a sessão existe. */
  const resume = useCallback(async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setNeedsAuth(false);
    if (pending) await run(pending);
  }, [run]);

  const cancelAuth = useCallback(() => {
    pendingRef.current = null;
    setNeedsAuth(false);
  }, []);

  return { save, resume, cancelAuth, needsAuth, isSaving, progress, error };
}
