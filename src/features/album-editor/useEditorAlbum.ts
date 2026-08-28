'use client';

import { useCallback, useMemo, useState } from 'react';

import { paperById, spineWidth } from '@/features/album-print/spec';
import type {
  CoverElement,
  EditorAlbum,
  EditorPage,
  PageTextBlock,
  PhotoFrame,
} from '@/types/album-editor';
import {
  MAX_SLOTS,
  layoutById,
  makeMotif,
  makePage,
  makeText,
} from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import { emptyAlbum } from './emptyAlbum';

/** Número mínimo de páginas: um álbum precisa de pelo menos uma folha aberta. */
const MIN_PAGES = 4;

/**
 * Quantas folhas o álbum ganha quando entram fotos demais para as que existem.
 * Páginas entram e saem sempre de duas em duas — é como a folha é impressa.
 */
const PAGES_PER_SHEET = 2;

/**
 * Estado do editor.
 *
 * Aqui mora só a **composição**. O acervo de fotos continua em `useAlbum`
 * (importação, EXIF, ordem cronológica) e chega como parâmetro: o editor sabe
 * *onde* cada foto está, não *de onde* ela veio. É essa divisão que deixa a
 * leitura de EXIF intacta enquanto a montagem muda por completo.
 */
export function useEditorAlbum(initial?: EditorAlbum) {
  const [album, setAlbum] = useState<EditorAlbum>(() => initial ?? emptyAlbum());

  const patch = useCallback((changes: Partial<EditorAlbum>) => {
    setAlbum((current) => ({ ...current, ...changes }));
  }, []);

  /* ── capa ────────────────────────────────────────────────────────────── */

  const updateElement = useCallback((id: string, changes: Partial<CoverElement>) => {
    setAlbum((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === id ? ({ ...element, ...changes } as CoverElement) : element,
      ),
    }));
  }, []);

  /** O título nunca é removível: é ele que a lombada reflete. */
  const removeElement = useCallback((id: string) => {
    setAlbum((current) => ({
      ...current,
      elements: current.elements.filter(
        (element) =>
          element.id !== id || (element.kind === 'text' && element.role === 'title'),
      ),
    }));
  }, []);

  const addText = useCallback((text: string) => {
    const element = makeText({
      text,
      size: 10,
      y: 30,
      font: 'grotesk',
      uppercase: false,
      tracking: 0,
    });
    setAlbum((current) => ({ ...current, elements: [...current.elements, element] }));
    return element.id;
  }, []);

  const addMotif = useCallback(() => {
    const element = makeMotif({ shape: 'disc', y: 30, size: 34 });
    setAlbum((current) => ({ ...current, elements: [...current.elements, element] }));
    return element.id;
  }, []);

  /* ── miolo ───────────────────────────────────────────────────────────── */

  const updatePage = useCallback((index: number, changes: Partial<EditorPage>) => {
    setAlbum((current) => ({
      ...current,
      pages: current.pages.map((page, i) => (i === index ? { ...page, ...changes } : page)),
    }));
  }, []);

  const updateFrame = useCallback(
    (pageIndex: number, slotIndex: number, changes: Partial<PhotoFrame>) => {
      setAlbum((current) => ({
        ...current,
        pages: current.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                slots: page.slots.map((slot, k) =>
                  k === slotIndex ? { ...slot, ...changes } : slot,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  /* ── texto na página ──────────────────────────────────────────────────── */

  /**
   * Os blocos de texto são da **página**, não do álbum: é a página que carrega
   * a legenda daquela foto, e é ela que some quando a folha é removida. Guardar
   * a lista aqui — e não numa camada à parte indexada por página — é o que faz
   * remover uma folha remover o texto dela sem nenhum código a mais.
   */
  const addTextBlock = useCallback((pageIndex: number, block: PageTextBlock) => {
    setAlbum((current) => ({
      ...current,
      pages: current.pages.map((page, i) =>
        i === pageIndex ? { ...page, textBlocks: [...page.textBlocks, block] } : page,
      ),
    }));
    return block.id;
  }, []);

  const updateTextBlock = useCallback(
    (pageIndex: number, id: string, changes: Partial<PageTextBlock>) => {
      setAlbum((current) => ({
        ...current,
        pages: current.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                textBlocks: page.textBlocks.map((block) =>
                  block.id === id ? { ...block, ...changes } : block,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  const removeTextBlock = useCallback((pageIndex: number, id: string) => {
    setAlbum((current) => ({
      ...current,
      pages: current.pages.map((page, i) =>
        i === pageIndex
          ? { ...page, textBlocks: page.textBlocks.filter((block) => block.id !== id) }
          : page,
      ),
    }));
  }, []);

  const addSheet = useCallback(() => {
    setAlbum((current) => ({
      ...current,
      pages: [...current.pages, ...Array.from({ length: PAGES_PER_SHEET }, () => makePage())],
    }));
  }, []);

  /** Remove a folha inteira — a página par e a ímpar que a formam. */
  const removeSheet = useCallback((pageIndex: number) => {
    setAlbum((current) => {
      if (current.pages.length <= MIN_PAGES) return current;
      const first = pageIndex - (pageIndex % 2);
      return {
        ...current,
        pages: current.pages.filter((_, i) => i !== first && i !== first + 1),
      };
    });
  }, []);

  /**
   * Distribui as fotos pelas páginas em ordem cronológica.
   *
   * É o primeiro contato do usuário com o álbum: as fotos que ele acabou de
   * enviar já aparecem no lugar certo, uma por página, na ordem em que foram
   * tiradas. Daí em diante ele arrasta o que quiser. Só mexe em quadros vazios
   * e em fotos que ainda não estão em nenhuma página — refazer o auto-preenche
   * nunca desmancha composição feita à mão.
   */
  const fillChronologically = useCallback((photos: Photo[]) => {
    setAlbum((current) => {
      const placed = new Set(
        current.pages.flatMap((page) =>
          page.slots.map((slot) => slot.photoId).filter((id): id is string => id !== null),
        ),
      );
      const queue = photos.filter((photo) => !placed.has(photo.id));
      if (queue.length === 0) return current;

      const pages = current.pages.map((page) => ({
        ...page,
        slots: page.slots.map((slot) => ({ ...slot })),
      }));

      let cursor = 0;
      for (const page of pages) {
        if (cursor >= queue.length) break;
        const capacity = layoutById(page.layout).slots;
        for (let k = 0; k < capacity && cursor < queue.length; k += 1) {
          if (page.slots[k].photoId === null) {
            page.slots[k].photoId = queue[cursor].id;
            cursor += 1;
          }
        }
      }

      // Sobrou foto: o álbum cresce de folha em folha até caber tudo.
      while (cursor < queue.length) {
        for (let n = 0; n < PAGES_PER_SHEET; n += 1) {
          const page = makePage();
          if (cursor < queue.length) {
            page.slots[0].photoId = queue[cursor].id;
            cursor += 1;
          }
          pages.push(page);
        }
      }

      return { ...current, pages };
    });
  }, []);

  /** Tira uma foto de todos os quadros em que ela apareça. */
  const dropPhoto = useCallback((photoId: string) => {
    setAlbum((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        slots: page.slots.map((slot) =>
          slot.photoId === photoId ? { ...slot, photoId: null } : slot,
        ),
      })),
    }));
  }, []);

  /* ── derivados ───────────────────────────────────────────────────────── */

  /** Espessura efetiva: a informada pela gráfica vence a calculada. */
  const spine = useMemo(() => {
    if (album.spine.mm) return album.spine.mm;
    return spineWidth(album.pages.length, paperById(album.paper).mm);
  }, [album.spine.mm, album.pages.length, album.paper]);

  /** Folhas: pares de páginas, do jeito que a impressão exige. */
  const sheets = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < album.pages.length; i += 2) out.push([i, i + 1]);
    return out;
  }, [album.pages.length]);

  /** Ids das fotos já colocadas em alguma página. */
  const usedPhotoIds = useMemo(
    () =>
      new Set(
        album.pages.flatMap((page) =>
          page.slots.map((slot) => slot.photoId).filter((id): id is string => id !== null),
        ),
      ),
    [album.pages],
  );

  return {
    album,
    setAlbum,
    patch,
    spine,
    sheets,
    usedPhotoIds,
    updateElement,
    removeElement,
    addText,
    addMotif,
    updatePage,
    updateFrame,
    addTextBlock,
    updateTextBlock,
    removeTextBlock,
    addSheet,
    removeSheet,
    fillChronologically,
    dropPhoto,
    maxSlots: MAX_SLOTS,
    minPages: MIN_PAGES,
  };
}

export type EditorAlbumState = ReturnType<typeof useEditorAlbum>;
