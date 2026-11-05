/**
 * Textos da página /album (as três etapas), em pt e en.
 * Nenhuma string visível é escrita dentro de componente — regra do repositório.
 * O editor (etapa 3 por dentro) continua com os dele, em `album-editor/copy.ts`.
 */

import type { Lang } from '@/features/i18n/lang';

export interface FlowCopy {
  /* topo e etapas */
  brandAria: string;
  stepsAria: string;
  steps: [string, string, string];
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

  /* etapa 2 */
  orderTitle: string;
  timeline: string;
  inAlbum: (inside: number, total: number) => string;
  timelinePrev: string;
  timelineNext: string;
  dayCount: (n: number) => string;
  noDate: string;
  noTime: string;
  timelineHelp: string;
  photoAria: (name: string, time: string, inside: boolean) => string;
  pages: string;
  pagesHelpPointer: string;
  pagesHelpTouch: string;
  perPage: string;
  perPageAria: (n: number) => string;
  slotAria: (name: string, selected: boolean) => string;
  swapWithAria: (name: string) => string;
  emptySlotAria: string;
  moveHereAria: string;
  removeAria: (name: string) => string;
  removed: string;
  undo: string;
  restart: string;
  spreadAria: (first: number, second: number) => string;
  pagesEmpty: string;

  /* etapa 3 */
  buildTitle: string;
  backToPhotos: string;
  backToPhotosAria: string;
  saveCloud: string;
  saving: string;
  discard: string;
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

  /** Locale das datas da linha do tempo. */
  locale: string;
}

const pt: FlowCopy = {
  brandAria: 'Memento, voltar ao início',
  stepsAria: 'Etapas do álbum',
  steps: ['Nome e fotos', 'Confira a ordem', 'Monte o álbum'],
  stepAria: (n, label) => `Etapa ${n}: ${label}`,
  continue: 'Continuar',

  startTitle: 'Comece pelas fotos.',
  startLead: 'Dê um nome e solte as fotos.',
  coverLabel: 'Nome do álbum, aparece na capa',
  coverPlaceholder: 'Nome da viagem',
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
  timeline: 'Linha do tempo',
  inAlbum: (inside, total) => `${inside} de ${total} no álbum`,
  timelinePrev: 'Voltar na linha do tempo',
  timelineNext: 'Avançar na linha do tempo',
  dayCount: (n) => (n === 1 ? '1 foto' : `${n} fotos`),
  noDate: 'Sem data',
  noTime: '--:--',
  timelineHelp: 'Toque numa foto para tirar ou devolver ao álbum.',
  photoAria: (name, time, inside) =>
    `${name}, ${time}, ${inside ? 'no álbum' : 'fora do álbum'}`,
  pages: 'Páginas',
  pagesHelpPointer: 'Arraste uma foto para outro quadro, com foto ou vazio.',
  pagesHelpTouch: 'Toque numa foto e depois no quadro onde ela deve ficar.',
  perPage: 'Fotos por página',
  perPageAria: (n) => (n === 1 ? '1 foto por página' : `${n} fotos por página`),
  slotAria: (name, selected) =>
    selected ? `${name}, selecionada. Escolha o quadro de destino.` : `${name}. Selecionar para mover.`,
  swapWithAria: (name) => `Trocar com ${name}`,
  emptySlotAria: 'Quadro vazio',
  moveHereAria: 'Mover a foto selecionada para este quadro',
  removeAria: (name) => `Tirar ${name} do álbum`,
  removed: 'Foto tirada do álbum.',
  undo: 'Desfazer',
  restart: 'Começar de novo',
  spreadAria: (first, second) => `Páginas ${first} e ${second}`,
  pagesEmpty: 'Todas as fotos estão fora do álbum. Toque numa foto da linha do tempo para devolvê-la.',

  buildTitle: 'Monte o álbum.',
  backToPhotos: 'Fotos',
  backToPhotosAria: 'Voltar para as fotos',
  saveCloud: 'Salvar na nuvem',
  saving: 'Guardando…',
  discard: 'Descartar',
  exporting: (done, total) => `Desenhando as páginas… ${done}/${total}`,
  cloudProgress: (done, total) => `Guardando na nuvem… ${done}/${total}`,

  discardTitle: 'Descartar este álbum?',
  discardBody: (n) =>
    `${n === 1 ? 'A foto importada' : `As ${n} fotos importadas`}, a composição das páginas e os textos escritos serão perdidos. Os arquivos no seu computador continuam intactos.`,
  discardConfirm: 'Descartar',
  cancel: 'Cancelar',
  rebuildTitle: 'Refazer as páginas?',
  rebuildBody:
    'A ordem ou as fotos mudaram desde que você abriu o editor. Refazer monta as páginas de novo com a ordem desta etapa e desfaz o que foi arrumado nelas; a capa continua como está.',
  rebuildConfirm: 'Refazer as páginas',
  rebuildKeep: 'Manter o que montei',

  locale: 'pt-BR',
};

