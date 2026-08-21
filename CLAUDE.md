# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O produto

**Memento — Keep the Journey**: monta o álbum de uma viagem a partir das fotos.
Lê EXIF (data/hora/GPS), ordena cronologicamente, deixa o usuário compor as
páginas à mão e exporta em PDF. Sem IA generativa e sem visão computacional —
decisão de escopo deliberada, não sugerir.

- **Fase 1**: 100% client-side. Sem conta, nenhuma foto sai do navegador.
- **Fase 2 (atual)**: conta opcional via Supabase, álbum salvo na nuvem e link
  público. Sem as env vars do Supabase configuradas, o app roda exatamente
  como na Fase 1 (`isSupabaseConfigured` em `src/lib/supabase/env.ts` desliga
  tudo relacionado a conta/nuvem, e `npm run build` passa igual).

Comentários e mensagens de commit devem ser em português, seguindo o padrão do
repositório.

## Comandos

```bash
npm install
npm run dev              # http://localhost:3000
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

Não há framework de teste instalado. Verificação de funções puras é feita com
scripts avulsos rodados via `tsx` (não fazem parte do `tsconfig`/build):

```bash
npx tsx scripts/checkComposition.mts     # ida/volta da composição por JSON, entradas corrompidas, poda de chaves órfãs

# Supabase (exige conta de verdade; apaga o álbum de teste no fim):
MEMENTO_EMAIL=... MEMENTO_PASSWORD=... npx tsx scripts/checkSupabaseSave.mts

