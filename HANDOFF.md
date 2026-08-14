# Memento — contexto para continuar em outra conversa

Cole este arquivo no início da próxima conversa. Ele resume onde o projeto
está, o que foi decidido e por quê, e o que ficou em aberto.

---

## O produto

**Memento — Keep the Journey**: app web que monta o álbum de uma viagem a
partir das fotos. Lê os metadados EXIF (data, hora, GPS), ordena
cronologicamente e deixa o usuário compor as páginas à mão. **Sem IA
generativa e sem visão computacional** — decisão de escopo, não sugerir.

**Fase 1 (pronta):** 100% no navegador, orçamento zero, nenhuma foto sai da
máquina — e continua assim para quem não pede o contrário.
**Fase 2 (atual):** conta opcional, álbum guardado no Supabase e link público
para compartilhar. Sem conta, o app é exatamente o da Fase 1.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
`exifr` (EXIF) · `@dnd-kit` (arrastar) · `@supabase/ssr` + `@supabase/supabase-js`
(contas, banco e storage, no free tier).

Sete dependências de produção, e é para continuar assim. A exportação em PDF é
feita à mão, sem biblioteca, e as fontes moram no repositório: **o build não
precisa de rede.**

## Estrutura

```
src/
├── app/
│   ├── page.tsx           → landing (/)
│   ├── sobre/page.tsx     → página "Sobre" (/sobre)
│   ├── obrigado/page.tsx  → agradecimento após o download (/obrigado)
│   ├── album/page.tsx     → a aplicação (/album)
│   ├── globals.css        → tokens do design system + @layer components
│   ├── fonts/             → os .woff2 (ver "Fontes")
│   └── icon.svg · favicon.ico · apple-icon.png → a marca
├── features/
│   ├── i18n/              → idioma do site: lang.ts (tipo), langStore (localStorage),
│   │                        LangProvider/useLang, LangToggle, common.ts (copy compartilhada)
│   ├── theme/             → ThemeToggle (claro/escuro via data-theme no <html>)
│   ├── landing/           → copy pt/en, hero, BeforeAfter (antes e depois), paralaxe
│   ├── about/             → AboutPage + copy pt/en
│   ├── faq/               → FaqWidget (botão fixo "?" + painel) + copy pt/en
│   ├── share/             → shareMessage (texto puro), shareTargets (X/WhatsApp/
│   │                        Telegram/e-mail + Web Share), shareCard (canvas 1200×630), ShareRow
│   ├── thank-you/         → ThankYouPage, copy pt/en, handoff (sessionStorage)
│   ├── photo-upload/      → dropzone, botão + Fotos, importPhotos
│   ├── exif-reader/       → parseExif (nunca lança; EXIF ausente é a regra)
│   ├── album-builder/     → useAlbum (estado), AlbumGrid, AlbumToolbar, AlbumStart
│   ├── album-book/        → o livro 3D (ver abaixo)
│   ├── album-style/       → temas de capa/papel/moldura/letra
│   ├── album-export/      → AlbumExporter (contrato) + useAlbumExport
│   │   └── pdf/           → o álbum em PDF (ver abaixo)
│   ├── auth/              → actions (server), state, name (como chamar a
│   │                        pessoa), useSessionUser, AccountMenu (a conta na
│   │                        barra), AuthForm (/entrar), AccountForms (/conta),
│   │                        InlineAuthDialog (entrar sem sair do álbum)
│   ├── album-save/        → composition (serialização), prepareUpload
│   │                        (redimensiona), saveAlbum (navegador→Storage),
│   │                        actions (server), snapshot, useAlbumSave
│   └── album-view/        → loadAlbum (servidor), AlbumViewer (o livro em
│                            modo leitura), ShareControls, AlbumCard
├── components/            → ConfirmDialog, Logo (LogoMark + Wordmark),
│                            SiteNav (a barra do topo de **todas** as telas),
│                            SiteFooter, Tooltip
├── lib/                   → paginate.ts, sortPhotos.ts, format.ts (funções puras),
│                            author.ts (dados e links do autor, fonte única)
│   └── supabase/          → env (config + flag `isSupabaseConfigured`),
│                            client (navegador), server (RSC/actions),
│                            middleware (renovação de sessão), types
├── proxy.ts               → o antigo `middleware.ts` (renomeado no Next 16)
└── types/                 → photo.ts, page.ts
```

