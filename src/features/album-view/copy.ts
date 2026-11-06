/**
 * Textos da página de um álbum guardado (`/album/[id]`), em pt e en.
 * Nenhuma string visível nova é escrita dentro de componente — regra do repositório.
 */

import type { Lang } from '@/features/i18n/lang';

export interface AlbumViewCopy {
  byline: (author: string) => string;
  photos: (n: number) => string;
  savedOn: (date: string) => string;
  finished: string;
  backToAlbums: string;
  edit: string;
  downloadPdf: string;
  makeYours: string;
  exporting: (done: number, total: number) => string;
  locale: string;
}

const pt: AlbumViewCopy = {
  byline: (author) => `Um álbum de ${author}`,
  photos: (n) => (n === 1 ? '1 foto' : `${n} fotos`),
  savedOn: (date) => `guardado em ${date}`,
  finished: 'Finalizado',
  backToAlbums: 'Meus álbuns',
  edit: 'Editar o álbum',
  downloadPdf: 'Baixar PDF',
  makeYours: 'Montar o meu',
  exporting: (done, total) => `Desenhando as páginas… ${done}/${total}`,
  locale: 'pt-BR',
};

const en: AlbumViewCopy = {
  byline: (author) => `An album by ${author}`,
  photos: (n) => (n === 1 ? '1 photo' : `${n} photos`),
  savedOn: (date) => `saved on ${date}`,
  finished: 'Finished',
  backToAlbums: 'My albums',
  edit: 'Edit the album',
  downloadPdf: 'Download PDF',
  makeYours: 'Make my own',
  exporting: (done, total) => `Drawing the pages… ${done}/${total}`,
  locale: 'en-US',
};

export const ALBUM_VIEW_COPY: Record<Lang, AlbumViewCopy> = { pt, en };
