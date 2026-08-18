# Segurança e privacidade — Memento

Estado atual do app (Fase 2: conta opcional, álbum salvo na nuvem, link
público). Documento vivo — revisar junto com qualquer mudança que toque
autenticação, RLS, storage, cabeçalhos ou redirecionamento.

## Modelo de ameaças

O app tem dois modos e cada um tem um risco diferente.

**Sem conta** (o padrão, e o que a maioria usa): tudo acontece na aba. As fotos
nunca saem da máquina, não existe sessão, não existe dado de outra pessoa. O
que importa proteger é a própria aba — que o app não exfiltre nada e que um
arquivo malformado não derrube o processo.

**Com conta**: passa a existir dado de terceiros, e vale o modelo de sempre.

| Ameaça | Controle |
| --- | --- |
| Fotos vazarem para um servidor qualquer | CSP `connect-src 'self' <origem-do-supabase>` — origem exata, nunca `*.supabase.co` |
| Ler o álbum de outra pessoa | RLS no Postgres e no Storage; nenhuma rota do app decide autorização sozinha |
| Escrever no álbum de outra pessoa | RLS + `.eq('user_id', …)` nas escritas; caminho de storage conferido no servidor |
| Redirecionamento aberto no login | `src/lib/safeNext.ts` — só caminho interno, e resistente a `/\evil.com` |
| Sequestro de sessão | Cookies do `@supabase/ssr` (httpOnly, `Secure` em produção), HSTS, `upgrade-insecure-requests` |
| Vazar chave privilegiada | A `service_role`/`secret key` não é usada em lugar nenhum do projeto |
| XSS por texto do usuário | React escapa por padrão; sem `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou `new Function` |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Vazar GPS de casa no álbum compartilhado | O que sobe é uma cópia redesenhada em canvas: o EXIF não atravessa |
| Descoberta de álbuns por varredura | Id é UUID v4; privado, inexistente e apagado devolvem o mesmo 404 |
| Arquivo malicioso derrubar a aba | Tipo validado por MIME **e** extensão, limite de 80 MB na importação e de 10 MB no bucket |
| Sobrar dado em computador compartilhado | Sem conta, nada é persistido além do idioma; com conta, "Sair" encerra a sessão |

## Chaves e variáveis de ambiente

O app inteiro roda com a **publishable key** do Supabase, que é pública por
design — ela vai no bundle do navegador e isso está correto. O que a torna
inofensiva é a RLS: sem política, essa mesma chave daria acesso ao banco
inteiro. É o erro clássico de projeto com Supabase, e a razão de as tabelas
nascerem com RLS ligada em `supabase/schema.sql`.

Regras que não podem ser afrouxadas:

- **`NEXT_PUBLIC_` é para o que pode ser público.** Tudo com esse prefixo é
  embutido no bundle. A `service_role`/`secret key` ignora RLS: se algum dia
  entrar no projeto, será sem o prefixo e só em código de servidor.
- **Nenhum `.env` versionado.** O `.gitignore` cobre `.env*` (com exceção
  explícita para `.env.local.example`, que é modelo vazio), chaves (`*.pem`,
  `*.key`, `*.p12`), artefatos de build e material de teste local. Confirmado:
  nenhum `.env` jamais entrou no histórico do repositório.
- **`NEXT_PUBLIC_*` entra no build, não no runtime.** A CSP é montada a partir
  de `NEXT_PUBLIC_SUPABASE_URL` em tempo de build; definir a variável depois de
  publicar não muda nada e produz bloqueio silencioso por CSP.

## Autorização

**A RLS é quem autoriza.** Nenhuma rota do app decide sozinha quem pode ler o
quê: um `select` malfeito devolve zero linhas em vez de devolver o álbum de
outra pessoa. As políticas estão em `supabase/schema.sql`.

**Mas RLS não é filtro.** Políticas de `select` são permissivas e se somam com
**ou**. A tabela `albums` tem duas — "dono lê" e "público lê" — então uma
consulta sem `where` traz também os álbuns públicos de todo mundo. É por isso
que `listMyAlbums` filtra explicitamente por `user_id`: ali o filtro está
*selecionando*, não autorizando. Toda listagem nova precisa da mesma atenção.

**Escrita.** Cada Server Action confere a sessão, e as atualizações levam
`.eq('user_id', user.id)` além da política. `finalizeAlbum` confere ainda que
todo `storage_path` recebido do navegador comece com `{user}/{álbum}/` — sem
isso, uma chamada forjada poderia indexar arquivo de fora da pasta do álbum.
Há também um teto de 500 fotos por álbum, para que uma chamada forjada não vire
um `insert` de dezenas de milhares de linhas.

**E o mesmo conferido de novo no banco, porque o Server Action é evitável.**
A chave publicável está no navegador — é para estar —, e com ela dá para falar
direto com o PostgREST e pular `finalizeAlbum` inteiro. A RLS sozinha deixaria:
"fotos: dono escreve" só perguntava se o álbum era seu. Por isso as mesmas três
invariantes existem em `schema.sql`, onde não há como contornar: o prefixo do
`storage_path` entrou no `with check` da política, o teto de 500 virou gatilho
por statement (`enforce_album_photo_cap`) e os tamanhos de título, nome e
caminho viraram `check constraint`. Validação no servidor cuida do caminho
feliz; restrição no banco cuida do resto.

**Mensagens de erro.** O texto do Postgres fica no log do servidor e não vai
para a tela: nome de política, de coluna e de restrição descreve o esquema para
quem estiver sondando e não ajuda quem só quer salvar o álbum.

## Storage

Bucket **privado**, um objeto por foto em `{user_id}/{album_id}/{photo_id}.jpg`
— a convenção do caminho é o que as políticas leem, sem consulta extra. Nada é
servido por URL pública: toda imagem sai como URL assinada com validade de uma
hora, curta o bastante para que um link copiado por engano expire.

O bucket recusa no servidor o que a interface já recusa: só `image/jpeg`, no
máximo 10 MB por arquivo. A validação do navegador é de usabilidade; a do
bucket é a que vale.

Apagar um álbum apaga os objetos **antes** da linha, em páginas de 100 (o
`list` do Supabase devolve no máximo 100 por chamada) — apagar a linha primeiro
deixaria arquivos órfãos ocupando a cota para sempre, sem nada apontando para
eles.

## Privacidade dos metadados

Fotos de celular carregam GPS, modelo da câmera e, em algumas marcas, número de
série. **Nada disso sai da máquina.**

- **No PDF**: as páginas são rasterizadas num canvas, então o que entra no
  arquivo são pixels. O EXIF do original não sobrevive à travessia.
- **Na nuvem**: o que sobe é uma cópia redesenhada em canvas (máx. 2000px,
  JPEG ~300 KB) — `features/album-save/prepareUpload.ts`. O canvas copia
  pixels, não metadados. A data continua guardada, mas numa coluna do banco que
  o dono apaga junto com o álbum, e não escondida dentro do arquivo.
- **O original nunca é enviado nem alterado**: ele continua no computador da
  pessoa, intacto.

## Cabeçalhos (`next.config.ts`)

> Aplicados **só em produção**, de propósito: em desenvolvimento a CSP só
> acrescenta modos de falha (HMR, overlay de erro, e o
> `upgrade-insecure-requests` quebrando o acesso pela URL de rede que o Next
> também expõe). Para conferir: `npm run build && npm start`.

- **CSP** com `connect-src`/`img-src` liberando a **origem exata** do projeto
  Supabase, lida de `NEXT_PUBLIC_SUPABASE_URL`. Com o curinga `*.supabase.co`,
  uma dependência comprometida poderia mandar as fotos para outro projeto
  Supabase qualquer. Sem back-end configurado, volta a ser `connect-src 'self'`
  puro. Mais `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`.
- **`Strict-Transport-Security`** (2 anos, subdomínios, `preload`). O
  `upgrade-insecure-requests` cobre o que a página pede; o HSTS cobre a
  navegação até ela — inclusive a primeira, digitada sem `https://`, que é
  justamente a requisição em que o cookie de sessão viaja.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster`.
- `Permissions-Policy` desligando câmera, microfone, geolocalização, pagamento,
  USB, serial e MIDI — o app não usa nada disso.
- `poweredByHeader: false`.

## Sessão e contas

- O `proxy` (`src/proxy.ts`, o antigo middleware) existe só para renovar o
  token a cada requisição. **Proteção de rota é decidida em cada página**, onde
  dá para redirecionar já sabendo para onde voltar.
- **Trocar a senha exige a senha atual**, mesmo o Supabase não exigindo: uma
  sessão esquecida aberta num computador emprestado não pode virar uma troca de
  senha, que trancaria o dono para fora da própria conta.
- **O destino pós-login passa por `safeNext`.** Ele vem do navegador, então é
  entrada hostil: sem filtro, `/entrar?next=https://…` transformaria a tela de
  login numa página de redirecionamento aberto — o link começa no domínio de
  verdade e termina num clone. A checagem rejeita `//evil.com`, `/\evil.com`
  (navegadores normalizam a barra invertida) e qualquer caractere de controle.

