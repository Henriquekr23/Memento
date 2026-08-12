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

- **O álbum abre e fecha nas duas capas.** Uma fórmula só, em `bookGeometry.ts`:
  `esquerda(s) = 2s-1`, `direita(s) = 2s`. No primeiro spread a esquerda cai em
  −1 e a capa fica sozinha à direita; no último, a direita cai fora do array e
  a contracapa fica sozinha à esquerda. Enquanto a capa gira, o livro desliza
  no mesmo ritmo (`offset`) para centralizar a capa visível — é isso que dá a
  sensação de abrir e, no fim, de fechar o álbum.
- **Folhear** é um gesto contínuo: arrastar em qualquer parte livre da página
  gira a folha acompanhando o dedo/mouse; soltar antes de 30% ela volta.
  Clique seco na borda externa, setas ← → e a barra de navegação também viram.
  Com o álbum fechado, clicar em qualquer ponto da capa abre.
- **A geometria vive em `bookGeometry.ts`**, uma função pura que responde "qual
  página aparece onde durante a virada". É a parte que mais quebra ao mexer no
  visual, e assim dá para testar sem navegador.
- **Espessura**: as folhas restantes de cada lado viram tirinhas na borda, então
  o livro visivelmente "engorda" de um lado conforme você avança. Ela some junto
  com a abertura: de frente para um livro fechado você vê a capa e mais nada —
  as folhas estão atrás dela.
- **Paginação** (`lib/paginate.ts`): cada dia da viagem começa numa página nova,
  e o layout padrão sai da quantidade de fotos que sobrou naquele dia
  (4→quad, 3→trio, 2→empilhadas, 1→página inteira). Trocar o layout de uma
  página re-encaixa as fotos seguintes sem perder nenhuma.
- **Nunca sobra página vazia no fim.** O total de páginas precisa ser par para
  as duas capas ficarem isoladas. Quando o miolo dá número par, a página que
  falta entra **no começo**, como guarda atrás da capa, e a folha de rosto passa
  para a seguinte — que é exatamente onde um álbum de verdade tem uma guarda.
  Com uma foto só, o álbum fica: capa · (folha de rosto | foto) · contracapa.
- **Layout é dado, não CSS.** Cada template é uma lista de retângulos em % da
  área útil (`PAGE_LAYOUTS`), e toda foto é posicionada por esses números. A
  mesma geometria serve para desenhar a página alinhada, para animar a troca de
  layout e para dar o ponto de partida do modo espontâneo. Template novo é um
  objeto a mais nesse arquivo.
- **Enquadrar** usa `object-position`, que o navegador já clampa: por mais que o
  usuário arraste, nunca sobra buraco branco na foto. O zoom usa
  `transform-origin` no mesmo ponto de foco, então ampliar também não abre gap.

### Alinhado vs. espontâneo

A escolha é **por página**, no canto superior direito dela (▦ layout ↔ ✥ livre):
compor é decisão editorial e muda de página para página — uma abertura pode ter
quatro fotos alinhadas e a seguinte, uma colagem solta.

| | Alinhado (▦) | Livre (✥) |
| --- | --- | --- |
| Posição | encaixada no slot do layout | livre, arrastando a foto |
| Tamanho | do slot | alça ◢ no canto, ou o controle "Tamanho" |
| Arrastar a foto | reenquadra | move pela página |
| Trocar de lugar | alça ⠿ (solta sobre outra foto e as duas trocam) | desnecessário |
| Girar | controle "Girar" | alça ↻ (clique duplo endireita) |
| Inclinação padrão | reta | leve, derivada do id da foto — desligável no botão "Tortinhas/Retas" |

A inclinação automática é uma opção separada do modo justamente porque uma
coisa é querer posicionar as fotos à mão, outra é querer todas tortas. E o
ângulo escolhido pelo usuário sempre vence o automático, **inclusive quando é
zero**: quem endireitou uma foto não quer que ela volte a torta. Arrastando a
alça, há um ímã de 2,5° no zero, então deixar reta no gesto é fácil.

Trocar de modo não destrói nada: as posições livres ficam guardadas e voltam
quando o usuário volta para o espontâneo. E soltar uma foto sobre outra
**troca** as duas em vez de inserir — inserir empurraria todo o resto e
remontaria as páginas seguintes.

