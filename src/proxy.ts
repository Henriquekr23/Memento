import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/**
 * O `proxy` (o antigo `middleware`, renomeado no Next 16) existe por um motivo
 * só: manter o token de sessão fresco.
 * Proteção de rota é decidida em cada página (server component), onde dá para
 * redirecionar já sabendo para onde voltar depois do login.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos o que nunca carrega sessão: arquivos estáticos, imagens
     * otimizadas e os ícones da marca. Rodar o proxy neles seria uma
     * chamada de rede por arquivo — em página com dezenas de fotos, isso pesa.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
