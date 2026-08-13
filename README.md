# Memento — Keep the Journey

Monta o álbum de uma viagem a partir das fotos: lê os metadados EXIF, ordena por
data/hora, permite reordenar e compor as páginas à mão e exporta o álbum pronto
em PDF — capa, miolo e contracapa, uma página do arquivo por página do livro.

**Fase 1 (atual):** 100% client-side. Nenhuma foto sai do navegador, nenhum
backend, nenhum custo de infraestrutura.

## Telas

| Rota | O que é |
| --- | --- |
| `/` | Landing: apresentação do produto, mapa de destino interativo, tema claro/escuro e português/inglês |
| `/album` | A aplicação: importar, montar, folhear e exportar o álbum |

## Visual

O sistema visual é o **Classical** (`_ds/classical/`): fundo quase branco,
Cormorant Garamond sobre Lora, filetes no lugar de blocos preenchidos, botões
com contorno em vez de fundo, e fotografia sempre passada pela moldura
`.plate`. Os tokens vivem em `src/app/globals.css` — nenhum componente inventa
cor, fonte ou espaçamento fora de lá, e as classes (`.btn`, `.input`, `.card`,
`.seg`, `.kicker`) são as do próprio sistema.

As fontes vêm por `next/font` (auto-hospedadas), e não pelo `@import` do Google
Fonts do arquivo original: sem requisição a terceiros em tempo de execução — o
que mantém a CSP (`font-src 'self'`) intacta — e sem salto de layout.