Dentro de `album-book/`, separado por responsabilidade:
`AlbumBook` (orquestra) · `BookStage` (livro 3D e gesto de folhear) ·
`BookToolbar` · `PageStrip` (tira de páginas) · `PhotoTray` (depósito) ·
`BookPage`/`PhotoSlot`/`StoryPage` (conteúdo da página) ·
`usePageTurn` (**só** navegação) · `useAlbumBook` (**só** conteúdo) ·
`bookGeometry` (função pura: dado o spread e a virada, o que aparece onde).

## O que está pronto

- **Importação** com leitura de EXIF em lotes, ordenação cronológica, fotos sem
  EXIF caem no `lastModified` e ganham selo "sem EXIF".
- **Livro 3D** em CSS puro: capa fechada no começo, contracapa fechada no fim,
  folhear arrastando/setas/clique na borda, espessura do miolo, sombras.
- **Páginas**: layouts (1/2/2/3/4 fotos), modo alinhado ↔ livre **por página**,
  legendas por foto e por página, páginas de texto, páginas em branco.
- **Depósito** de fotos fora do álbum, com ida e volta por clique ou arraste.
- **Tira de páginas**: navegar, reordenar (arrastar), remover (🗑), página
  fantasma "+" no fim.
- **Estilo**: 6 capas, 4 papéis, 3 molduras, 4 tipografias. Abre pelo botão
  "Estilo" da barra do topo (só no modo Álbum). Antes era uma aba vertical
  colada na borda direita da janela — quase ninguém a reconhecia como botão.
- **Marca**: livro aberto com uma foto na página esquerda e o marcador descendo
  pela direita. O marcador sai do livro em cima **e** embaixo de propósito:
  rente à borda ele virava uma terceira página e o desenho ficava ilegível.
  `components/Logo.tsx` (em `currentColor`, serve claro/escuro/acento) e
  `app/icon.svg` (cores fixas, sem os traços finos, porque a 16px eles somem).
  O `favicon.ico` tem 7 resoluções, de 16 a 256.
- **Exportação em PDF** — a única saída: uma página do arquivo por página do
  livro, com o papel, a moldura, a inclinação, o recorte e as legendas como
  estão na tela. Dentro de `album-export/pdf/`: `drawPage.ts` desenha a página
  num canvas, `pdfWriter.ts` empilha os JPEGs num PDF **sem biblioteca**
  (filtro `DCTDecode`, JPEG cru), `pdfExporter.ts` orquestra.
  O ZIP das fotos originais existiu e foi removido: dividia a atenção entre "o
  livro" e "os arquivos". Saiu junto o `jszip`. Está no histórico do git.
- **Landing** (`/`) com paralaxe, mapa de destino interativo, tema claro/escuro
  e PT/EN.
- **Celular**: a edição funciona no toque. Tocar numa foto a escolhe e revela
  as alças dela e os controles da página (no mouse isso é o `hover`); o
  primeiro toque nunca reenquadra, então dá para rolar o álbum com o dedo por
  cima das fotos. A tela de importação troca "arraste para cá" por um botão
  grande, e o painel de ajustes cabe na largura de um celular.

## Decisões que não devem ser desfeitas sem motivo

1. **A ordem da lista de fotos é a fonte de verdade da sequência.** Páginas são
   derivadas dela (`lib/paginate.ts`), não armazenadas.
2. **Inserções são ancoradas no id de uma foto**, não na chave da página — a
   foto é a única coisa estável quando o layout muda ou o usuário reordena.
   `STORY_ANCHOR_START` e `STORY_ANCHOR_END` são âncoras especiais.
3. **Nada que o usuário criou pode sumir.** Remover página manda as fotos para
   o depósito; inserção com âncora perdida vai para o fim em vez de desaparecer.
4. **Trocar, não inserir**: soltar foto sobre foto troca as duas (inserir
   empurraria todo o resto e remontaria as páginas seguintes).
5. **Geometria do livro é função pura** (`bookGeometry.ts`) — é a parte que mais
   quebra ao mexer no visual, e assim dá para testar sem navegador.
6. **Zero requisição a terceiros** — em execução **e no build**. Os `.woff2`
   vivem em `src/app/fonts/` e entram por `next/font/local`. Nenhuma CDN. A CSP
   (`connect-src 'self'`, `font-src 'self'`) transforma "as fotos não saem da
   máquina" em garantia do navegador. Ver "Fontes" abaixo.
