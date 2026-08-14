'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireSupabaseEnv } from './env';

/**
 * Cliente do navegador.
 *
 * Só é usado para o que precisa acontecer na máquina do usuário: o upload das
 * fotos vai direto daqui para o Storage, sem passar pelo servidor do Next. Isso
 * não é otimização prematura — é o que mantém o app dentro do free tier da
 * Vercel, onde o corpo de uma requisição de servidor é limitado a alguns MB e
 * um álbum tem dezenas de fotos.
 *
 * Tudo que é leitura ou escrita de metadados acontece no servidor.
 */
let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (cached) return cached;
  const { url, key } = requireSupabaseEnv();
  cached = createBrowserClient(url, key);
  return cached;
}
