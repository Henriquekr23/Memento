'use client';

import { useEffect, useState } from 'react';

import { getBrowserSupabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

import { nameOf } from './name';

/** O que a interface precisa saber sobre quem está logado. Nada além disso. */
export interface SessionUser {
  id: string;
  email: string;
  /** Nome escolhido no cadastro. Vazio em contas criadas antes disso existir. */
  name: string;
}

/**
 * Quem está logado, do lado do navegador.
 *
 * Usa `getSession`, que lê o cookie local — **não** é uma ida à rede, então a
 * barra de navegação não custa uma requisição por página. `onAuthStateChange`
 * mantém as abas em dia: entrar numa aba atualiza a barra da outra.
 *
 * O `null` inicial não é "deslogado", é "ainda não sei" — daí o `isLoading`.
 * Sem ele, a barra piscaria "Entrar" por um quadro para quem já tem sessão.
 */
export function useSessionUser(): { user: SessionUser | null; isLoading: boolean } {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getBrowserSupabase();
    let active = true;

    function apply(session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) {
      if (!active) return;
      setUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? '',
              name: nameOf(session.user),
            }
          : null,
      );
      setIsLoading(false);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => apply(null));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session),
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
