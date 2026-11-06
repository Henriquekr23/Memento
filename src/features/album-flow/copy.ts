/**
 * Textos da página /album (as cinco etapas), em pt e en.
 * Nenhuma string visível é escrita dentro de componente — regra do repositório.
 * O editor (etapa 4 por dentro) continua com os dele, em `album-editor/copy.ts`.
 */

import type { SortMode } from './pageGroups';
import type { Lang } from '@/features/i18n/lang';

export interface FlowCopy {
  /* topo e etapas */
  brandAria: string;
  stepsAria: string;
  steps: [string, string, string, string, string];
  stepAria: (n: number, label: string) => string;
  continue: string;

  /* etapa 1 */
  startTitle: string;
  startLead: string;
  coverLabel: string;
  coverPlaceholder: string;
  dropTitle: string;
  dropRelease: string;
  dropOr: string;
  pick: string;
  touchTitle: string;
  ready: (n: number) => string;
  addMore: string;
  importing: string;
  importProgress: (done: number, total: number) => string;
  rejected: (n: number) => string;
  oversized: (n: number) => string;

  /* etapa 2: a ordem */
  orderTitle: string;
  inAlbum: (n: number) => string;
  orderHelpPointer: string;
  orderHelpTouch: string;
  sortByDate: string;
  noTime: string;
  orderPhotoAria: (position: number, name: string, when: string, selected: boolean) => string;
  moveBeforeAria: (name: string) => string;
  outTitle: string;
  outHelp: string;
  restoreAria: (name: string) => string;
  orderEmpty: string;
  pageColumn: (page: number) => string;
  pagesCount: (pages: number) => string;
  pageFull: string;
  newPageColumn: string;
  newPageHint: string;
  newPageAria: string;
  appendToPageAria: (page: number) => string;
  sortLabel: string;
  sortShort: Record<SortMode, string>;
  sortLong: Record<SortMode, string>;
  sortCustomEmpty: string;

  /* comuns às etapas 2 e 3 */
  removeAria: (name: string) => string;
  removed: string;
  undo: string;
  restart: string;
  spreadAria: (first: number, second: number) => string;

  /* etapa 3: as páginas */
  pagesTitle: string;
  pageAria: (page: number) => string;
  textPage: string;
  boardPhotoAria: (page: number, frame: number, isTarget: boolean) => string;
  boardEmptyAria: (page: number, frame: number) => string;
  boardClearAria: (page: number, frame: number) => string;
  openPage: string;
  movePageAria: (page: number) => string;
  movePageTip: string;
  removeSpreadAria: (first: number, second: number) => string;
  addSpread: string;
  addSpreadDrop: string;
  perRowLabel: string;
  perRowAria: (pages: number) => string;
  perRowMore: string;
  perRowFewer: string;
  editPageAria: (page: number) => string;

  /* etapa 4: a capa */
  coverTitle: string;
  finish: string;

  /* etapa 5 */
  finishTitle: string;
  finishLead: string;
  downloadPdf: string;
  backToEdit: string;
  saveCloud: string;
  saving: string;
  exporting: (done: number, total: number) => string;
  cloudProgress: (done: number, total: number) => string;

  /* diálogos */
  discardTitle: string;
  discardBody: (n: number) => string;
  discardConfirm: string;
  cancel: string;
  rebuildTitle: string;
  rebuildBody: string;
  rebuildConfirm: string;
  rebuildKeep: string;

  /* reeditar um álbum guardado (/album/[id]/editar) */
  editContext: string;
  editContextGuest: string;
  backToAlbum: string;
  editFinishTitle: string;
  editFinishLead: string;
  saveEdits: string;
  uploadingNew: (done: number, total: number) => string;

  /** Locale das datas e horas. */
  locale: string;
}