# PDF (exige dependência nativa não versionada, instalar sob demanda):
npm i --no-save @napi-rs/canvas tsx
npx tsx scripts/checkPdfExport.mts ./fotos album.pdf          # modo alinhado
npx tsx scripts/checkPdfExport.mts ./fotos livre.pdf livre    # papel escuro, cantoneiras, fotos soltas
```

O checklist de verificação antes de considerar algo pronto: `npx tsc --noEmit`
→ `npm run lint` → `npm run build` → os scripts acima quando a mudança tocar
paginação, geometria do livro, composição ou PDF.

## Arquitetura

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `exifr` (EXIF)
· `@dnd-kit` (arrastar) · `@supabase/ssr` + `@supabase/supabase-js` (Fase 2).
Sete dependências de produção — é para continuar assim; PDF é gerado à mão,
sem biblioteca.

```
src/
├── app/                    # Rotas (App Router): /, /sobre, /obrigado, /album,
│                            # /albums, /entrar, /conta, /album/[id]
├── features/                # um módulo por funcionalidade, ver abaixo
├── components/              # ConfirmDialog, Logo, SiteNav, SiteFooter, Tooltip
├── lib/                     # funções puras (paginate, sortPhotos, format, safeNext) + lib/supabase/
├── proxy.ts                 # o antigo middleware.ts — renomeado no Next 16, não recriar middleware.ts
└── types/                   # Photo, PhotoExif, Album, PageLayout
```

Features relevantes: `exif-reader` (parseExif, nunca lança), `album-builder`
(`useAlbum` = estado da lista de fotos), `album-book` (o livro 3D, ver
abaixo), `album-style` (temas de capa/papel/moldura/tipografia), `album-export`
(contrato `AlbumExporter` + `pdf/`), `auth` e `album-save` (Fase 2, ver
abaixo), `i18n` (pt/en via localStorage), `theme` (claro/escuro via
`data-theme` no `<html>`, sem estado React).

O visual é o design system **Organic** (papel areia, acento terracota, cantos
de 8/16/28px e controles pequenos em pílula), portado de `_ds/organic/` para os
tokens no topo de `globals.css`. Ele substituiu o Classical (papel cinza,
acento dourado, cantos de 2/4/7px, tipografia serifada) — nenhum componente
inventa cor, fonte ou espaçamento fora dali. A landing (`features/landing/`) é
a única tela com seções que sangram até a borda da janela: barra fixa que ganha
fundo ao rolar, herói com foto e parallax (`useHeroScroll`), "antes e depois",
passos, recursos e as perguntas frequentes abertas no corpo da página
(`LandingFaq`, mesma lista de `features/faq/copy.ts`). A bolha flutuante de FAQ
continua servindo as telas internas, e não aparece na landing.

### `album-book/` — divisão por responsabilidade

| Arquivo | Responsabilidade |
| --- | --- |
| `AlbumBook.tsx` | orquestra: estado, arraste de fotos, os pedaços abaixo |
| `BookStage.tsx` | o livro: perspectiva, folha girando, gesto de folhear |
| `BookToolbar.tsx` / `PageStrip.tsx` / `PhotoTray.tsx` | navegação, tira de páginas, depósito |
| `BookPage.tsx` / `PhotoSlot.tsx` / `StoryPage.tsx` / `DayNote.tsx` | conteúdo de uma página |
| `usePageTurn.ts` | **só** navegação (em que spread estamos, como a folha se move) |
| `useAlbumBook.ts` | **só** conteúdo (layouts, posições, textos, tema) |
| `bookGeometry.ts` | função pura: dado o spread e a virada, o que aparece onde |

`usePageTurn` e `useAlbumBook` foram separados de propósito: têm ritmos
diferentes (um muda a cada frame do arraste, o outro a cada edição do
usuário) — não voltar a juntá-los.

### Decisões arquiteturais que não devem ser desfeitas sem motivo

1. **A ordem da lista de fotos é a fonte de verdade da sequência.** Páginas
   são derivadas dela (`lib/paginate.ts`), nunca armazenadas.
2. **Inserções (páginas de história) são ancoradas no id de uma foto**, não na
   chave da página — a foto é a única coisa estável quando o layout muda ou o
   usuário reordena. `STORY_ANCHOR_START`/`STORY_ANCHOR_END` são âncoras
   especiais para começo/fim do álbum.
3. **Nada que o usuário criou pode sumir.** Remover uma página manda as fotos
   de volta para o depósito (não apaga); uma inserção com âncora perdida vai
   para o fim do álbum em vez de desaparecer.
4. **Soltar foto sobre foto troca as duas, nunca insere** (inserir empurraria
   o resto e remontaria as páginas seguintes).
5. **Geometria do livro é função pura** (`bookGeometry.ts`) — testável sem
   navegador; é a parte que mais quebra ao mexer no visual.
6. **Zero requisição a terceiros, em execução e no build.** As fontes
   (`Bricolage Grotesque` para título, `Figtree` para texto) são `.woff2`
   versionados em `src/app/fonts/` carregados via `next/font/local` — **nunca
   volte para `next/font/google`**, que baixa arquivos durante o build e quebra
   sem rede; o `styles.css` original do design system abre com um `@import` do
   Google Fonts pelo mesmo motivo, e ele também não entra. Vale para imagem: a
   foto do herói é `public/hero.jpg`, versionada, não um link de banco de
   imagens. A CSP (`connect-src 'self'`, `font-src 'self'`, `img-src 'self'`)
   faz o navegador garantir isso.
7. **O PDF redesenha a página num canvas, não fotografa o DOM.** Em
   `album-export/pdf/drawPage.ts` a régua é `unit` = 1px de tela do livro:
   todo número ali espelha o Tailwind de `BookPage`/`PhotoSlot` (`px-5` →
   `20 * unit`). Mexeu no visual de um, confira o outro. `pdfWriter.ts`
   empilha os JPEGs num PDF à mão (filtro `DCTDecode`, sem recompressão).
8. **`resolveAlbumPalette` é a única ponte entre tema (CSS custom properties)
   e canvas** — o canvas não tem cascata CSS. Tema novo = editar listas em
   `album-style/theme.ts`, nunca tocar componente.
9. **As classes do design system (`.btn`, `.input`, `.card`, `.seg`, `.kicker`,
   `.page-shell`, `.field`, `.hero`, `.nav-bar`, etc.) vivem em `@layer
   components` dentro de `globals.css`.** CSS fora de camada vence CSS dentro de uma — soltas, elas
   perdiam para utilitários do Tailwind (`className="btn hidden sm:inline-flex"`
   não escondia nada). Não tirar nada dessa camada.
10. **`useIsNarrow` (`max-width: 767px`) ≠ `useIsTouch` (`hover: none`).**
    Toque não é largura: controles que só aparecem no hover (alças de foto,
    pílula de layout) usam `useIsTouch`, não breakpoint — um laptop touch é
    largo e ainda precisa das alças visíveis.
11. **Movimento de mouse não passa pelo React na landing** — variáveis CSS
    escritas via ref dentro de `requestAnimationFrame` (`usePointerVars`).
12. **O diário de viagem é indexado pelo *grupo de dia*, não pela página**
    (`dayNotes` na composição, `DayNote.tsx` na tela). Chave de página muda
    quando o layout ou a ordem mudam; o dia, não — texto escrito para o dia 12
    continua no dia 12 depois de qualquer remontagem. Ele aparece só na página
    que abre o dia (`AlbumPage.opensGroup`), cede espaço às fotos em vez de
    tomar (teto de 5 linhas, igual na tela e no PDF) e some por completo quando
    está vazio e ninguém está editando. Nada aqui é gerado pelo app.
13. **Sem persistência de conteúdo fora da Fase 2.** Recarregar `/album`
    (modo local) perde o álbum — intencional. Exceções que não são conteúdo:
    idioma (`localStorage`) e a ponte para `/obrigado` (`sessionStorage`,
    consumida na leitura).

### Fase 2 — Supabase (auth + persistência)

- **Conta é opcional e não navega.** `/album` nunca exige login; a conta só
  entra ao clicar "Salvar na nuvem". `InlineAuthDialog` autentica pelo cliente
  do navegador sem redirect (um redirect destruiria o álbum em memória);
  terminado o login, `useAlbumSave.resume()` continua o salvamento de onde
  parou.
- **O que é salvo:** uma linha por foto (ordem, caminho no Storage, data) +
  a composição inteira num JSONB. `album-save/composition.ts` é a fronteira:
  `parseComposition` nunca lança, então um álbum salvo por versão antiga do
  schema continua abrindo.
- **Fotos sobem redimensionadas** (máx. 2000px, JPEG, ~300KB) direto do
  navegador para o Storage (sem passar pelo servidor Next — o corpo de
  requisição do free tier não aguentaria). O canvas de redimensionamento não
  copia metadados: EXIF/GPS não sobe. O PDF exportado continua usando o
  arquivo original em resolução cheia.
- **Autorização é RLS — mas RLS não é filtro.** Nenhuma rota decide sozinha
  quem pode ler o quê. Só que políticas de `select` são permissivas e se somam
  com **ou**: `albums` tem "dono lê" *e* "público lê", então uma consulta sem
  `where` traz os álbuns públicos de todo mundo junto. Por isso
  `listMyAlbums` filtra por `user_id` — ali o filtro está *selecionando*, não
  autorizando. **Toda listagem nova precisa do próprio `where`.** Ao
  criar/alterar tabelas: `supabase/schema.sql` é a fonte da verdade,
  `supabase/CHECKLIST.md` é o passo a passo no painel — **RLS tem que estar
  ligada desde a primeira tabela**, a chave publicável (`NEXT_PUBLIC_*`) é
  pública por definição.
- **O que vem do navegador é conferido no servidor — e de novo no banco.**
  `finalizeAlbum` recebe a lista de fotos do cliente, inclusive o caminho de
  cada arquivo no Storage: todo `storage_path` tem que começar com
  `{user}/{álbum}/`, e há teto de fotos por álbum. Só que **o server action é
  evitável**: com a chave publicável dá para falar direto com o PostgREST. Por
  isso as mesmas invariantes estão em `schema.sql` (o prefixo no `with check`
  da política de insert, o gatilho `enforce_album_photo_cap`, as `check
  constraint` de tamanho). Mexeu num limite, mexa nos dois lugares. Erro de
  banco vai para `console.error`, nunca para a tela — nome de política e de
  coluna descreve o esquema para quem estiver sondando.
- **Destino de redirecionamento vindo da URL passa por `lib/safeNext.ts`.**
  Checar só "começa com `/`" não basta: `/\evil.com` vira `//evil.com` no
  navegador. Não reimplementar essa validação por página.
