import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Origem do Supabase, quando configurado.
 *
 * A CSP é montada a partir da variável de ambiente, e não com um curinga
 * `*.supabase.co`: liberar o domínio inteiro permitiria enviar as fotos para
 * *qualquer* projeto Supabase do mundo. Assim o único destino possível é o
 * projeto deste app — e quem não configura back-end nenhum continua com um
 * `connect-src 'self'` puro, como na Fase 1.
 */
function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const supabase = supabaseOrigin();

/**
 * Política de segurança de conteúdo.
 *
 * Só é aplicada em produção, de propósito. A CSP existe para proteger o app
 * publicado; no servidor de desenvolvimento ela só acrescenta modos de falha
 * (HMR, overlay de erro, e o `upgrade-insecure-requests` quebrando o acesso
 * pela URL de rede `http://192.168.x.x:3000` que o Next também expõe).
 *
 * Para conferir os cabeçalhos, rode como em produção:
 *   npm run build && npm start
 *
 * A promessa do produto é "nenhuma foto sai da sua máquina". `connect-src
 * 'self'` é o que transforma essa promessa em algo verificável pelo navegador:
 * mesmo que uma dependência comprometida tentasse enviar as imagens para
 * qualquer lugar, o navegador bloqueia a requisição.
 *
 * `blob:` em img-src/media-src é obrigatório: as prévias são object URLs
 * geradas localmente a partir dos arquivos escolhidos pelo usuário.
 *
 * Ponto fraco conhecido: `'unsafe-inline'` em script-src. O Next injeta o
 * script de bootstrap inline e, sem middleware, não há nonce para liberar só
 * ele. Quando a Fase 2 trouxer middleware, dá para migrar para nonce e tirar
 * essa exceção.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Fase 2: as fotos salvas voltam como URL assinada do Storage. Sem
  // back-end configurado, nada é acrescentado aqui.
  `img-src 'self' blob: data:${supabase ? ` ${supabase}` : ''}`,
  "media-src 'self' blob:",
  "font-src 'self'",
  // Sem `wss:`: nada aqui usa realtime. Se um dia usar, acrescente.
  `connect-src 'self'${supabase ? ` ${supabase}` : ''}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Permissions-Policy',
    // O app não precisa de nenhuma dessas capacidades — desligar reduz o
    // estrago possível de qualquer script de terceiro que entre no bundle.
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), midi=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    if (isDev) return [];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
