import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireSupabaseEnv } from './env';

/**
 * Cliente do servidor (server components e server actions).
 *
 * Um por requisição — ele carrega os cookies daquela requisição, então guardar
 * em módulo vazaria a sessão de um usuário para outro.
 *
 * `getAll`/`setAll` são obrigatórios: são eles que deixam o `@supabase/ssr`
 * renovar o token de acesso escrevendo os cookies de volta. Escrever cookie a
 * cookie deixa a sessão dessincronizada entre servidor e navegador.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server component não pode escrever cookie. Tudo bem: o middleware
          // já renovou a sessão nesta mesma requisição.
        }
      },
    },
  });
}

/** Usuário da requisição, ou `null`. Nunca lança. */
export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