O modo escuro segue o sistema operacional por media query em CSS puro, e o
botão da landing sobrepõe isso com `data-theme` no `<html>`. Sem estado no
React, sem risco de divergência na hidratação.

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
```

Outros comandos: `npm run build`, `npm run lint`, `npx tsc --noEmit`.

Na primeira tela o usuário dá nome ao álbum e escolhe como as fotos entram:
**organizar por data** (o álbum já nasce montado, um dia por página) ou
**eu monto** (tudo vai para o depósito e ele decide o que entra em cada
página). A escolha vem antes da importação de propósito — depois que o álbum já
está montado por data, desmontar tudo para escolher à mão é trabalho perdido,
e é justamente quem quer montar à mão que mais sofreria com isso.

O app tem duas visões sobre o mesmo estado:

- **Álbum** — o livro em 3D, para onde o app vai sozinho assim que as fotos são
  importadas: folhear arrastando a página, escolher o layout de cada página,
  reenquadrar cada foto, escrever legendas e páginas de texto, e trocar o
  estilo de capa/papel/moldura.
- **Grade** — curadoria rápida: ordenar, remover, incluir/excluir, reordenar.

## Estrutura

```
src/
├── app/                      # Rotas (App Router): / é a landing, /album é a aplicação
├── features/
│   ├── landing/              # Página de entrada: copy pt/en, mapa, paralaxe
│   ├── photo-upload/         # Dropzone + File[] → Photo[] (importPhotos.ts)
│   ├── exif-reader/          # parseExif.ts — exifr → PhotoExif normalizado
│   ├── album-builder/        # useAlbum (estado), AlbumGrid (dnd-kit), AlbumToolbar, PhotoCard
│   ├── album-book/           # Livro 3D (ver abaixo)
│   └── album-export/         # AlbumExporter (contrato) + pdf/ (canvas → JPEG → PDF, sem biblioteca)
├── lib/                      # Funções puras: sortPhotos.ts, paginate.ts, format.ts
└── types/                    # Tipos de domínio (Photo, PhotoExif, Album, PageLayout)
```

Dentro de `features/album-book/`, a divisão é por responsabilidade:

| Arquivo | Responsabilidade |
| --- | --- |
| `AlbumBook.tsx` | orquestra: junta estado, arraste de fotos e os pedaços abaixo |
| `BookStage.tsx` | o livro em si: perspectiva, folha girando, sombras, gesto de folhear |
| `BookToolbar.tsx` · `PageStrip.tsx` · `PhotoTray.tsx` | navegação, tira de páginas, depósito |
| `BookPage.tsx` · `PhotoSlot.tsx` · `StoryPage.tsx` | o que existe dentro de uma página |
| `usePageTurn.ts` | **só** navegação: em que spread estamos e como a folha se move |
| `useAlbumBook.ts` | **só** conteúdo: layouts, posições, textos, tema |
| `bookGeometry.ts` | função pura: dado o spread e a virada, o que aparece onde |

`usePageTurn` e `useAlbumBook` eram um hook só. Foram separados porque têm
ritmos diferentes: um muda a cada quadro do arraste, o outro a cada edição do
usuário — e misturar os dois deixava difícil enxergar qual estado estava
mudando por quê.

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
a página, arraste para reordenar, 🗑 para remover. A página fantasma no fim da
lista cria uma página em branco — e ela nasce **no fim**, ancorada num marcador
de fim de álbum (`STORY_ANCHOR_END`) em vez de depender de onde o livro está
aberto. Quem cria uma página espera encontrá-la onde clicou.

Remover uma página **não apaga foto nenhuma**: elas voltam para o depósito e
podem ser recolocadas onde o usuário quiser. O mesmo vale ao converter uma
página de fotos em página de texto pelo seletor de layout (a opção **T**) — as
fotos saem do álbum, não do computador.

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
- **Mudar de página:** arrastar a foto pela alça ⠿ até uma vaga livre da outra
  página. Cada vaga é um alvo de drop próprio — sem isso, o `closestCenter` do
  dnd-kit preferia a foto vizinha justamente quando o usuário mirava no espaço
  em branco. Soltar em cima de outra foto continua trocando as duas.

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
histórias também vão para o PDF, cada uma na página onde está, para o texto não
ficar preso no navegador.

## Peso da landing

Medido no build de produção: **~178 KB gzip** de JavaScript, contra ~290 KB da
aplicação. A diferença é exatamente `exifr` e `dnd-kit` — bibliotecas que só a
aplicação carrega. (Números de antes de o `jszip` sair; a aplicação deve estar
mais leve hoje, mas não remedi.) Três decisões seguram esse número:

- **Nada de re-render por movimento do mouse.** A paralaxe do herói e a
  inclinação da prancha escrevem variáveis CSS direto no elemento, dentro de um
  `requestAnimationFrame` (`usePointerVars`). Se cada `pointermove` virasse
  `setState`, a página reconciliaria dezenas de vezes por segundo.
- **A lista de 177 países entra sob demanda** (`import()` quando o ponteiro
  chega no campo de destino). Até lá o mapa já funciona: destino não
  reconhecido cai num ponto derivado do próprio texto.
- **Todo o conteúdo vem no HTML.** A landing é pré-renderizada; texto, mapa e
  chamadas aparecem antes de qualquer JavaScript executar.

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
- **Uma saída só, e é o álbum.** Houve um segundo botão que baixava as fotos
  originais em ZIP. Ele dividia a atenção entre "o livro" e "os arquivos" — e o
  livro é o produto. Saiu o botão, saiu o `zipExporter` e saiu o `jszip`.
- **PDF sem biblioteca.** Cada página é desenhada num canvas do tamanho do papel
  e vira um JPEG; o `pdfWriter.ts` empilha esses JPEGs num PDF à mão, com filtro
  `DCTDecode` — o JPEG entra cru, sem recompressão. Um jsPDF custaria ~350 KB de
  bundle para usar 2% dele. Uma página por vez na memória: um álbum de 200 fotos
  com todos os canvas vivos derruba a aba.
- **Object URLs são revogados** ao remover foto, limpar o álbum e desmontar o
  componente, senão centenas de fotos vazam memória na aba.

## Segurança

Modelo de ameaças, o que foi verificado e o que ficou em aberto: **[SECURITY.md](SECURITY.md)**.

Resumo: não existe servidor nem segredo para proteger nesta fase, então o
esforço foi em (1) tornar verificável a promessa de que as fotos não saem da
máquina — `connect-src 'self'` na CSP faz o próprio navegador bloquear
qualquer envio, mesmo que uma dependência tentasse; (2) não vazar localização
no arquivo que a pessoa compartilha; (3) não derrubar a aba com arquivo grande
demais.

## Caminho para a Fase 2

A migração não deve tocar em `exif-reader`, `lib/` nem na UI do
`album-builder`. Os dois pontos de costura já estão isolados:

- `features/album-export/types.ts` define o contrato `AlbumExporter`. Criar um
  `apiAlbumExporter` que faz upload e devolve link público e acrescentá-lo ao
  mapa `EXPORTERS` de `useAlbumExport()` dá um terceiro destino sem mudar
  componente nenhum.
- `useAlbum` concentra todo o estado do álbum; a persistência entra como um
  efeito adicional, sem alterar o formato do estado.
- O estado editorial do livro (layouts, posições livres, legendas, histórias,
  tema) vive em `useAlbumBook` e é serializável: são todos objetos simples
  indexados por chave estável, prontos para virar uma linha de banco.

E o item de segurança que **não** pode ser esquecido lá: ligar Row Level
Security desde a primeira tabela do Supabase. A chave anônima é pública por
definição; sem RLS ela dá acesso ao banco inteiro.