A prévia arrastada é renderizada num `DragOverlay` (portal fora da página).
Sem isso a foto não acompanhava o cursor e ainda era cortada pelo
`overflow: hidden` da folha.

### Tira de páginas

A faixa embaixo do livro mostra o miolo inteiro em miniatura: clique para ir até
a página, arraste para reordenar. Ela substituiu o slider de navegação.

Reordenar página é reescrever a ordem das fotos — que continua sendo a fonte de
verdade — e reancorar os textos. Para isso a página de história deixou de ser
ancorada na *chave da página* e passou a ser ancorada no **id de uma foto**: a
foto é a única coisa que continua a mesma quando o layout muda, a paginação
recalcula ou o usuário reordena. Se a foto âncora vai para o depósito, a
história cai no fim do álbum em vez de sumir.

Consequência conhecida: legenda e layout escolhidos para uma página são
guardados pela chave da página, que depende da posição. Reordenar pode fazer
esses dois trocarem de página. Os ajustes por foto (posição, enquadramento,
rotação, legenda) e o texto das histórias não são afetados.

### Depósito de fotos

A faixa acima do livro é o depósito: fotos importadas que não estão em nenhuma
página. Fica sempre visível no modo Álbum, mesmo vazio — é o que torna o
caminho de ida e volta descobrível.

- **Tirar da página:** o ↑ no canto da foto, ou arrastar a foto até o depósito.
- **Colocar na página:** clicar na foto do depósito, ou arrastar até a página
  que quiser (a página acende em âmbar; em vermelho se já estiver cheia).

O clique **sempre** tem um destino: a página aberta, senão a primeira com
espaço, senão uma página nova no fim — e o álbum vira até lá e seleciona a foto.
Antes, com o álbum fechado na capa não havia página aberta e o clique não fazia
nada, o que parecia um depósito quebrado.

Duas decisões por trás disso:

- **Depósito é o mesmo estado que "foto não incluída" do modo Grade.** Em vez de
  criar uma lista paralela, o depósito só dá cara de bancada de trabalho a um
  estado que já existia — os dois modos continuam contando a mesma história.
- **A ordem da lista continua sendo a fonte de verdade da sequência.** "Colocar
  na página X" é, no fundo, entrar na ordem logo depois das fotos dela. Isso
  esbarrava numa regra antiga: foto de outro dia abriria uma página nova em vez
  de entrar naquela. Daí o `groupKeys` — a foto passa a pertencer ao grupo
  daquela página. É uma linha na paginação (`groupKeyOf`) em vez de um segundo
  modelo de dados para composição manual.

O limite de 4 fotos por página não é um número solto: é a capacidade do maior
layout (`MAX_PHOTOS_PER_PAGE` sai de `PAGE_LAYOUTS`). Ao receber uma foto, a
página cresce só o necessário — de `single` para `duo`, de `duo` para `trio` — e
recusa a quinta, mostrando o aviso na própria página.

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

## Segurança

Modelo de ameaças, o que foi verificado e o que ficou em aberto: **[SECURITY.md](SECURITY.md)**.

Resumo: não existe servidor nem segredo para proteger nesta fase, então o
esforço foi em (1) tornar verificável a promessa de que as fotos não saem da
máquina — `connect-src 'self'` na CSP faz o próprio navegador bloquear
qualquer envio, mesmo que uma dependência tentasse; (2) não vazar localização
no ZIP compartilhado; (3) não derrubar a aba com arquivo grande demais.

## Caminho para a Fase 2

A migração não deve tocar em `exif-reader`, `lib/` nem na UI do
`album-builder`. Os dois pontos de costura já estão isolados:

- `features/album-export/types.ts` define o contrato `AlbumExporter`. Criar um
  `apiAlbumExporter` que faz upload e devolve link público e passá-lo para
  `useAlbumExport()` substitui o ZIP sem mudar componente nenhum.
- `useAlbum` concentra todo o estado do álbum; a persistência entra como um
  efeito adicional, sem alterar o formato do estado.
- O estado editorial do livro (layouts, posições livres, legendas, histórias,
  tema) vive em `useAlbumBook` e é serializável: são todos objetos simples
  indexados por chave estável, prontos para virar uma linha de banco.

E o item de segurança que **não** pode ser esquecido lá: ligar Row Level
Security desde a primeira tabela do Supabase. A chave anônima é pública por
definição; sem RLS ela dá acesso ao banco inteiro.
