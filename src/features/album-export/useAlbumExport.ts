'use client';

import { useCallback, useState } from 'react';

import { pdfAlbumExporter } from './pdf/pdfExporter';
import type { AlbumExporter, AlbumSnapshot, ExportProgress } from './types';

/**
 * Como o álbum vai embora.
 *
 * Hoje há um destino só — o PDF, que é o álbum em si: o que a pessoa abre,
 * manda para alguém e eventualmente imprime. O mapa existe assim mesmo porque é
 * onde entram os outros: na Fase 2, um exportador que faz upload e devolve link
 * público vira mais uma entrada aqui, e nada mais muda.
 */
export const EXPORTERS = {
  pdf: pdfAlbumExporter,
} as const satisfies Record<string, AlbumExporter>;

export type ExportKind = keyof typeof EXPORTERS;

/**
 * Fase 2: acrescente aqui um exportador que fala com a API (por exemplo, um que
 * devolve link público). Nenhum componente precisa mudar.
 */
export function useAlbumExport() {
  /** Qual exportação está rodando — `null` quando nenhuma. */
  const [running, setRunning] = useState<ExportKind | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportAlbum = useCallback(
    async (album: AlbumSnapshot, kind: ExportKind = 'pdf') => {
      // Duas exportações ao mesmo tempo disputariam a memória do navegador
      // justamente quando ela está mais apertada.
      if (running) return;

      setRunning(kind);
      setError(null);
      try {
        await EXPORTERS[kind].export(album, setProgress);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível gerar o álbum.',
        );
      } finally {
        setRunning(null);
        setProgress(null);
      }
    },
    [running],
  );

  return { exportAlbum, running, isExporting: running !== null, progress, error };
}