## Superfície de código

Buscas no código-fonte, todas sem ocorrência:

- `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function` — **nenhuma**
- `target="_blank"` sem `rel="noopener"` — **nenhum**
- URLs de terceiros embutidas no código — **nenhuma** (as fontes são `.woff2`
  versionados em `src/app/fonts/`, servidos pelo próprio app)
- `npm audit --omit=dev` — **0 vulnerabilidades**

Nove dependências de produção, e é para continuar assim: dependência sem uso é
superfície de ataque de graça. O PDF é montado à mão em
`album-export/pdf/pdfWriter.ts`, sem biblioteca.

## Limitações conhecidas, assumidas

1. **`'unsafe-inline'` em `script-src`.** O Next injeta inline o script de
   bootstrap e os dados de hidratação. Dá para trocar por nonce agora que
   existe o `proxy`, mas o nonce muda a cada requisição — e um cabeçalho que
   muda a cada requisição obriga toda página a ser renderizada sob demanda,
   incluindo a landing e a "Sobre", hoje estáticas. O que se ganharia é defesa
   contra a *execução* de um XSS; o que este app oferece a um XSS é pouco (sem
   `innerHTML`, sem `eval`, sem HTML de usuário renderizado). **Reavaliar se
   algum dia entrar conteúdo rico** — markdown, HTML colado, embed.
2. **`'unsafe-inline'` em `style-src`.** Necessário pelos atributos `style` que
   o pré-render coloca no HTML. Não permite execução de script.
3. **`user_id` do dono é legível num álbum público.** É um UUID, e ele já
   aparece no caminho da URL assinada de cada foto. Não identifica ninguém.
4. **Os cabeçalhos dependem de quem serve.** `headers()` vale quando o app é
   servido pelo Next (Vercel/Netlify com runtime Node). Em export estático
   puro, precisam ser reconfigurados no provedor.
5. **Cota do free tier não tem defesa.** Uma conta pode encher 1 GB de storage
   subindo álbuns. O teto de 500 fotos por álbum limita a requisição, não a
   conta. Se virar problema, o caminho é uma cota por usuário no banco.

## Ao mexer no código

- Toda listagem nova: RLS autoriza, mas **o `where` é seu**.
- Toda coluna/tabela nova: RLS ligada na mesma migração, nunca depois.
- Todo dado vindo do navegador que vire caminho de storage: conferir o prefixo
  no servidor.
- Todo erro de banco: `console.error` no servidor, mensagem genérica na tela.
- Todo redirecionamento com destino vindo da URL: passar por `safeNext`.
