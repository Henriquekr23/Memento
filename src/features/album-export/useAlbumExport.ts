'use client';

import { useCallback, useState } from 'react';

import type { AlbumExporter, AlbumSnapshot, ExportProgress } from './types';
import { zipAlbumExporter } from './zipExporter';

/**
 * Fase 2: troque `zipAlbumExporter` por um exportador que fala com a API.
 * Nenhum componente precisa mudar.
 */
export function useAlbumExport(exporter: AlbumExporter = zipAlbumExporter) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportAlbum = useCallback(
    async (album: AlbumSnapshot) => {
      setIsExporting(true);
      setError(null);
      try {
        await exporter.export(album, setProgress);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível gerar o álbum.',
        );
      } finally {
        setIsExporting(false);
        setProgress(null);
      }
    },
    [exporter],
  );

  return { exportAlbum, isExporting, progress, error, exporterLabel: exporter.label };
}
