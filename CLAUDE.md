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
npx tsx scripts/checkComposition.mts     # ida/volta da composição por JSON, entradas corrompidas, migração da v1, poda de quadros órfãos
npx tsx scripts/checkPrintSpec.mts       # geometria de impressão: formato, sangria, lombada, corpo do texto

# Supabase (exige conta de verdade; apaga o álbum de teste no fim):
MEMENTO_EMAIL=... MEMENTO_PASSWORD=... npx tsx scripts/checkSupabaseSave.mts
```

O checklist de verificação antes de considerar algo pronto: `npx tsc --noEmit`
→ `npm run lint` → `npm run build` → os scripts acima quando a mudança tocar
geometria de impressão, composição ou PDF.

## Arquitetura

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `exifr` (EXIF)
· `@dnd-kit` (arrastar na grade) · `@supabase/ssr` + `@supabase/supabase-js`
(Fase 2). Sete dependências de produção — é para continuar assim; PDF é gerado
à mão, sem biblioteca, e o editor não trouxe nenhuma (ícones, arraste e o livro
3D são código local).

```
src/
├── app/                    # Rotas (App Router): /, /sobre, /obrigado, /album,
│                            # /albums, /entrar, /conta, /album/[id]
├── features/                # um módulo por funcionalidade, ver abaixo
├── components/              # ConfirmDialog, Logo, SiteNav, SiteFooter, Tooltip
├── lib/                     # funções puras (sortPhotos, format, safeNext) + lib/supabase/
├── proxy.ts                 # o antigo middleware.ts — renomeado no Next 16, não recriar middleware.ts
└── types/                   # Photo, PhotoExif, EditorAlbum e o resto do modelo do editor
```

Features relevantes: `exif-reader` (parseExif, nunca lança), `album-builder`
(`useAlbum` = o **acervo**: importação, EXIF, ordem cronológica),
`album-print` (a régua de impressão, em milímetros), `album-editor` (o editor
inteiro, ver abaixo), `album-export` (contrato `AlbumExporter` + `pdf/`), `auth`
e `album-save` (Fase 2, ver abaixo), `i18n` (pt/en via localStorage), `theme`
(claro/escuro via `data-theme` no `<html>`, sem estado React).

O visual continua sendo o design system **Organic** (papel areia, acento
terracota, cantos de 8/16/28px e controles pequenos em pílula), nos tokens do
topo de `globals.css` — nenhum componente inventa cor, fonte ou espaçamento
fora dali. As classes `.ae-*` do editor vivem na mesma `@layer components` e
lêem os mesmos tokens; a única cor saturada da tela do editor é `--ae-accent`,
escrita em linha a partir da cor de capa escolhida.

### `album-editor/` — divisão por responsabilidade

O editor substituiu o antigo `album-book/`, em que as páginas eram *derivadas*
da ordem da lista de fotos. Ali não havia onde pendurar capa editável, lombada
ou área segura em milímetros: agora a composição é explícita — cada quadro
guarda o id de uma foto. A ordem cronológica não sumiu, virou o **estado
inicial** (`fillChronologically`), que é o que a pessoa vê antes de mexer em
qualquer coisa.

| Arquivo | Responsabilidade |
| --- | --- |
| `AlbumEditor.tsx` | orquestra: abas, palco, escala, teclado, os pedaços abaixo |
| `useEditorAlbum.ts` | **só** a composição (capa, lombada, páginas, quadros) |
| `CoverWrap.tsx` | o desdobre completo: contracapa · lombada · capa |
| `Book3D.tsx` | o álbum como objeto, orbitável |
| `PageView.tsx` / `PageContent.tsx` | a página e o conteúdo dela |
| `CoverElementView.tsx` | um elemento da capa, com arraste e alças |
| `PrintGuides.tsx` | sangria, corte, área segura e vinco — por lado |
| `CoverInspector.tsx` / `PagesInspector.tsx` | os controles, sem estado próprio |
| `palette.ts` / `motifPaths.ts` / `copy.ts` | cores, grafismos e textos |

O acervo (`useAlbum`) e a composição (`useEditorAlbum`) são separados de
propósito: um sabe *de onde a foto veio*, o outro sabe *onde ela está*. Não
voltar a juntá-los — foi o que permitiu trocar a montagem inteira sem tocar na
leitura de EXIF.

### Decisões arquiteturais que não devem ser desfeitas sem motivo

1. **A composição é dado, não derivação.** Cada `PhotoFrame` guarda `photoId`.
   A ordem cronológica preenche os quadros vazios na chegada das fotos e nunca
   desmancha o que já foi montado à mão.
2. **Coordenadas ancoradas na área final, não no arquivo com sangria.**
   `x`/`y` de um elemento de capa são % do retângulo de corte. Medir a partir
   do arquivo deixaria "centralizado" 2,5 mm fora do centro impresso.
3. **Guias de impressão por lado** (`PrintGuides`, `bleed: {top,right,…}`). A
   capa não sangra do lado da lombada, a contracapa não sangra do outro, e a
   lombada não sangra em lado nenhum — ali é dobra, não corte. Guia desenhada
   igual nos quatro lados mente sobre onde a faca passa.
4. **Nada que o usuário criou pode sumir.** Trocar de layout não apaga a foto
   do quadro 4: a página guarda sempre `MAX_SLOTS` quadros. Remover uma folha
   remove as duas páginas dela; a foto continua no acervo.
5. **`Slot` dentro de `PageContent` é função, não componente.** Chamada como
   `slot(0, style)`. Virando `<Slot />`, o React remonta o `<img>` a cada
   render e o arraste de enquadramento pisca. Já foi corrigido uma vez.
6. **A geometria de impressão é função pura** (`album-print/spec.ts`),
   verificada por `scripts/checkPrintSpec.mts`. Toda medida é milímetro, e
   arredondada — `5.72 - 2` em ponto flutuante vira teto de controle e limiar
   de aviso na tela.
7. **Zero requisição a terceiros, em execução e no build.** As fontes
   (`Bricolage Grotesque` e `Figtree` para a interface; `Anton`,
   `Archivo Black`, `Bebas Neue`, `Instrument Serif`, `Space Grotesk` e
   `DM Sans` para a capa) são `.woff2` versionados em `src/app/fonts/`,
   carregados por `next/font/local` — **nunca voltar para `next/font/google`**,
   que baixa arquivos durante o build e quebra sem rede, nem para o `@import`
   do Google Fonts. Vale para imagem: a foto do herói é `public/hero.jpg`,
   versionada. A CSP (`connect-src 'self'`, `font-src 'self'`, `img-src
   'self'`) faz o navegador garantir isso.
8. **O PDF redesenha a página num canvas, em milímetros.** Em
   `album-export/pdf/drawPrintPage.ts` a régua é `mm()`, não pixel de tela: o
   arquivo tem que bater com o gabarito, e gabarito é medido em mm. O arquivo
   sai na estrutura do R1219 — capa, contracapa e lombada em páginas próprias,
   miolo uma página por página, tudo com 5 mm de sangria. `pdfWriter.ts`
   empilha os JPEGs à mão (filtro `DCTDecode`, sem recompressão).
9. **`motifPaths.ts` é a fonte única dos grafismos.** A tela desenha em SVG e o
   canvas do PDF desenha o mesmo `d` num `Path2D`. Dois desenhos parecidos em
   dois arquivos é como se perde a fidelidade entre tela e impresso.
10. **`canvasFontFamily` é a única ponte entre CSS e canvas.** `next/font/local`
    publica o nome da família só numa custom property, e o canvas não tem
    cascata; a função lê a propriedade computada. Antes de desenhar, esperar
    `document.fonts.ready` — sem isso o título sai na fonte substituta.
11. **As classes do design system (`.btn`, `.input`, `.card`, `.seg`, `.ae-*`,
    …) vivem em `@layer components` dentro de `globals.css`.** CSS fora de
    camada vence CSS dentro de uma — soltas, elas perdiam para utilitários do
    Tailwind (`className="btn hidden sm:inline-flex"` não escondia nada). Não
    tirar nada dessa camada.
12. **`useIsNarrow` (`max-width: 767px`) ≠ `useIsTouch` (`hover: none`).**
    Toque não é largura: controle que só aparece no hover usa `useIsTouch`, não
    breakpoint — um laptop touch é largo e ainda precisa das alças visíveis.
13. **Movimento de mouse não passa pelo React na landing** — variáveis CSS
    escritas via ref dentro de `requestAnimationFrame` (`usePointerVars`).
14. **Sem persistência de conteúdo fora da Fase 2.** Recarregar `/album` (modo
    local) perde o álbum — intencional. Exceções que não são conteúdo: idioma
    (`localStorage`) e a ponte para `/obrigado` (`sessionStorage`, consumida na
    leitura).

### Fase 2 — Supabase (auth + persistência)

- **Conta é opcional e não navega.** `/album` nunca exige login; a conta só
  entra ao clicar "Salvar na nuvem". `InlineAuthDialog` autentica pelo cliente
  do navegador sem redirect (um redirect destruiria o álbum em memória);
  terminado o login, `useAlbumSave.resume()` continua o salvamento de onde
  parou.
- **O que é salvo:** uma linha por foto (ordem, caminho no Storage, data) +
  a composição inteira num JSONB (versão 2 = o `EditorAlbum` inteiro). `album-save/composition.ts` é a fronteira:
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
- **A página pública (`/album/[id]`) reusa `Book3D` e `PageView`**, em vez de
  um componente de galeria separado: o objeto é o produto.
- **Foto de contribuição chega na bandeja, não numa página.** Aprovar acrescenta
  uma linha em `album_photos` e não toca na `composition` — escrever a foto numa
  página seria mexer na composição de alguém sem pedir.

## Estilo de código / convenções deste repo

- Copy e mensagens do usuário sempre em pt/en via `features/i18n` — nunca
  hardcode string visível fora dos arquivos `copy.ts` de cada feature.
- Regras de design system (cores, fontes, espaçamento) só entram por token em
  `globals.css` — nenhum componente inventa cor/fonte/espaçamento fora dali.
- Object URLs de fotos são revogados ao remover foto, limpar o álbum e
  desmontar componente — não deixar vazar.
