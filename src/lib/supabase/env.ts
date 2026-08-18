/**
 * Configuração do Supabase, num lugar só.
 *
 * O app continua funcionando **sem** estas variáveis: a Fase 1 inteira (montar
 * o álbum e baixar o PDF) roda no navegador e não fala com servidor nenhum.
 * Sem configuração, o que some é a nuvem — o botão de salvar não aparece e as
 * rotas de conta avisam em vez de estourar. Isso mantém o `npm run build`
 * verde em qualquer máquina e preserva a promessa "nenhuma foto sai daqui"
 * para quem clonar o projeto e não quiser back-end.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

/** Bucket privado das fotos. */
export const PHOTOS_BUCKET = 'photos';

/**
 * Validade das URLs assinadas das fotos.
 *
 * Uma hora: tempo de sobra para folhear um álbum inteiro e curto o bastante
 * para que um link copiado da barra de endereços da imagem não vire um link
 * permanente para um arquivo de bucket privado.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function requireSupabaseEnv(): { url: string; key: string } {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local.',
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}
