# Segurança e privacidade — Memento (Fase 1)

Revisão do estado atual: aplicação **100% client-side**, sem backend, sem banco,
sem autenticação e sem nenhum dado saindo da máquina do usuário.

## Modelo de ameaças

O ponto de partida é entender que **não existe "segredo do servidor" para
proteger**. Não há API, não há chave, não há sessão, não há dado de outro
usuário para vazar. Tudo que o código faz acontece na aba do usuário, com
arquivos que ele mesmo escolheu.

Isso muda o que importa proteger. As ameaças reais desta fase são:

| Ameaça | Situação |
| --- | --- |
| Fotos vazarem para um servidor | Nenhum código de rede no app; bloqueado também por CSP (`connect-src 'self'`) |
| Script de terceiro exfiltrar dados | Sem CDN, sem analytics, sem fontes externas; CSP restringe origem de tudo |
| XSS por texto do usuário | React escapa por padrão; sem `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou `new Function` |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Vazamento de localização ao compartilhar | Coordenadas exatas fora do índice exportado (ver abaixo) |
| Sobrar dado em computador compartilhado | Nada é persistido: sem `localStorage`, `sessionStorage`, IndexedDB ou cookie |
| Arquivo malicioso derrubar a aba | Validação de tipo + limite de 80 MB por arquivo |

## O que foi verificado

> Última revisão completa refeita depois das funcionalidades de depósito,
> reordenação de páginas e páginas em branco. Nada novo entrou que fale com a
> rede, guarde dados ou execute conteúdo dinâmico.

Buscas no código-fonte, todas sem ocorrência:

- `fetch(`, `XMLHttpRequest`, `WebSocket`, `import(` dinâmico — **nenhuma**
- `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` — **nenhuma**
- `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function` — **nenhuma**
- `process.env` no código do cliente — **nenhuma** (não há `.env` no projeto)
- `target="_blank"` sem `rel="noopener"` — **nenhum** (não há link externo)
- URLs de terceiros embutidas no código — **nenhuma**
- `npm audit --omit=dev` — **0 vulnerabilidades**
- Dependências diretas: 9, todas de front (`@dnd-kit/*`, `exifr`, `jszip`,
  `next`, `react`, `react-dom`). `@dnd-kit/modifiers` foi removido nesta
  revisão por não estar em uso — dependência sem uso é superfície de ataque de
  graça.

Nada roda no servidor: não há rota de API, Server Action nem middleware. O
único código de servidor é o pré-render estático da página.

## Controles implementados

### Cabeçalhos de segurança (`next.config.ts`)

> Aplicados **só em produção**. A CSP protege o app publicado; no servidor de
> desenvolvimento ela só acrescenta modos de falha (HMR, overlay de erro, e o
> `upgrade-insecure-requests` quebrando o acesso pela URL de rede que o Next
> também expõe). Para conferir: `npm run build && npm start`.

- **CSP** com `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`. É o que transforma "nenhuma
  foto sai da sua máquina" numa garantia do navegador e não numa promessa: nem
  uma dependência comprometida conseguiria enviar as imagens para fora.
- `img-src`/`media-src` aceitam `blob:` porque as prévias são object URLs
  geradas localmente a partir dos próprios arquivos.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster`.
- `Permissions-Policy` desligando câmera, microfone, geolocalização, pagamento,
  USB, serial e MIDI — o app não usa nada disso.
- `poweredByHeader: false` (menos impressão digital do stack).

### Privacidade dos metadados

Fotos de celular carregam GPS. O `indice.txt` do ZIP **não** escreve mais a
coordenada exata: registra apenas que a foto tem GPS no EXIF. O ZIP é
justamente o arquivo que a pessoa compartilha, e um índice em texto puro com a
localização de cada foto é o jeito mais fácil de vazar onde ela mora. Quem
precisa do dado continua tendo ele dentro do EXIF da própria foto.

> Ponto em aberto, para você decidir: a exportação copia o arquivo original,
> com EXIF completo (GPS, modelo da câmera, número de série em algumas marcas).
> Se o álbum for feito para publicar, o certo seria oferecer um "exportar sem
> metadados". Isso exige reescrever os bytes da imagem (canvas ou piexif) e
> perde qualidade se for recomprimir — por isso não entrou sem você pedir.

### Robustez da importação

- Validação por MIME **e** por extensão (HEIC costuma vir sem MIME).
- Limite de 80 MB por arquivo: tudo é processado na aba, e um arquivo absurdo
  (ou malformado se passando por imagem) trava a aba inteira em vez de só
  falhar. Arquivos recusados são informados na tela, não silenciados.
- Leitura em lotes de 4 para não travar a interface.
- `parseExif` nunca lança: arquivo corrompido vira metadado vazio.

### Vazamento de memória

Object URLs são revogadas ao remover a foto, limpar o álbum e desmontar o
componente. O download do ZIP revoga a URL **um segundo depois** do clique:
revogar no mesmo tique cancela o download em alguns navegadores.

### O que não pode ir para o cliente

Hoje não existe segredo no projeto (não há `.env`, nem uso de `process.env` no
código). O `.gitignore` cobre `.env*`, chaves (`*.pem`, `*.key`, `*.p12`),
artefatos de build (`.next/`, `out/`, `*.tsbuildinfo`) e material de teste
local (`/local/`, `/fotos-teste/`) — fotos de verdade não devem ir para o
repositório.

A regra que vai importar na Fase 2: **tudo que começa com `NEXT_PUBLIC_` é
embutido no bundle** e fica visível para qualquer visitante. Chave pública do
Supabase pode; `service_role key` nunca — ela ignora RLS e dá acesso total ao
banco. Segredo de verdade só existe em código de servidor (Route Handler,
Server Action ou middleware), nunca em componente marcado com `'use client'`.

## Limitações conhecidas

1. **`'unsafe-inline'` em `script-src`.** O Next injeta o script de bootstrap
   inline e, sem middleware, não há nonce para liberar só ele. É a principal
   fraqueza da CSP hoje. Quando a Fase 2 trouxer middleware, dá para migrar
   para nonce por requisição e remover a exceção.
2. **`'unsafe-inline'` em `style-src`.** Necessário pelos atributos `style` que
   o pré-render coloca no HTML. Risco baixo (não permite execução de script).
3. **Os cabeçalhos dependem de quem serve.** `headers()` vale quando o app é
   servido pelo Next (Vercel/Netlify com runtime Node). Em export estático
   puro, os mesmos cabeçalhos precisam ser configurados no provedor
   (`_headers` na Netlify, `vercel.json` na Vercel).

## O que muda na Fase 2

Ao introduzir Supabase (contas, storage, links públicos), o modelo de ameaças
muda de figura e passa a valer o de sempre:

- **Row Level Security ligada desde a primeira tabela** — sem RLS, a chave
  anônima do Supabase, que é pública por definição, dá acesso ao banco inteiro.
  Esse é o erro clássico de projeto com Supabase.
- Nunca colocar a `service_role key` no cliente: ela ignora RLS.
- Link público de álbum com token não sequencial e não adivinhável.
- Validar tipo e tamanho **também no servidor**: a validação de hoje é de
  usabilidade, não de segurança — qualquer um pode contornar o cliente.
- Reforçar a CSP com `connect-src` apontando só para o domínio do Supabase.
- Aí sim passa a existir dado de terceiros para proteger, e vale revisar
  novamente este documento.
