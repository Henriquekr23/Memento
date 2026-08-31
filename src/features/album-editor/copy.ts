/**
 * Textos do editor de álbum, em pt e en.
 * Nenhuma string visível é escrita dentro de componente — regra do repositório.
 */

import type { Lang } from '@/features/i18n/lang';

export interface EditorCopy {
  /* topo */
  albumNameAria: string;
  albumNamePlaceholder: string;
  tabCover: string;
  tabPages: string;
  tabBook: string;
  tabGrid: string;
  views: string;
  guides: string;
  guidesTip: string;
  export: string;
  meta: (spine: string, pages: number) => string;

  /* cores e fontes */
  colorSky: string;
  colorCobalt: string;
  colorRose: string;
  colorRed: string;
  colorYellow: string;
  colorGreen: string;
  colorCream: string;
  colorBlack: string;
  fontAnton: string;
  fontArchivo: string;
  fontBebas: string;
  fontSerif: string;
  fontGrotesk: string;
  fontDm: string;

  /* papéis */
  paperC150: string;
  paperC170: string;
  paperM170: string;
  paperC250: string;

  /* capa */
  colorGroup: string;
  colorNote: string;
  elementsGroup: string;
  addText: string;
  addShape: string;
  elementsNote: string;
  titleGroup: string;
  textGroup: string;
  remove: string;
  fieldFont: string;
  fieldSize: string;
  fieldTracking: string;
  fieldLeading: string;
  fieldWidth: string;
  fieldWidthHint: string;
  fieldRotation: string;
  fieldAlign: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  fieldCase: string;
  caseUpper: string;
  caseOriginal: string;
  fieldPosition: string;
  fieldPositionHint: string;
  titleNote: string;
  freeTextNote: (x: number, y: number) => string;
  untitled: string;

  /* formas */
  shapeGroup: string;
  shapeEye: string;
  shapeDisc: string;
  shapeArch: string;
  shapeStripes: string;
  shapeWaves: string;
  shapeFrame: string;
  fieldShapeSize: string;

  /* lombada */
  spineGroup: string;
  spineMeasure: string;
  spineAuto: string;
  spineManual: string;
  spineThickness: string;
  spineThicknessHint: string;
  spineComputed: (mm: string, pages: number, paper: string, min: number) => string;
  spineDirection: string;
  spineAscending: string;
  spineDescending: string;
  spineOffset: string;
  spineSize: string;
  spineYear: string;
  spineOverflow: (safe: string) => string;

  /* contracapa */
  backGroup: string;
  backShow: string;
  backClean: string;
  backWithText: string;
  backPlaceholder: string;

  /* miolo */
  sheetGroup: string;
  sheetRange: (a: number, b: number) => string;
  sheetSpread: string;
  sheetSpreadHint: string;
  yes: string;
  no: string;
  sheetEditing: string;
  pageLabel: (n: number) => string;
  layoutFull: string;
  layoutInset: string;
  layoutDuoV: string;
  layoutDuoH: string;
  layoutTrio: string;
  layoutQuad: string;
  layoutText: string;
  layoutNote: (name: string) => string;
  pageHeadingPlaceholder: string;
  pageBodyPlaceholder: string;
  frameGroup: (i: number, total: number) => string;
  framePick: string;
  frameNumber: (i: number) => string;
  spreadPhotoGroup: string;
  fieldZoom: string;
  clearFrame: string;
  pageFill: string;
  pageFillHint: string;
  fillBleed: string;
  fillMargin: string;
  pageGap: string;
  pageGapHint: string;
  fieldFit: string;
  fitCover: string;
  fitContain: string;
  fitNote: string;
  recenterFrame: string;
  pageTextGroup: string;
  addCaption: string;
  addOverlay: string;
  addHeader: string;
  textNew: string;
  pageTextNote: string;
  fieldColor: string;
  colorInk: string;
  colorWhite: string;
  colorDark: string;
  fieldBackdrop: string;
  backdropNone: string;
  backdropPaper: string;
  backdropShade: string;
  fieldDepth: string;
  depthFront: string;
  depthBehind: string;
  removeText: string;
  pageNumbers: string;
  pageNumbersHint: string;
  trayGroup: string;
  trayUpload: string;
  trayUsed: string;
  trayNote: string;
  trayEmpty: string;
  innerGroup: string;
  removeSheet: string;
  innerNote: (mm: string) => string;
  newSheet: string;
  prevSheet: string;
  nextSheet: string;

