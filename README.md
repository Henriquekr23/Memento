# Memento — Keep the Journey

Monta o álbum de uma viagem a partir das fotos: lê os metadados EXIF, ordena por
data/hora, permite reordenar e selecionar manualmente e exporta tudo em ZIP.

**Fase 1 (atual):** 100% client-side. Nenhuma foto sai do navegador, nenhum
backend, nenhum custo de infraestrutura.

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
```

Outros comandos: `npm run build`, `npm run lint`, `npx tsc --noEmit`.

O app tem duas visões sobre o mesmo estado:

- **Álbum** — o livro em 3D, para onde o app vai sozinho assim que as fotos são
  importadas: folhear arrastando a página, escolher o layout de cada página,
  reenquadrar cada foto, escrever legendas e páginas de texto, e trocar o
  estilo de capa/papel/moldura.
- **Grade** — curadoria rápida: ordenar, remover, incluir/excluir, reordenar.

## Estrutura

```
src/
├── app/                      # Rota única (App Router). page.tsx só compõe as features.
├── features/
│   ├── photo-upload/         # Dropzone + File[] → Photo[] (importPhotos.ts)
│   ├── exif-reader/          # parseExif.ts — exifr → PhotoExif normalizado
│   ├── album-builder/        # useAlbum (estado), AlbumGrid (dnd-kit), AlbumToolbar, PhotoCard
│   ├── album-book/           # Livro 3D: AlbumBook, BookPage, PhotoSlot, bookGeometry, useAlbumBook
│   └── album-export/         # AlbumExporter (contrato) + zipExporter (JSZip)
├── lib/                      # Funções puras: sortPhotos.ts, paginate.ts, format.ts
└── types/                    # Tipos de domínio (Photo, PhotoExif, Album, PageLayout)
```

## O álbum em 3D

Feito com CSS 3D puro (`perspective` + `transform-style: preserve-3d` +
`rotateY`), sem biblioteca. Consideramos StPageFlip/react-pageflip: dobra o
papel de forma mais realista, mas está sem manutenção desde 2022 e captura o
arraste da página inteira — o que inviabilizaria arrastar fotos *dentro* da
página, que é metade da experiência aqui.

- **O álbum abre fechado**, mostrando só a capa, centralizada. Isso sai de uma
  única fórmula em `bookGeometry.ts`: `esquerda(s) = 2s-1`, `direita(s) = 2s`.
  No spread 0 a esquerda cai em −1, ou seja, não existe — a capa fica sozinha à
  direita. Enquanto a capa gira, o livro inteiro desliza para a esquerda no
  mesmo ritmo (`openness`), e é isso que dá a sensação de abrir o álbum.
- **Folhear** é um gesto contínuo: arrastar em qualquer parte livre da página
  gira a folha acompanhando o dedo/mouse; soltar antes de 30% ela volta.
  Clique seco na borda externa, setas ← → e a barra de navegação também viram.
  Com o álbum fechado, clicar em qualquer ponto da capa abre.
- **A geometria vive em `bookGeometry.ts`**, uma função pura que responde "qual
  página aparece onde durante a virada". É a parte que mais quebra ao mexer no
  visual, e assim dá para testar sem navegador.
- **Espessura**: as folhas restantes de cada lado viram tirinhas na borda, então
  o livro visivelmente "engorda" de um lado conforme você avança.
- **Paginação** (`lib/paginate.ts`): cada dia da viagem começa numa página nova,
  e o layout padrão sai da quantidade de fotos que sobrou naquele dia
  (4→quad, 3→trio, 2→empilhadas, 1→página inteira). Trocar o layout de uma
  página re-encaixa as fotos seguintes sem perder nenhuma.
- **Enquadrar** usa `object-position`, que o navegador já clampa: por mais que o
  usuário arraste, nunca sobra buraco branco na foto. O zoom usa
  `transform-origin` no mesmo ponto de foco, então ampliar também não abre gap.
- **Dois gestos que não brigam**: arrastar a foto reenquadra; arrastar pela alça
  ⠿ troca a foto de lugar com outra. Soltar sobre outra foto **troca** as duas
  em vez de inserir — inserir empurraria todo o resto e remontaria as páginas
  seguintes.
- **Espontâneo vs. alinhado**: no modo espontâneo cada foto ganha uma inclinação
  derivada do próprio id (estável entre renders, não sorteada), como fotos
  coladas à mão.

## Estilo e texto

**Estilo** (`features/album-style/theme.ts`): capa (6 materiais), papel (4),
moldura das fotos (margem branca, cantoneiras de papel ou sangrada) e
tipografia (4 stacks do sistema — buscar fonte externa deixaria o app
dependente de rede, e o build já quebrou uma vez por isso). Tudo vira CSS
custom properties aplicadas na raiz do livro; os componentes só leem
`var(--paper-base)`, `var(--cover-ink)` etc. Criar um tema novo é acrescentar
uma linha nesse arquivo, sem tocar em componente nenhum.

**Texto** em três níveis:

- legenda por foto, escrita embaixo da própria foto na página;
- legenda por página, no cabeçalho (o rótulo do dia é o placeholder);
- páginas inteiras de história, inseridas com "+ Página de texto" logo depois
  da página aberta — e o livro já avança para mostrar onde ela caiu.

As páginas de história são ancoradas à página de fotos anterior. Se a âncora
sumir (as fotos foram removidas), a história vai para o fim do álbum em vez de
desaparecer: perder texto escrito pelo usuário seria imperdoável. Legendas e
histórias também entram no `indice.txt` do ZIP, para o texto não ficar preso no
navegador.

## Decisões que importam

- **EXIF ausente é a regra, não a exceção.** Prints, imagens editadas e fotos
  vindas de apps de mensagem chegam sem EXIF. Nesses casos o app usa
  `file.lastModified` e marca a foto com o selo "sem EXIF" — o usuário vê que
  aquela data é menos confiável.
- **Ordem manual vence a automática.** Enquanto o usuário não arrasta nada,
  fotos novas entram já reordenadas cronologicamente. Depois do primeiro
  arraste, novas fotos são apenas anexadas ao fim, e a reordenação total só
  acontece se ele clicar no botão de ordenar por data.
- **Incluir ≠ remover.** O olho tira a foto do álbum exportado sem apagá-la da
  lista; o ✕ descarta de vez (e revoga o object URL).
- **ZIP sem compressão** (`STORE`): JPEG já é comprimido, então comprimir de
  novo só gasta CPU. Dentro do ZIP vai um `indice.txt` com data, GPS, câmera e
  nome original de cada foto.
- **Object URLs são revogados** ao remover foto, limpar o álbum e desmontar o
  componente, senão centenas de fotos vazam memória na aba.

## Caminho para a Fase 2

A migração não deve tocar em `exif-reader`, `lib/` nem na UI do
`album-builder`. Os dois pontos de costura já estão isolados:

- `features/album-export/types.ts` define o contrato `AlbumExporter`. Criar um
  `apiAlbumExporter` que faz upload e devolve link público e passá-lo para
  `useAlbumExport()` substitui o ZIP sem mudar componente nenhum.
- `useAlbum` concentra todo o estado do álbum; a persistência entra como um
  efeito adicional, sem alterar o formato do estado.