7. **Sem persistência de conteúdo**: nenhuma foto, página ou legenda é guardada.
   Recarregar perde o álbum — é intencional nesta fase. As duas exceções não são
   conteúdo: o idioma escolhido (`localStorage`, `features/i18n/langStore.ts`) e
   a ponte para `/obrigado` (`sessionStorage`, apagada na leitura,
   `features/thank-you/handoff.ts` — nome do álbum, contagens e o cartão).
8. **Movimento de mouse não passa pelo React** na landing: variáveis CSS
   escritas via ref dentro de `requestAnimationFrame`.
9. **O PDF redesenha a página, não fotografa o DOM.** Capturar a tela traria a
   resolução da tela (uma foto de 12 MP viraria um borrão), os controles de
   edição e a perspectiva 3D. Em `drawPage.ts` a régua é `unit` = 1 px de tela
   do livro: todo número lá é o mesmo do Tailwind do `BookPage`/`PhotoSlot`
   (`px-5` → `20 * unit`). Mexeu no visual de um, confira o outro.
10. **`resolveAlbumPalette` é a única ponte entre tema e canvas.** A tela lê
    `var(--paper-base)`; o canvas não tem cascata e precisa do valor. Criar um
    tema novo continua sendo mexer só nas listas de `theme.ts`.
11. **As classes do design system vivem em `@layer components`.** CSS fora de
    camada vence CSS dentro de uma, então soltas elas ganhavam dos utilitários
    do Tailwind: `className="btn hidden sm:inline-flex"` não escondia nada.
    Componente é a base, utilitário é o ajuste — o ajuste tem de poder vencer.
    Não tire nada dessa camada.
12. **Toque não é largura.** `useIsNarrow` (`max-width: 767px`) responde "cabe o
    spread?"; `useIsTouch` (`hover: none`) responde "dá para pairar?". Tudo que
    aparecia só no `hover` — as alças da foto, a pílula de layout — usa o
    segundo. Um laptop com tela sensível ao toque é largo e mesmo assim precisa
    das alças visíveis.

## Fontes

Cormorant Garamond (títulos) e Lora (corpo), em `src/app/fonts/`, carregadas com
`next/font/local`. São as **variáveis** do subset `latin` — um arquivo por
família cobrindo os pesos 400 e 600, ~37 KB cada. O `latin` já traz todos os
acentos do português, o travessão e as aspas tipográficas.