  /* impressão */
  printGroup: string;
  fieldPaper: string;
  printNote: (v: {
    trimW: number;
    trimH: number;
    bleed: number;
    fileW: number;
    fileH: number;
    safeOuter: number;
    safeSpine: number;
    glue: number;
    hinge: number;
  }) => string;

  /* miolo: gesto de folhear */
  flipHint: string;
  /* o mesmo gesto na leitura, onde a folha inteira é a alça */
  flipHintRead: string;

  /* livro 3d */
  orbitHint: string;

  /* zoom do palco */
  zoomGroup: string;
  zoomIn: string;
  zoomOut: string;
  zoomFit: string;

  /* vazio */
  emptyTitle: string;
  emptyBody: string;

  /* tela de partida: escolher as fotos antes de abrir o editor */
  startCount: (n: number) => string;
  startOrderNote: string;
  startManualNote: string;
  startSortByDate: string;
  startRemovePhoto: (name: string) => string;
  startMoveLeft: string;
  startMoveRight: string;
  startConfirm: string;
  startConfirmHint: string;
}

const PT: EditorCopy = {
  albumNameAria: 'Nome do álbum',
  albumNamePlaceholder: 'Álbum sem nome',
  tabCover: 'Capa',
  tabPages: 'Páginas',
  tabBook: 'Livro',
  tabGrid: 'Grade',
  views: 'Vista',
  guides: 'Guias',
  guidesTip: 'Sangria, corte, área segura e vinco',
  export: 'Exportar',
  meta: (spine, pages) => `A5 · 148×210 mm · lombada ${spine} mm · ${pages} pág.`,

  colorSky: 'Azul céu',
  colorCobalt: 'Cobalto',
  colorRose: 'Rosa',
  colorRed: 'Vermelho',
  colorYellow: 'Amarelo',
  colorGreen: 'Verde',
  colorCream: 'Creme',
  colorBlack: 'Preto',
  fontAnton: 'Anton',
  fontArchivo: 'Archivo Black',
  fontBebas: 'Bebas Neue',
  fontSerif: 'Instrument Serif',
  fontGrotesk: 'Space Grotesk',
  fontDm: 'DM Sans',

  paperC150: 'Couché 150g',
  paperC170: 'Couché 170g',
  paperM170: 'Fosco 170g',
  paperC250: 'Couché 250g',

  colorGroup: 'Cor do álbum',
  colorNote:
    'Cor chapada na capa, contracapa e lombada. A segunda cor é usada no texto e nos grafismos.',
  elementsGroup: 'Elementos da capa',
  addText: '+ Texto',
  addShape: '+ Forma',
  elementsNote:
    'Clique num elemento da capa para editar. Arraste para posicionar, use as alças para girar e redimensionar, e as setas do teclado para ajuste fino.',
  titleGroup: 'Título',
  textGroup: 'Texto',
  remove: 'Remover',
  fieldFont: 'Fonte',
  fieldSize: 'Corpo',
  fieldTracking: 'Entreletra',
  fieldLeading: 'Entrelinha',
  fieldWidth: 'Largura',
  fieldWidthHint: 'da caixa',
  fieldRotation: 'Rotação',
  fieldAlign: 'Alinhar',
  alignLeft: 'Esquerda',
  alignCenter: 'Centro',
  alignRight: 'Direita',
  fieldCase: 'Caixa',
  caseUpper: 'MAIÚSCULAS',
  caseOriginal: 'Original',
  fieldPosition: 'Posição',
  fieldPositionHint: 'atalhos',
  titleNote:
    'Este é o título do álbum — o que você escrever aqui aparece também na lombada.',
  freeTextNote: (x, y) => `X ${x}% · Y ${y}% — arraste na capa ou use as setas.`,
  untitled: 'vazio',

  shapeGroup: 'Forma',
  shapeEye: 'Olho',
  shapeDisc: 'Disco',
  shapeArch: 'Arco',
  shapeStripes: 'Listras',
  shapeWaves: 'Ondas',
  shapeFrame: 'Moldura',
  fieldShapeSize: 'Tamanho',

  spineGroup: 'Lombada',
  spineMeasure: 'Medida',
  spineAuto: 'Calcular',
  spineManual: 'Informar',
  spineThickness: 'Espessura',
  spineThicknessHint: 'da gráfica',
  spineComputed: (mm, pages, paper, min) =>
    `${mm} mm — ${pages} páginas em ${paper}, mais 0,6 mm de capa. Mínimo do gabarito: ${min} mm.`,
  spineDirection: 'Direção',
  spineAscending: 'de baixo p/ cima',
  spineDescending: 'de cima p/ baixo',
  spineOffset: 'Posição',
  spineSize: 'Corpo',
  spineYear: 'Ano',
  spineOverflow: (safe) =>
    `O texto passa da área segura da lombada (${safe} mm). Reduza o corpo ou acrescente páginas.`,

  backGroup: 'Contracapa',
  backShow: 'Mostrar',
  backClean: 'Limpa',
  backWithText: 'Com texto',
  backPlaceholder: 'Uma frase, uma data, um lugar.',

  sheetGroup: 'Folha',
  sheetRange: (a, b) => `páginas ${a}–${b}`,
  sheetSpread: 'Espelhado',
  sheetSpreadHint: 'a foto atravessa a folha',
  yes: 'Sim',
  no: 'Não',
  sheetEditing: 'Editando',
  pageLabel: (n) => `Página ${n}`,
  layoutFull: 'Página inteira',
  layoutInset: 'Com margem',
  layoutDuoV: 'Duas lado a lado',
  layoutDuoH: 'Duas empilhadas',
  layoutTrio: 'Uma + duas',
  layoutQuad: 'Quatro',
  layoutText: 'Só texto',
  layoutNote: (name) =>
    `${name}. “Página inteira” é o padrão: a foto sangra até a borda do papel, e a dobra do livro entra por cima dela.`,
  pageHeadingPlaceholder: 'Título da página',
  pageBodyPlaceholder: 'Conte o que aconteceu aqui.',
  frameGroup: (i, total) => `Quadro ${i} de ${total}`,
  framePick: 'Quadro',
  frameNumber: (i) => `Quadro ${i}`,
  spreadPhotoGroup: 'Foto espelhada',
  fieldZoom: 'Zoom',
  clearFrame: 'Tirar foto do quadro',
  pageFill: 'Preenchimento',
  pageFillHint: 'da página',
  fillBleed: 'Até a borda',
  fillMargin: 'Com margem',
  pageGap: 'Respiro',
  pageGapHint: 'entre quadros',
  fieldFit: 'Encaixe',
  fitCover: 'Preencher',
  fitContain: 'Foto inteira',
  fitNote:
    'Preencher recorta o que passa do quadro; foto inteira mostra a imagem toda e deixa o papel aparecer. Nos dois, o zoom aproxima e o arraste escolhe o pedaço — sem nunca deixar sobrar papel dentro do quadro.',
  recenterFrame: 'Centralizar de novo',
  pageTextGroup: 'Texto na página',
  addCaption: '+ Legenda',
  addOverlay: '+ Sobre a foto',
  addHeader: '+ Topo',
  textNew: 'Escreva aqui',
  pageTextNote:
    'Arraste o texto na página para posicionar. Dois cliques nele abrem a digitação; as alças mudam a largura e o corpo.',
  fieldColor: 'Cor',
  colorInk: 'Tinta',
  colorWhite: 'Branco',
  colorDark: 'Escuro',
  fieldBackdrop: 'Fundo',
  backdropNone: 'Nenhum',
  backdropPaper: 'Papel',
  backdropShade: 'Sombra',
  fieldDepth: 'Ordem',
  depthFront: 'Na frente',
  depthBehind: 'Atrás',
  removeText: 'Remover texto',
  pageNumbers: 'Número da página',
  pageNumbersHint: 'no pé, lado externo',
  trayGroup: 'Bandeja',
  trayUpload: 'Enviar',
  trayUsed: 'já está numa página',
  trayNote: 'Clique para colocar no quadro selecionado, ou arraste até a página.',
  trayEmpty: 'Nenhuma foto ainda. Envie as fotos da viagem para começar.',
  innerGroup: 'Miolo',
  removeSheet: 'Remover esta folha',
  innerNote: (mm) =>
    `Páginas entram e saem de duas em duas — é assim que a folha é impressa. Cada folha a mais engorda a lombada em ${mm} mm.`,
  newSheet: 'Nova folha',
  prevSheet: 'Folha anterior',
  nextSheet: 'Próxima folha',

  printGroup: 'Impressão',
  fieldPaper: 'Papel',
  printNote: (v) =>
    `Formato A5 retrato · área final ${v.trimW}×${v.trimH} mm · sangria ${v.bleed} mm em todos os lados (arquivo ${v.fileW}×${v.fileH} mm) · área segura ${v.safeOuter} mm nas bordas e ${v.safeSpine} mm no lado da lombada · área de cola ${v.glue} mm · vinco a ${v.hinge} mm. Conforme gabarito R1219, lombada quadrada.`,

  orbitHint: 'arraste para girar',
  flipHint: 'arraste a borda da folha para virar a página',
  flipHintRead: 'arraste a página para virar',

  zoomGroup: 'Escala',
  zoomIn: 'Aproximar',
  zoomOut: 'Afastar',
  zoomFit: 'Encaixar na tela',

  emptyTitle: 'Comece pelas fotos',
  emptyBody:
    'Envie as fotos da viagem. O Memento lê a data e a hora gravadas em cada arquivo e já monta as páginas em ordem — daí você reorganiza como quiser.',

  startCount: (n) => (n === 1 ? '1 foto escolhida' : `${n} fotos escolhidas`),
  startOrderNote:
    'Em ordem de data e hora, lidas do próprio arquivo. Arraste uma foto sobre outra para trocar de lugar — ou use as setas do cartão, que fazem o mesmo pelo teclado.',
  startManualNote:
    'Ordem definida por você. Fotos novas entram no fim da fila em vez de se misturarem à sequência.',
  startSortByDate: 'Voltar à ordem por data',
  startRemovePhoto: (name) => `Tirar ${name} do álbum`,
  startMoveLeft: 'Mover para trás',
  startMoveRight: 'Mover para a frente',
  startConfirm: 'Confirmar e montar o álbum',
  startConfirmHint:
    'Nada é enviado para lugar nenhum: o álbum abre aqui mesmo, no seu navegador. Dá para acrescentar e trocar fotos depois de abrir.',
};

