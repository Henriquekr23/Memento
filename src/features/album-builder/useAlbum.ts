'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { importPhotos, type ImportProgress } from '@/features/photo-upload/importPhotos';
import { sortPhotosChronologically, type SortDirection } from '@/lib/sortPhotos';
import type { Photo } from '@/types/photo';

/**
 * Estado do álbum. Toda a regra de negócio de montagem vive aqui —
 * a UI só chama estas ações.
 *
 * Fase 2: este hook continua igual; a persistência entra como um efeito
 * adicional (salvar em API) sem alterar a forma do estado.
 */

export interface ImportStatus {
  isImporting: boolean;
  progress: ImportProgress | null;
  rejectedFileNames: string[];
  oversizedFileNames: string[];
}

const INITIAL_STATUS: ImportStatus = {
  isImporting: false,
  progress: null,
  rejectedFileNames: [],
  oversizedFileNames: [],
};

/**
 * O ponto de partida do acervo.
 *
 * Vazio na Fase 1 (a pessoa chega e importa). Preenchido ao reabrir um álbum
 * guardado na nuvem: as fotos vêm do banco, com URL assinada no lugar do
 * object URL, e a ordem que volta é a que foi salva — não a cronológica.
 */
export interface AlbumSeed {
  name?: string;
  photos?: readonly Photo[];
}

