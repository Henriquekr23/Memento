import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * Renova a sessão a cada requisição.
 *
 * O token de acesso do Supabase dura uma hora. Sem este passo ele expira e o
 * usuário é deslogado no meio do uso — server components não podem escrever
 * cookies, então o middleware é o único lugar da requisição capaz de gravar o
 * token renovado.
 *
 * Duas regras que parecem detalhe e não são:
 * 1. os cookies têm de ser escritos **na request e na response** — a request
 *    para que o server component desta mesma requisição já veja a sessão nova;
 * 2. a response devolvida tem de ser a que recebeu os cookies. Criar outra
 *    depois (um `NextResponse.redirect`, por exemplo) sem copiar os cookies
 *    desloga o usuário silenciosamente.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Não remova: é esta chamada que dispara a renovação do token.
  await supabase.auth.getUser();

  return response;
}