const pt: FlowCopy = {
  brandAria: 'Memento, voltar ao início',
  stepsAria: 'Etapas do álbum',
  steps: ['Nome e fotos', 'Ordem', 'Páginas', 'Capa', 'Finalize'],
  stepAria: (n, label) => `Etapa ${n}: ${label}`,
  continue: 'Continuar',

  startTitle: 'Comece pelas fotos.',
  startLead: 'Dê um nome e solte as fotos.',
  coverLabel: 'Nome do álbum, aparece na capa',
  coverPlaceholder: 'Nome do álbum',
  dropTitle: 'Arraste as fotos para cá.',
  dropRelease: 'Pode soltar.',
  dropOr: 'ou',
  pick: 'Selecionar fotos',
  touchTitle: 'Toque para escolher as fotos',
  ready: (n) => (n === 1 ? '1 foto pronta.' : `${n} fotos prontas.`),
  addMore: 'Adicionar mais',
  importing: 'Lendo as fotos…',
  importProgress: (done, total) => `${done} de ${total}`,
  rejected: (n) =>
    n === 1
      ? '1 arquivo ignorado por não ser uma imagem suportada.'
      : `${n} arquivos ignorados por não serem imagens suportadas.`,
  oversized: (n) =>
    n === 1
      ? '1 arquivo ignorado por passar de 80 MB, grande demais para abrir no navegador.'
      : `${n} arquivos ignorados por passarem de 80 MB, grandes demais para abrir no navegador.`,

  orderTitle: 'Confira a ordem.',
  inAlbum: (n) => (n === 1 ? '1 foto no álbum' : `${n} fotos no álbum`),
  orderHelpPointer: 'Cada coluna é uma página, com até 4 fotos. Arraste uma foto para outro lugar ou outra página.',
  orderHelpTouch: 'Cada coluna é uma página, com até 4 fotos. Toque numa foto e depois onde ela deve entrar.',
  sortByDate: 'Voltar à ordem por data',
  noTime: 'sem data',
  orderPhotoAria: (position, name, when, selected) =>
    selected
      ? `${position}. ${name}, ${when}, selecionada. Escolha onde ela entra, ou use as setas.`
      : `${position}. ${name}, ${when}. Selecionar para mover.`,
  moveBeforeAria: (name) => `Pôr aqui, no lugar de ${name}`,
  outTitle: 'Fora do álbum',
  outHelp: 'Toque numa foto para devolvê-la.',
  restoreAria: (name) => `Devolver ${name} ao álbum`,
  orderEmpty: 'Todas as fotos estão fora do álbum. Toque numa delas abaixo para devolver.',
  pageColumn: (page) => `Página ${page}`,
  pagesCount: (pages) => (pages === 1 ? '1 página' : `${pages} páginas`),
  pageFull: 'Cheia',
  newPageColumn: 'Nova página',
  newPageHint: 'Solte uma foto aqui',
  newPageAria: 'Levar a foto escolhida para uma página nova',
  appendToPageAria: (page) => `Levar a foto escolhida para o fim da página ${page}`,
  sortLabel: 'Ordenar',
  sortShort: {
    date: 'Por data',
    dateDesc: 'Mais recentes',
    name: 'Por nome',
    random: 'Aleatório',
    custom: 'Personalizado',
  },
  sortLong: {
    date: 'Data — mais antigas primeiro',
    dateDesc: 'Data — mais recentes primeiro',
    name: 'Nome do arquivo',
    random: 'Aleatório',
    custom: 'Personalizado',
  },
  sortCustomEmpty: 'Arraste uma foto para criar a sua ordem.',

  removeAria: (name) => `Tirar ${name} do álbum`,
  removed: 'Foto tirada do álbum.',
  undo: 'Desfazer',
  restart: 'Começar de novo',
  spreadAria: (first, second) => `Páginas ${first} e ${second}`,

  pagesTitle: 'Monte as páginas.',
  pageAria: (page) => `Página ${page}`,
  textPage: 'Página de texto',
  boardPhotoAria: (page, frame, isTarget) =>
    isTarget ? `Trocar com a foto ${frame} da página ${page}` : `Foto ${frame} da página ${page}. Escolher para mover.`,
  boardEmptyAria: (page, frame) => `Quadro ${frame} da página ${page}, vazio`,
  boardClearAria: (page, frame) => `Tirar a foto ${frame} da página ${page}`,
  openPage: 'Ajustar fotos',
  movePageAria: (page) => `Mover a página ${page}`,
  movePageTip: 'Segure e arraste para mudar a página de lugar. No teclado, setas ← e →.',
  removeSpreadAria: (first, second) => `Remover as páginas ${first} e ${second}`,
  addSpread: 'Nova página',
  addSpreadDrop: 'Solte para criar a página',
  perRowLabel: 'Páginas por linha',
  perRowAria: (pages) => `${pages} páginas por linha`,
  perRowMore: 'Mais páginas por linha',
  perRowFewer: 'Páginas maiores',
  editPageAria: (page) => `Ajustar as fotos da página ${page}`,

  coverTitle: 'Monte a capa.',
  finish: 'Finalizar',

  finishTitle: 'Seu álbum está pronto.',
  finishLead: 'Folheie antes de baixar. Dá para voltar e mudar o que quiser.',
  downloadPdf: 'Baixar PDF',
  backToEdit: 'Voltar e editar',
  saveCloud: 'Salvar na nuvem',
  saving: 'Guardando…',
  exporting: (done, total) => `Desenhando as páginas… ${done}/${total}`,
  cloudProgress: (done, total) => `Guardando na nuvem… ${done}/${total}`,

  discardTitle: 'Descartar este álbum?',
  discardBody: (n) =>
    `${n === 1 ? 'A foto importada' : `As ${n} fotos importadas`}, a composição das páginas e os textos escritos serão perdidos. Os arquivos no seu computador continuam intactos.`,
  discardConfirm: 'Descartar',
  cancel: 'Cancelar',
  rebuildTitle: 'Refazer as páginas?',
  rebuildBody:
    'A ordem ou as fotos mudaram desde que as páginas foram montadas. Refazer monta as páginas de novo com a ordem nova e desfaz o que foi arrumado nelas; a capa continua como está.',
  rebuildConfirm: 'Refazer as páginas',
  rebuildKeep: 'Manter o que montei',

  editContext: 'Editando um álbum guardado. As mudanças só valem depois de guardar.',
  editContextGuest:
    'Você foi convidado a montar este álbum. As mudanças só valem depois de guardar.',
  backToAlbum: 'Voltar para o álbum',
  editFinishTitle: 'Confira as mudanças.',
  editFinishLead:
    'Folheie antes de guardar. Guardado, o álbum muda no link e para quem monta junto.',
  saveEdits: 'Guardar mudanças',
  uploadingNew: (done, total) => `Enviando as fotos novas… ${done}/${total}`,

  locale: 'pt-BR',
};

