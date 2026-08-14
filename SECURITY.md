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
- Dependências diretas: 8, todas de front (`@dnd-kit/*`, `exifr`, `next`,
  `react`, `react-dom`). `@dnd-kit/modifiers` saiu por não estar em uso e
  `jszip` saiu junto com a exportação em ZIP — dependência sem uso é superfície
  de ataque de graça. A exportação em PDF não trouxe nenhuma no lugar: o
  arquivo é montado à mão em `album-export/pdf/pdfWriter.ts`.

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

Fotos de celular carregam GPS, modelo da câmera e, em algumas marcas, número de
série. **O arquivo exportado não leva nada disso.** O PDF é montado a partir de
páginas rasterizadas num canvas: o que entra nele são pixels, e o EXIF do
original não sobrevive à travessia.

Isso resolveu por construção um ponto que estava em aberto enquanto a
exportação era um ZIP de arquivos originais — lá o EXIF ia inteiro, e evitar
isso exigiria reescrever os bytes de cada imagem.

> A contrapartida, que vale registrar: quem quiser as fotos originais de volta
> não as tem pelo Memento. O arquivo de origem continua no computador da
> pessoa, intacto — o app nunca o move nem o altera.

### Robustez da importação

- Validação por MIME **e** por extensão (HEIC costuma vir sem MIME).
- Limite de 80 MB por arquivo: tudo é processado na aba, e um arquivo absurdo
  (ou malformado se passando por imagem) trava a aba inteira em vez de só
  falhar. Arquivos recusados são informados na tela, não silenciados.
- Leitura em lotes de 4 para não travar a interface.
- `parseExif` nunca lança: arquivo corrompido vira metadado vazio.

### Vazamento de memória

Object URLs são revogadas ao remover a foto, limpar o álbum e desmontar o
componente. O download revoga a URL **um segundo depois** do clique: revogar no
mesmo tique cancela o download em alguns navegadores.

A geração do PDF desenha **uma página por vez** e fecha cada `ImageBitmap` logo
depois de usá-la. Com todos os canvas e bitmaps vivos ao mesmo tempo, um álbum
de 200 fotos derruba a aba — e derrubar a aba, aqui, é perder o álbum inteiro,
que não tem persistência nesta fase.

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


## Fase 2 — contas, banco e storage

O que mudou no modelo de ameaças quando o app deixou de ser só client-side.

**Nenhum segredo no servidor.** O app inteiro roda com a *publishable key* do
Supabase, que é pública por design. A `service_role`/`secret key` não é usada em
lugar nenhum — nem para assinar as fotos de um álbum público, que dependem de
uma política de storage e não de chave privilegiada. Não há, portanto, chave a
vazar por `NEXT_PUBLIC_` ou por log de servidor.

**Autorização é RLS, não código do app.** Nenhuma consulta do app filtra por
`user_id`: quem filtra é a política no banco. Um `select` esquecido devolve
zero linhas em vez de devolver o álbum de outra pessoa. As regras estão em
`supabase/schema.sql`, e as tabelas nascem com RLS ligada.

**O original continua sem sair da máquina.** O que sobe é uma cópia
redesenhada em canvas (máx. 2000px, JPEG) — `features/album-save/prepareUpload`.
Como o canvas copia pixels e não metadados, **o EXIF não atravessa**: o GPS de
casa não vai para a nuvem nem para o link compartilhado. A data fica numa coluna
do banco, que o dono apaga junto com o álbum.

**Bucket privado.** Nada é servido por URL pública; toda imagem é URL assinada
com validade de uma hora. Um link de imagem copiado por engano expira.

**Link público é link, não vitrine.** As páginas de álbum saem do índice
(`robots: noindex`) e um id inexistente, privado ou apagado devolve o mesmo 404
— a página não confirma a estranhos que aquele álbum existe.

**CSP.** `connect-src` e `img-src` liberam **a origem exata** do projeto
Supabase (lida de `NEXT_PUBLIC_SUPABASE_URL`), nunca `*.supabase.co`: com o
curinga, uma dependência comprometida poderia mandar as fotos para outro
projeto Supabase qualquer. Sem back-end configurado, a CSP volta a ser a da
Fase 1, com `connect-src 'self'`.

**O que continua em aberto:** `'unsafe-inline'` em `script-src` (agora existe
proxy/middleware, então dá para migrar para nonce) e limite de tamanho por
upload confiado ao bucket (10 MB por arquivo, definido no SQL).