export function useAlbum(seed?: AlbumSeed) {
  const [name, setName] = useState(seed?.name ?? '');
  const [photos, setPhotos] = useState<Photo[]>(() => [...(seed?.photos ?? [])]);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [status, setStatus] = useState<ImportStatus>(INITIAL_STATUS);

  /**
   * Enquanto false, novas fotos entram já reordenadas cronologicamente.
   *
   * Um álbum que veio do banco começa como **ordenado à mão**, mesmo que
   * ninguém tenha arrastado nada: aquela ordem é uma decisão já tomada, e
   * reordenar tudo por data ao acrescentar uma foto desmancharia o álbum que a
   * pessoa abriu para mexer num detalhe.
   */
  const [isManuallyOrdered, setIsManuallyOrdered] = useState(
    (seed?.photos?.length ?? 0) > 0,
  );

  // Object URLs precisam ser revogados para não vazar memória.
  const previewUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  /**
   * `destination` decide onde as fotos caem: direto nas páginas ou no depósito.
   * Quem importa pelo "+ Fotos" do depósito quer escolher a dedo onde colocar
   * cada uma — jogá-las no álbum desfaz a composição já feita.
   */
  const addFiles = useCallback(
    async (files: File[], destination: 'album' | 'tray' = 'album') => {
      setStatus({ ...INITIAL_STATUS, isImporting: true });

      const {
        photos: imported,
        rejectedFileNames,
        oversizedFileNames,
      } = await importPhotos(files, (progress) =>
        setStatus((prev) => ({ ...prev, progress })),
      );

      imported.forEach((photo) => previewUrlsRef.current.add(photo.previewUrl));

      setPhotos((prev) => {
        const known = new Set(prev.map((p) => `${p.fileName}:${p.sizeInBytes}`));
        const unique = imported
          .filter((p) => !known.has(`${p.fileName}:${p.sizeInBytes}`))
          .map((photo) => ({ ...photo, included: destination === 'album' }));

        // Sem reordenação manual ainda: mantém a promessa de ordem cronológica.
        // Com reordenação manual: respeita o trabalho do usuário e só anexa.
        return isManuallyOrdered
          ? [...prev, ...sortPhotosChronologically(unique, sortDirection)]
          : sortPhotosChronologically([...prev, ...unique], sortDirection);
      });

      setStatus({
        isImporting: false,
        progress: null,
        rejectedFileNames,
        oversizedFileNames,
      });
    },
    [isManuallyOrdered, sortDirection],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      // Só object URL desta aba é revogado. Foto vinda da nuvem tem URL
      // assinada (`https://`), que não é criada por `createObjectURL` — o
      // `previewUrlsRef` é justamente quem sabe a diferença.
      if (target && previewUrlsRef.current.has(target.previewUrl)) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((photo) => photo.id !== id);
    });
  }, []);

  const toggleIncluded = useCallback((id: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id ? { ...photo, included: !photo.included } : photo,
      ),
    );
  }, []);

  /** Tira fotos do álbum sem apagá-las: elas voltam para o depósito. */
  const sendToTray = useCallback((ids: string | readonly string[]) => {
    const wanted = new Set(typeof ids === 'string' ? [ids] : ids);
    if (wanted.size === 0) return;
    setPhotos((prev) =>
      prev.map((photo) =>
        wanted.has(photo.id) ? { ...photo, included: false } : photo,
      ),
    );
  }, []);

  /**
   * Traz a foto do depósito para o álbum, logo depois de outra foto.
   * A ordem da lista é o que define em que página a foto cai, então "colocar
   * na página X" é, no fundo, "entrar na ordem junto com as fotos dela".
   */
  const placeAfter = useCallback(
    (photoId: string, afterPhotoId: string | null) => {
      setPhotos((prev) => {
        const from = prev.findIndex((photo) => photo.id === photoId);
        if (from === -1) return prev;

        const next = [...prev];
        const [photo] = next.splice(from, 1);
        const placed = { ...photo, included: true };

        if (afterPhotoId === null) {
          next.unshift(placed);
          return next;
        }

        const to = next.findIndex((item) => item.id === afterPhotoId);
        if (to === -1) next.push(placed);
        else next.splice(to + 1, 0, placed);
        return next;
      });
      setIsManuallyOrdered(true);
    },
    [],
  );

  const movePhoto = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setPhotos((prev) => {
      const from = prev.findIndex((photo) => photo.id === fromId);
      const to = prev.findIndex((photo) => photo.id === toId);
      if (from === -1 || to === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setIsManuallyOrdered(true);
  }, []);

  /**
   * Troca duas fotos de posição.
   * No álbum 3D é isto que acontece ao soltar uma foto sobre outra: trocar é
   * mais previsível que inserir, porque não empurra todo o resto para a frente
   * e desmonta as páginas seguintes.
   */
  const swapPhotos = useCallback((aId: string, bId: string) => {
    if (aId === bId) return;
    setPhotos((prev) => {
      const from = prev.findIndex((photo) => photo.id === aId);
      const to = prev.findIndex((photo) => photo.id === bId);
      if (from === -1 || to === -1) return prev;

      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setIsManuallyOrdered(true);
  }, []);

  /**
   * Reescreve a ordem das fotos do álbum. É assim que a reordenação de páginas
   * se aplica: a ordem da lista é que define o que cai em cada página.
   * As fotos do depósito ficam onde estão — não são paginadas.
   */
  const reorderIncluded = useCallback((orderedIds: readonly string[]) => {
    setPhotos((prev) => {
      const byId = new Map(prev.map((photo) => [photo.id, photo]));
      const wanted = new Set(orderedIds);

      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((photo): photo is Photo => photo !== undefined);

      const untouched = prev.filter((photo) => !wanted.has(photo.id));
      return [...reordered, ...untouched];
    });
    setIsManuallyOrdered(true);
  }, []);

  const sortByDate = useCallback((direction: SortDirection = 'asc') => {
    setSortDirection(direction);
    setPhotos((prev) => sortPhotosChronologically(prev, direction));
    setIsManuallyOrdered(false);
  }, []);

  const clear = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setPhotos([]);
    setIsManuallyOrdered(false);
    setStatus(INITIAL_STATUS);
  }, []);

  const includedPhotos = useMemo(
    () => photos.filter((photo) => photo.included),
    [photos],
  );

  /** Depósito: fotos importadas que não estão em nenhuma página. */
  const trayPhotos = useMemo(
    () => photos.filter((photo) => !photo.included),
    [photos],
  );

  const withoutExifDateCount = useMemo(
    () => photos.filter((photo) => photo.timestampSource === 'file').length,
    [photos],
  );

  return {
    name,
    setName,
    photos,
    includedPhotos,
    trayPhotos,
    withoutExifDateCount,
    status,
    sortDirection,
    isManuallyOrdered,
    addFiles,
    removePhoto,
    toggleIncluded,
    sendToTray,
    placeAfter,
    movePhoto,
    swapPhotos,
    reorderIncluded,
    sortByDate,
    clear,
  };
}