const en: FlowCopy = {
  brandAria: 'Memento, back to home',
  stepsAria: 'Album steps',
  steps: ['Name and photos', 'Order', 'Pages', 'Cover', 'Finish'],
  stepAria: (n, label) => `Step ${n}: ${label}`,
  continue: 'Continue',

  startTitle: 'Start with the photos.',
  startLead: 'Give it a name and drop the photos.',
  coverLabel: 'Album name, shown on the cover',
  coverPlaceholder: 'Album name',
  dropTitle: 'Drag the photos here.',
  dropRelease: 'Let go.',
  dropOr: 'or',
  pick: 'Select photos',
  touchTitle: 'Tap to choose the photos',
  ready: (n) => (n === 1 ? '1 photo ready.' : `${n} photos ready.`),
  addMore: 'Add more',
  importing: 'Reading the photos…',
  importProgress: (done, total) => `${done} of ${total}`,
  rejected: (n) =>
    n === 1
      ? '1 file skipped because it is not a supported image.'
      : `${n} files skipped because they are not supported images.`,
  oversized: (n) =>
    n === 1
      ? '1 file skipped for being over 80 MB, too large to open in the browser.'
      : `${n} files skipped for being over 80 MB, too large to open in the browser.`,

  orderTitle: 'Check the order.',
  inAlbum: (n) => (n === 1 ? '1 photo in the album' : `${n} photos in the album`),
  orderHelpPointer: 'Each column is a page, with up to 4 photos. Drag a photo to another spot or another page.',
  orderHelpTouch: 'Each column is a page, with up to 4 photos. Tap a photo, then where it should go.',
  sortByDate: 'Back to date order',
  noTime: 'no date',
  orderPhotoAria: (position, name, when, selected) =>
    selected
      ? `${position}. ${name}, ${when}, selected. Pick where it goes, or use the arrow keys.`
      : `${position}. ${name}, ${when}. Select to move.`,
  moveBeforeAria: (name) => `Put it here, in place of ${name}`,
  outTitle: 'Out of the album',
  outHelp: 'Tap a photo to bring it back.',
  restoreAria: (name) => `Bring ${name} back to the album`,
  orderEmpty: 'Every photo is out of the album. Tap one below to bring it back.',
  pageColumn: (page) => `Page ${page}`,
  pagesCount: (pages) => (pages === 1 ? '1 page' : `${pages} pages`),
  pageFull: 'Full',
  newPageColumn: 'New page',
  newPageHint: 'Drop a photo here',
  newPageAria: 'Move the chosen photo to a new page',
  appendToPageAria: (page) => `Move the chosen photo to the end of page ${page}`,
  sortLabel: 'Sort',
  sortShort: {
    date: 'By date',
    dateDesc: 'Newest',
    name: 'By name',
    random: 'Shuffle',
    custom: 'Custom',
  },
  sortLong: {
    date: 'Date — oldest first',
    dateDesc: 'Date — newest first',
    name: 'File name',
    random: 'Shuffle',
    custom: 'Custom',
  },
  sortCustomEmpty: 'Drag a photo to make your own order.',

  removeAria: (name) => `Take ${name} out of the album`,
  removed: 'Photo taken out of the album.',
  undo: 'Undo',
  restart: 'Start over',
  spreadAria: (first, second) => `Pages ${first} and ${second}`,

  pagesTitle: 'Lay out the pages.',
  pageAria: (page) => `Page ${page}`,
  textPage: 'Text page',
  boardPhotoAria: (page, frame, isTarget) =>
    isTarget ? `Swap with photo ${frame} on page ${page}` : `Photo ${frame} on page ${page}. Select to move.`,
  boardEmptyAria: (page, frame) => `Frame ${frame} on page ${page}, empty`,
  boardClearAria: (page, frame) => `Take photo ${frame} off page ${page}`,
  openPage: 'Adjust photos',
  movePageAria: (page) => `Move page ${page}`,
  movePageTip: 'Hold and drag to move the page. With the keyboard, ← and → arrows.',
  removeSpreadAria: (first, second) => `Remove pages ${first} and ${second}`,
  addSpread: 'New page',
  addSpreadDrop: 'Drop to make the page',
  perRowLabel: 'Pages per row',
  perRowAria: (pages) => `${pages} pages per row`,
  perRowMore: 'More pages per row',
  perRowFewer: 'Bigger pages',
  editPageAria: (page) => `Adjust the photos on page ${page}`,

  coverTitle: 'Build the cover.',
  finish: 'Finish',

  finishTitle: 'Your album is ready.',
  finishLead: 'Flip through it before downloading. You can go back and change anything.',
  downloadPdf: 'Download PDF',
  backToEdit: 'Back to editing',
  saveCloud: 'Save to cloud',
  saving: 'Saving…',
  exporting: (done, total) => `Drawing the pages… ${done}/${total}`,
  cloudProgress: (done, total) => `Saving to the cloud… ${done}/${total}`,

  discardTitle: 'Discard this album?',
  discardBody: (n) =>
    `${n === 1 ? 'The imported photo' : `The ${n} imported photos`}, the page layout and any text you wrote will be lost. The files on your computer stay untouched.`,
  discardConfirm: 'Discard',
  cancel: 'Cancel',
  rebuildTitle: 'Rebuild the pages?',
  rebuildBody:
    'The order or the photos changed since the pages were laid out. Rebuilding lays out the pages again with the new order and undoes what you arranged on them; the cover stays as it is.',
  rebuildConfirm: 'Rebuild the pages',
  rebuildKeep: 'Keep what I built',

  editContext: 'Editing a saved album. Changes only count once you save them.',
  editContextGuest: 'You were invited to build this album. Changes only count once you save them.',
  backToAlbum: 'Back to the album',
  editFinishTitle: 'Check your changes.',
  editFinishLead:
    'Flip through before saving. Once saved, the album changes on its link and for whoever builds it with you.',
  saveEdits: 'Save changes',
  uploadingNew: (done, total) => `Uploading the new photos… ${done}/${total}`,

  locale: 'en-US',
};

export const FLOW_COPY: Record<Lang, FlowCopy> = { pt, en };
