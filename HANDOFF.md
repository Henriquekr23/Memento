# Memento — contexto para continuar em outra conversa

Cole este arquivo no início da próxima conversa. Ele resume onde o projeto
está, o que foi decidido e por quê, e o que ficou em aberto.

---

## O produto

**Memento — Keep the Journey**: app web que monta o álbum de uma viagem a
partir das fotos. Lê os metadados EXIF (data, hora, GPS), ordena
cronologicamente e deixa o usuário compor as páginas à mão. **Sem IA
generativa e sem visão computacional** — decisão de escopo, não sugerir.

**Fase 1 (atual):** 100% no navegador, orçamento zero, nenhuma foto sai da
máquina. Fase 2 (futura): contas e persistência via Supabase no free tier.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
`exifr` (EXIF) · `@dnd-kit` (arrastar) · zero backend.
A exportação em PDF é feita à mão, sem biblioteca.

## Estrutura

```
src/
├── app/
│   ├── page.tsx           → landing (/)
│   ├── album/page.tsx     → a aplicação (/album)
│   └── globals.css        → tokens do design system Classical
├── features/
│   ├── landing/           → copy pt/en, mapa de destino, paralaxe
│   ├── photo-upload/      → dropzone, botão + Fotos, importPhotos
│   ├── exif-reader/       → parseExif (nunca lança; EXIF ausente é a regra)
│   ├── album-builder/     → useAlbum (estado), AlbumGrid, AlbumToolbar, AlbumStart
│   ├── album-book/        → o livro 3D (ver abaixo)
│   ├── album-style/       → temas de capa/papel/moldura/letra
│   └── album-export/      → AlbumExporter (contrato) + useAlbumExport
│       └── pdf/           → o álbum em PDF (ver abaixo)
├── components/            → ConfirmDialog
├── lib/                   → paginate.ts, sortPhotos.ts, format.ts (funções puras)
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
- **Estilo**: 6 capas, 4 papéis, 3 molduras, 4 tipografias.
- **Exportação em PDF** — a única saída: uma página do arquivo por página do
  livro, com o papel, a moldura, a inclinação, o recorte e as legendas como
  estão na tela. Dentro de `album-export/pdf/`: `drawPage.ts` desenha a página
  num canvas, `pdfWriter.ts` empilha os JPEGs num PDF **sem biblioteca**
  (filtro `DCTDecode`, JPEG cru), `pdfExporter.ts` orquestra.
  O ZIP das fotos originais existiu e foi removido: dividia a atenção entre "o
  livro" e "os arquivos". Saiu junto o `jszip`. Está no histórico do git.
- **Landing** (`/`) com paralaxe, mapa de destino interativo, tema claro/escuro
  e PT/EN.

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
6. **Zero requisição a terceiros.** Fontes por `next/font` (auto-hospedadas),
   nenhuma CDN. A CSP (`connect-src 'self'`, `font-src 'self'`) transforma
   "as fotos não saem da máquina" em garantia do navegador.
7. **Sem persistência**: nada de `localStorage`/cookies. Recarregar perde o
   álbum — é intencional nesta fase.
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

Para o PDF há `scripts/checkPdfExport.mts` (fora do `tsconfig`, por causa da
dependência nativa): troca o canvas do navegador por um de Node e gera um álbum
de amostra em disco, para conferir as páginas sem abrir a aplicação.

```
npm i --no-save @napi-rs/canvas tsx
npx tsx scripts/checkPdfExport.mts ./fotos album.pdf          # modo alinhado
npx tsx scripts/checkPdfExport.mts ./fotos livre.pdf livre    # papel escuro, cantoneiras, fotos soltas
```

**Limitações do meu ambiente:** não consigo abrir navegador (nenhuma
verificação visual), não alcanço o Google Fonts (valido o build com um
substituto local para as fontes) e não consigo apagar arquivos na pasta do
projeto.

## Pendências

- [ ] **Rodar `git init` e commitar.** O projeto não tem histórico — e já é
      grande demais para seguir assim.
- [ ] Apagar `src/features/album-book/LayoutPicker.tsx` (virou só um
      redirecionamento para `PageControls`; ninguém importa).
- [ ] Conferir o build com as fontes reais (`npm run build`) na sua máquina.
- [ ] Modo de página única no mobile: hoje o spread de duas páginas só encolhe.
- [ ] Legenda e layout de página são guardados pela chave da página, que depende
      da posição — reordenar pode fazer os dois trocarem de página. Ajustes por
      foto e textos não são afetados.
- [ ] Conferir o PDF num navegador de verdade: o `drawPage.ts` foi verificado
      com o canvas do Node, que não é o mesmo motor. Vale olhar principalmente
      as fontes (as pilhas do tema são fontes do sistema) e a memória em um
      álbum grande.
- [ ] O PDF usa A5 retrato fixo. Se o livro ganhar formato paisagem ou quadrado,
      as constantes ficam no topo de `pdf/pdfExporter.ts`.

## Como prefiro trabalhar

Respostas em português, diretas e sem repetir o que já apareceu na tela.
Explicar a causa de um bug, não só o conserto. Dizer quando algo não foi
verificado. Priorizar experiência do usuário e arquitetura que escale.
