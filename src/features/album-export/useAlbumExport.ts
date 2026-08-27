'use client';

import { useCallback, useState } from 'react';

import { printAlbumExporter } from './pdf/printExporter';
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
  pdf: printAlbumExporter,
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

  /**
   * Devolve `true` quando o arquivo foi entregue.
   *
   * O sucesso é retornado, e não só guardado em estado, porque quem chama
   * precisa reagir na mesma linha do `await` — hoje para levar a pessoa à página
   * de agradecimento. Ler um `error === null` depois seria olhar o estado do
   * render anterior.
   */
  const exportAlbum = useCallback(
    async (album: AlbumSnapshot, kind: ExportKind = 'pdf'): Promise<boolean> => {
      // Duas exportações ao mesmo tempo disputariam a memória do navegador
      // justamente quando ela está mais apertada.
      if (running) return false;

      setRunning(kind);
      setError(null);
      try {
        await EXPORTERS[kind].export(album, setProgress);
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível gerar o álbum.',
        );
        return false;
      } finally {
        setRunning(null);
        setProgress(null);
      }
    },
    [running],
  );

  return { exportAlbum, running, isExporting: running !== null, progress, error };
}