Antes vinham de `next/font/google`. Ele também auto-hospeda o resultado, mas
baixa os arquivos **durante o build**, e um build que precisa de rede é um build
que quebra: sem acesso ao `fonts.gstatic.com` o Turbopack falha com
`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. Apagar a
pasta `.next` — onde o download fica em cache — bastava para derrubar tudo.

**Não volte para `next/font/google`.** Para trocar de fonte, ponha o `.woff2` em
`src/app/fonts/` e mude o `src` no `layout.tsx`.

## Segurança

`SECURITY.md` tem o modelo de ameaças completo. Resumo: não há servidor nem
segredo nesta fase; o esforço foi em CSP + cabeçalhos (só em produção; em dev
atrapalhavam), não vazar GPS no arquivo exportado, limite de 80 MB por arquivo e
`.gitignore` cobrindo `.env*`, chaves e material de teste.

Com a saída do ZIP, o GPS deixou de ser um risco de exportação: o PDF rasteriza
as páginas, então o EXIF das fotos não sobrevive a ele.

Para a Fase 2, o item que não pode ser esquecido: **RLS ligada desde a primeira
tabela do Supabase**, e `service_role key` jamais com prefixo `NEXT_PUBLIC_`.

## Como eu verifico (mantenha)

`npx tsc --noEmit` · `npm run lint` · `npm run build` · mais asserts em
TypeScript rodados com `tsx` sobre as funções puras (paginação, geometria,
rotação, escolha de destino). Não há framework de teste instalado — os asserts
são scripts avulsos, rodados fora do repositório.

Para a Fase 2 há `scripts/checkComposition.mts` (`npx tsx
scripts/checkComposition.mts`): ida e volta da composição pelo JSON, entradas
corrompidas que não podem derrubar o álbum e a poda das chaves órfãs.

Para o PDF há `scripts/checkPdfExport.mts` (fora do `tsconfig`, por causa da
dependência nativa): troca o canvas do navegador por um de Node e gera um álbum
de amostra em disco, para conferir as páginas sem abrir a aplicação.

```
npm i --no-save @napi-rs/canvas tsx
npx tsx scripts/checkPdfExport.mts ./fotos album.pdf          # modo alinhado
npx tsx scripts/checkPdfExport.mts ./fotos livre.pdf livre    # papel escuro, cantoneiras, fotos soltas
```

**Verificação visual.** Dá para rodar o app num Chromium headless e tirar
capturas de 390px e 1280px, inclusive emulando `hover: none` — sem isso o teste
serve o caminho do mouse numa tela de celular e não prova nada. É assim que a
rolagem horizontal da landing e a pílula de controles fora de lugar apareceram.
O `hasTouch` do Playwright emula os eventos, não as media features; as features
precisam de `Emulation.setEmulatedMedia` por CDP.

## Pendências

- [ ] Modo de página única no mobile: hoje o spread de duas páginas só encolhe.
- [ ] Varrer o resto do JSX atrás de utilitários que estavam sendo ignorados
      pelas classes do design system. `hidden sm:inline-flex` no CTA da landing
      era um; pode haver outros escondidos, porque durante muito tempo eles
      simplesmente não faziam efeito e ninguém notou.
- [ ] Legenda e layout de página são guardados pela chave da página, que depende
      da posição — reordenar pode fazer os dois trocarem de página. Ajustes por
      foto e textos não são afetados.
- [ ] Conferir o PDF num navegador de verdade: o `drawPage.ts` foi verificado
      com o canvas do Node, que não é o mesmo motor. Vale olhar principalmente
      as fontes (as pilhas do tema são fontes do sistema) e a memória em um
      álbum grande.
- [ ] O PDF usa A5 retrato fixo. Se o livro ganhar formato paisagem ou quadrado,
      as constantes ficam no topo de `pdf/pdfExporter.ts`.
- [ ] `public/` ainda tem os SVGs do template do Next (`next.svg`, `vercel.svg`,
      `file.svg`, `globe.svg`, `window.svg`). Ninguém importa; podem sair.

## Fase 2 — o que existe e por quê

- **Conta é opcional.** `/album` não é rota protegida: montar e baixar o PDF
  nunca pede login. A conta só entra ao clicar "Salvar na nuvem".
- **Entrar não navega.** O álbum montado só existe na memória da aba; um
  redirect para a tela de login o destruiria. Por isso o `InlineAuthDialog`
  fala com o Supabase pelo cliente do navegador e, terminado o login,
  `useAlbumSave.resume()` continua o salvamento de onde parou.
- **O que é salvo:** uma linha por foto (ordem, caminho no Storage, data) e a
  composição inteira num JSONB. Colunas para layout/legenda/posição seriam uma
  migração a cada ajuste de UI, e nenhuma consulta filtra por elas.
  `features/album-save/composition.ts` é a fronteira: `parseComposition` nunca
  lança, então álbum salvo por versão antiga continua abrindo.
- **As fotos sobem redimensionadas** (máx. 2000px, JPEG, ~300 KB) direto do
  navegador para o Storage, sem passar pelo servidor do Next — o corpo de
  requisição do free tier não aguentaria um álbum inteiro. O canvas não copia
  metadados: o EXIF, e portanto o GPS, não sobe. O PDF continua usando o
  arquivo original em resolução cheia.
- **Autorização é RLS.** Nenhuma consulta do app filtra por `user_id`.
  `supabase/schema.sql` é a fonte da verdade; `supabase/CHECKLIST.md` é o passo
  a passo do painel.
- **O estilo pode ser escolhido antes das fotos.** A tela de álbum novo tem a
  seção "O estilo", fechada por padrão (aberta, empurraria o botão de escolher
  fotos para fora da primeira dobra do celular). É o mesmo `StylePanel` da
  gaveta e o mesmo estado — os ajustes de página dele (`Tortinhas`, `refazer
  páginas`) são opcionais e ficam de fora ali, onde ainda não existe página.
- **A página pública reusa o livro**, não uma galeria: `BookStage` ganhou
  `readOnly`, que desliga a edição sem duplicar componente. Folhear é o produto.
- **O app roda sem back-end.** Sem as variáveis de ambiente,
  `isSupabaseConfigured` é falso: o botão da nuvem e o link "Meus álbuns" não
  existem, `/albums` manda para `/album` e o `npm run build` passa igual.
- **Salvar não altera o estado do álbum.** `useAlbum` e `useAlbumBook` não
  sabem que a nuvem existe; `snapshotComposition` lê o estado de fora.

### A régua das telas (design system)

Três classes em `globals.css` guardam a medida de todas as páginas, e o JSX
não repete mais `mx-auto max-w-[1200px] px-[clamp(...)]`:

- `.page-shell` — largura máxima e margem lateral;
- `.page-body` — respiro do topo e do rodapé;
- `.page-head` — cabeçalho de tela (título à esquerda, ação à direita);
- `.site-nav` — a barra do topo, com o mesmo respiro vertical do `.page-head`.

**Toda régua tem um comprimento só**: o do conteúdo. Antes, `.hr-bleed`
esticava algumas até a borda da janela enquanto outras paravam no conteúdo —
duas larguras de linha no mesmo produto. A classe foi removida, e a barra
grudenta do álbum deixou de sangrar: quem precisa de fundo até a borda usa
fundo, não sangria de linha. Se aparecer uma linha de outro tamanho, é bug.

### Formulários

`.field`, `.field-stack`, `.field-width`, `.panel`, `.panel-title` e
`.panel-actions`, em `globals.css`, definem o respiro de rótulo, campo e ajuda.
Antes cada formulário escolhia o seu (`space-y-1.5` aqui, `mb-2` ali) e o
rótulo terminava colado no campo — é isso que faz uma tela parecer torta mesmo
com tudo alinhado. Campo tem largura de leitura (`max-width: 380px`): nome,
e-mail e senha são curtos, e um input de 1000px pede um olho que a linha não
merece.

### A barra do topo

Um `SiteNav` para todas as telas, inclusive `/album` — que tinha cabeçalho
próprio e por isso era a única sem idioma, tema e conta, justamente onde a
pessoa passa mais tempo.

A ordem é: **para onde ir** (links) · **como vejo** (idioma e tema) · **quem sou
eu** (conta, encostada na margem direita, que é onde toda interface põe o
perfil). O espaço entre grupos (28px) é maior do que o de dentro deles (20px) —
é a distância que agrupa. O gatilho da conta é um alvo só (círculo + nome), com
hover e estado aberto: sem isso, um item que abre menu não dava sinal nenhum de
ser clicável.

Deslogado: "Entrar" discreto e "Criar conta" em destaque (no celular, só
"Entrar" — a tela de login já oferece o cadastro). Logado: um menu atrás do
nome, com "Meus álbuns", "Minha conta" e "Sair". Foi isso que tirou o "Sair" da
lista de álbuns, onde ele dividia a linha com "Montar um álbum": a ação mais
destrutiva do mesmo tamanho e ao lado da mais construtiva.

O nome vem do `user_metadata.full_name` do Supabase Auth — sem tabela de
perfil. `features/auth/name.ts` centraliza como chamar a pessoa (nome, primeiro
nome, inicial) e é lido no servidor e no navegador; `useSessionUser` lê a sessão
do **cookie local**, então a barra não custa uma requisição por página.

O álbum salvo guarda `author_name` na própria linha: quem abre um link público
não pode consultar `auth.users`, e o nome de quem compartilhou faz parte do
álbum.

### Pendências da Fase 2

- [ ] Reabrir um álbum salvo **para edição** (hoje só leitura). O caminho está
      pronto: `loadAlbum` já devolve `Photo[]` + composição, e `useAlbumBook`
      já aceita estado inicial — falta a tela e o "salvar por cima".
- [ ] Rascunhos (`status = 'draft'`) de uploads interrompidos ficam no banco
      ocupando storage. Uma limpeza periódica resolve; nada os mostra hoje.
- [ ] Recuperação de senha ("esqueci a senha"): só pelo painel por enquanto.
      Trocar a senha sabendo a atual já existe em `/conta`.
- [ ] Trocar o e-mail da conta (exige confirmação nos dois endereços).
- [ ] Migrar `'unsafe-inline'` da CSP para nonce — agora existe proxy.

**Resolvido desde a última versão deste arquivo:** git inicializado e commitado ·
`LayoutPicker.tsx` apagado · build conferido com as fontes reais (e agora sem
depender de rede) · exportação sem metadados (o PDF rasteriza, o EXIF não passa).

## Como prefiro trabalhar

Respostas em português, diretas e sem repetir o que já apareceu na tela.
Explicar a causa de um bug, não só o conserto. Dizer quando algo não foi
verificado. Priorizar experiência do usuário e arquitetura que escale.
