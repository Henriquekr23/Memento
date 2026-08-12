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

export function useAlbum() {
  const [name, setName] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [status, setStatus] = useState<ImportStatus>(INITIAL_STATUS);

  /** Enquanto false, novas fotos entram já reordenadas cronologicamente. */
  const [isManuallyOrdered, setIsManuallyOrdered] = useState(false);

  // Object URLs precisam ser revogados para não vazar memória.
  const previewUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
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
        const unique = imported.filter(
          (p) => !known.has(`${p.fileName}:${p.sizeInBytes}`),
        );

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
      if (target) {
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

  /** Tira a foto do álbum sem apagá-la: ela volta para o depósito. */
  const sendToTray = useCallback((id: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id ? { ...photo, included: false } : photo,
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