const en: FlowCopy = {
  brandAria: 'Memento, back to home',
  stepsAria: 'Album steps',
  steps: ['Name and photos', 'Check the order', 'Build the album'],
  stepAria: (n, label) => `Step ${n}: ${label}`,
  continue: 'Continue',

  startTitle: 'Start with the photos.',
  startLead: 'Give it a name and drop the photos.',
  coverLabel: 'Album name, shown on the cover',
  coverPlaceholder: 'Trip name',
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
  timeline: 'Timeline',
  inAlbum: (inside, total) => `${inside} of ${total} in the album`,
  timelinePrev: 'Back in the timeline',
  timelineNext: 'Forward in the timeline',
  dayCount: (n) => (n === 1 ? '1 photo' : `${n} photos`),
  noDate: 'No date',
  noTime: '--:--',
  timelineHelp: 'Tap a photo to take it out of the album or bring it back.',
  photoAria: (name, time, inside) =>
    `${name}, ${time}, ${inside ? 'in the album' : 'out of the album'}`,
  pages: 'Pages',
  pagesHelpPointer: 'Drag a photo to another frame, filled or empty.',
  pagesHelpTouch: 'Tap a photo, then the frame where it should go.',
  perPage: 'Photos per page',
  perPageAria: (n) => (n === 1 ? '1 photo per page' : `${n} photos per page`),
  slotAria: (name, selected) =>
    selected ? `${name}, selected. Pick the destination frame.` : `${name}. Select to move.`,
  swapWithAria: (name) => `Swap with ${name}`,
  emptySlotAria: 'Empty frame',
  moveHereAria: 'Move the selected photo to this frame',
  removeAria: (name) => `Take ${name} out of the album`,
  removed: 'Photo taken out of the album.',
  undo: 'Undo',
  restart: 'Start over',
  spreadAria: (first, second) => `Pages ${first} and ${second}`,
  pagesEmpty: 'Every photo is out of the album. Tap a photo in the timeline to bring it back.',

  buildTitle: 'Build the album.',
  backToPhotos: 'Photos',
  backToPhotosAria: 'Back to the photos',
  saveCloud: 'Save to cloud',
  saving: 'Saving…',
  discard: 'Discard',
  exporting: (done, total) => `Drawing the pages… ${done}/${total}`,
  cloudProgress: (done, total) => `Saving to the cloud… ${done}/${total}`,

  discardTitle: 'Discard this album?',
  discardBody: (n) =>
    `${n === 1 ? 'The imported photo' : `The ${n} imported photos`}, the page layout and any text you wrote will be lost. The files on your computer stay untouched.`,
  discardConfirm: 'Discard',
  cancel: 'Cancel',
  rebuildTitle: 'Rebuild the pages?',
  rebuildBody:
    'The order or the photos changed since you opened the editor. Rebuilding lays out the pages again with the order from this step and undoes what you arranged on them; the cover stays as it is.',
  rebuildConfirm: 'Rebuild the pages',
  rebuildKeep: 'Keep what I built',

  locale: 'en-US',
};

export const FLOW_COPY: Record<Lang, FlowCopy> = { pt, en };