- **A chave primária de `album_photos` é o par (`album_id`, `id`).** O id da
  foto é gerado no navegador e sobrevive à sessão inteira; com chave só no
  `id`, salvar o mesmo conjunto de fotos duas vezes falhava depois de tudo já
  ter subido para o Storage.
- **Nunca prefixar segredo com `NEXT_PUBLIC_`** (embutiria no bundle do
  navegador). A `service_role key` não é usada neste projeto; se algum dia
  for, sem esse prefixo.
- **`NEXT_PUBLIC_*` é embutido no build**, não no runtime — a CSP é montada a
  partir de `NEXT_PUBLIC_SUPABASE_URL`. Uma env var definida depois do build
  não existe para o app (bloqueio silencioso por CSP, sem rastro no
  servidor) — trocar o valor exige um novo build.
- **A página pública (`/album/[id]`) reusa o `BookStage`** com a prop
  `readOnly`, em vez de um componente de galeria separado.

## Estilo de código / convenções deste repo

- Copy e mensagens do usuário sempre em pt/en via `features/i18n` — nunca
  hardcode string visível fora dos arquivos `copy.ts` de cada feature.
- Regras de design system (cores, fontes, espaçamento) só entram por token em
  `globals.css` — nenhum componente inventa cor/fonte/espaçamento fora dali.
- Object URLs de fotos são revogados ao remover foto, limpar o álbum e
  desmontar componente — não deixar vazar.