const EN: EditorCopy = {
  albumNameAria: 'Album name',
  albumNamePlaceholder: 'Untitled album',
  tabCover: 'Cover',
  tabPages: 'Pages',
  tabBook: 'Book',
  tabGrid: 'Grid',
  views: 'View',
  guides: 'Guides',
  guidesTip: 'Bleed, trim, safe area and hinge',
  export: 'Export',
  meta: (spine, pages) => `A5 · 148×210 mm · spine ${spine} mm · ${pages} pp.`,

  colorSky: 'Sky blue',
  colorCobalt: 'Cobalt',
  colorRose: 'Rose',
  colorRed: 'Red',
  colorYellow: 'Yellow',
  colorGreen: 'Green',
  colorCream: 'Cream',
  colorBlack: 'Black',
  fontAnton: 'Anton',
  fontArchivo: 'Archivo Black',
  fontBebas: 'Bebas Neue',
  fontSerif: 'Instrument Serif',
  fontGrotesk: 'Space Grotesk',
  fontDm: 'DM Sans',

  paperC150: 'Coated 150gsm',
  paperC170: 'Coated 170gsm',
  paperM170: 'Matte 170gsm',
  paperC250: 'Coated 250gsm',

  colorGroup: 'Album colour',
  colorNote:
    'Flat colour on the cover, back and spine. The second colour carries the type and the shapes.',
  elementsGroup: 'Cover elements',
  addText: '+ Text',
  addShape: '+ Shape',
  elementsNote:
    'Click an element on the cover to edit it. Drag to place, use the handles to rotate and resize, and the arrow keys for fine adjustment.',
  titleGroup: 'Title',
  textGroup: 'Text',
  remove: 'Remove',
  fieldFont: 'Font',
  fieldSize: 'Size',
  fieldTracking: 'Tracking',
  fieldLeading: 'Leading',
  fieldWidth: 'Width',
  fieldWidthHint: 'of the box',
  fieldRotation: 'Rotation',
  fieldAlign: 'Align',
  alignLeft: 'Left',
  alignCenter: 'Centre',
  alignRight: 'Right',
  fieldCase: 'Case',
  caseUpper: 'UPPERCASE',
  caseOriginal: 'Original',
  fieldPosition: 'Position',
  fieldPositionHint: 'shortcuts',
  titleNote:
    'This is the album title — whatever you write here also shows on the spine.',
  freeTextNote: (x, y) => `X ${x}% · Y ${y}% — drag on the cover or use the arrows.`,
  untitled: 'empty',

  shapeGroup: 'Shape',
  shapeEye: 'Eye',
  shapeDisc: 'Disc',
  shapeArch: 'Arch',
  shapeStripes: 'Stripes',
  shapeWaves: 'Waves',
  shapeFrame: 'Frame',
  fieldShapeSize: 'Size',

  spineGroup: 'Spine',
  spineMeasure: 'Measure',
  spineAuto: 'Calculate',
  spineManual: 'Enter',
  spineThickness: 'Thickness',
  spineThicknessHint: 'from the printer',
  spineComputed: (mm, pages, paper, min) =>
    `${mm} mm — ${pages} pages on ${paper}, plus 0.6 mm of cover. Template minimum: ${min} mm.`,
  spineDirection: 'Direction',
  spineAscending: 'bottom to top',
  spineDescending: 'top to bottom',
  spineOffset: 'Position',
  spineSize: 'Size',
  spineYear: 'Year',
  spineOverflow: (safe) =>
    `The text runs past the spine safe area (${safe} mm). Reduce the size or add pages.`,

  backGroup: 'Back cover',
  backShow: 'Show',
  backClean: 'Clean',
  backWithText: 'With text',
  backPlaceholder: 'A sentence, a date, a place.',

  sheetGroup: 'Sheet',
  sheetRange: (a, b) => `pages ${a}–${b}`,
  sheetSpread: 'Spread',
  sheetSpreadHint: 'the photo crosses the sheet',
  yes: 'Yes',
  no: 'No',
  sheetEditing: 'Editing',
  pageLabel: (n) => `Page ${n}`,
  layoutFull: 'Full page',
  layoutInset: 'With margin',
  layoutDuoV: 'Two side by side',
  layoutDuoH: 'Two stacked',
  layoutTrio: 'One + two',
  layoutQuad: 'Four',
  layoutText: 'Text only',
  layoutNote: (name) =>
    `${name}. “Full page” is the default: the photo bleeds to the paper edge, with the book fold drawn over it.`,
  pageHeadingPlaceholder: 'Page title',
  pageBodyPlaceholder: 'Tell what happened here.',
  frameGroup: (i, total) => `Frame ${i} of ${total}`,
  framePick: 'Frame',
  frameNumber: (i) => `Frame ${i}`,
  spreadPhotoGroup: 'Spread photo',
  fieldZoom: 'Zoom',
  clearFrame: 'Remove photo from frame',
  pageFill: 'Fill',
  pageFillHint: 'of the page',
  fillBleed: 'To the edge',
  fillMargin: 'With margin',
  pageGap: 'Gap',
  pageGapHint: 'between frames',
  fieldFit: 'Fit',
  fitCover: 'Fill frame',
  fitContain: 'Whole photo',
  fitNote:
    'Fill frame crops whatever runs past the frame; whole photo shows the entire image and lets the paper show. In both, zoom moves closer and dragging picks the part — never leaving paper inside the frame.',
  recenterFrame: 'Recentre',
  pageTextGroup: 'Text on the page',
  addCaption: '+ Caption',
  addOverlay: '+ Over the photo',
  addHeader: '+ Top',
  textNew: 'Write here',
  pageTextNote:
    'Drag the text on the page to place it. Double-click it to type; the handles change the width and the size.',
  fieldColor: 'Colour',
  colorInk: 'Ink',
  colorWhite: 'White',
  colorDark: 'Dark',
  fieldBackdrop: 'Backdrop',
  backdropNone: 'None',
  backdropPaper: 'Paper',
  backdropShade: 'Shade',
  fieldDepth: 'Order',
  depthFront: 'In front',
  depthBehind: 'Behind',
  removeText: 'Remove text',
  pageNumbers: 'Page number',
  pageNumbersHint: 'at the foot, outer side',
  trayGroup: 'Tray',
  trayUpload: 'Upload',
  trayUsed: 'already on a page',
  trayNote: 'Click to place in the selected frame, or drag onto the page.',
  trayEmpty: 'No photos yet. Upload the trip photos to start.',
  innerGroup: 'Inner pages',
  removeSheet: 'Remove this sheet',
  innerNote: (mm) =>
    `Pages come and go two at a time — that is how a sheet is printed. Each extra sheet thickens the spine by ${mm} mm.`,
  newSheet: 'New sheet',
  prevSheet: 'Previous sheet',
  nextSheet: 'Next sheet',

  printGroup: 'Printing',
  fieldPaper: 'Paper',
  printNote: (v) =>
    `A5 portrait · trim ${v.trimW}×${v.trimH} mm · ${v.bleed} mm bleed on every side (file ${v.fileW}×${v.fileH} mm) · safe area ${v.safeOuter} mm at the edges and ${v.safeSpine} mm on the spine side · glue area ${v.glue} mm · hinge at ${v.hinge} mm. Per template R1219, square spine.`,

  orbitHint: 'drag to rotate',
  flipHint: 'drag the edge of the sheet to turn the page',
  flipHintRead: 'drag the page to turn it',

  zoomGroup: 'Scale',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomFit: 'Fit to screen',

  emptyTitle: 'Start with the photos',
  emptyBody:
    'Upload the trip photos. Memento reads the date and time recorded in each file and lays the pages out in order — then you rearrange them however you like.',

  startCount: (n) => (n === 1 ? '1 photo chosen' : `${n} photos chosen`),
  startOrderNote:
    'In date and time order, read from the files themselves. Drag one photo onto another to swap them — or use the arrows on the card, which do the same from the keyboard.',
  startManualNote:
    'Your own order. New photos join the end of the queue instead of merging into the sequence.',
  startSortByDate: 'Back to date order',
  startRemovePhoto: (name) => `Remove ${name} from the album`,
  startMoveLeft: 'Move back',
  startMoveRight: 'Move forward',
  startConfirm: 'Confirm and build the album',
  startConfirmHint:
    'Nothing is uploaded anywhere: the album opens right here, in your browser. You can add and swap photos after it opens.',
};

export const EDITOR_COPY: Record<Lang, EditorCopy> = { pt: PT, en: EN };
