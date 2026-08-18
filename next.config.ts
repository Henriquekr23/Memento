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
 * Ponto fraco conhecido, e assumido: `'unsafe-inline'` em script-src. O Next
 * injeta inline o script de bootstrap e os dados de hidratação. Dá para
 * trocar por nonce agora que existe o `proxy`, mas o nonce muda a cada
 * requisição — e um cabeçalho que muda a cada requisição obriga toda página a
 * ser renderizada sob demanda, incluindo a landing e a "Sobre", que hoje são
 * estáticas. O que se ganharia é defesa contra *execução* de um XSS; o que
 * este app oferece a um XSS é pouco: nenhum `dangerouslySetInnerHTML`, nenhum
 * `eval`, nenhum HTML de usuário renderizado — todo texto passa pelo escape do
 * React. Reavaliar se algum dia entrar conteúdo rico (markdown, HTML colado).
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
  "manifest-src 'self'",
  "object-src 'none'",
  // O app não embute nada: sem `frame-src`, um `<iframe>` injetado herdaria o
  // `default-src 'self'` e ainda poderia carregar uma rota do próprio site.
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  {
    // Dois anos, subdomínios inclusos. Sem isto, a primeira visita digitada
    // como `memento…` sai em HTTP e é interceptável antes do redirecionamento
    // — e é justamente nessa requisição que o cookie de sessão viaja.
    // `upgrade-insecure-requests` na CSP cobre o que a página pede; o HSTS
    // cobre a navegação até ela.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
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
