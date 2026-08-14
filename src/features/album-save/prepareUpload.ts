'use client';

import type { Photo } from '@/types/photo';

/**
 * O arquivo que vai para a nuvem — que **não** é o arquivo do usuário.
 *
 * Toda foto é redesenhada num canvas e reexportada em JPEG antes de subir.
 * Três consequências, todas de propósito:
 *
 * 1. **Custo.** ~300 KB por foto em vez de 4–12 MB. O free tier de 1 GB passa
 *    de ~150 fotos para ~3.000, e o egress de quem visita um álbum público
 *    cai na mesma proporção — é o egress, não o armazenamento, que estoura
 *    primeiro.
 * 2. **Privacidade.** O canvas copia pixels, não metadados: o EXIF (inclusive
 *    o GPS) não atravessa. O que sobe é a imagem, e só. A data continua
 *    guardada, mas numa coluna do banco que o usuário pode apagar junto com o
 *    álbum — não escondida dentro do arquivo.
 * 3. **O original nunca sai da máquina.** A promessa da Fase 1 continua
 *    literalmente verdadeira; o que a nuvem recebe é uma cópia para tela.
 *
 * O PDF continua sendo gerado do arquivo original, em resolução cheia — a
 * qualidade de impressão não é afetada por nada disto.
 */

/** Maior lado da imagem enviada, em pixels. */
export const MAX_UPLOAD_EDGE = 2000;
export const UPLOAD_QUALITY = 0.82;
export const UPLOAD_MIME = 'image/jpeg';

export interface PreparedUpload {
  blob: Blob;
  width: number;
  height: number;
}

/** Cabe inteiro na caixa, sem esticar imagem pequena. */
function fit(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Falha ao codificar a imagem.')),
      UPLOAD_MIME,
      UPLOAD_QUALITY,
    );
  });
}

/**
 * Prepara uma foto para o upload.
 *
 * `createImageBitmap` decodifica fora da thread principal — com 40 fotos, fazer
 * isso com `<img>` trava a interface por segundos.
 */
export async function prepareUpload(photo: Photo): Promise<PreparedUpload> {
  const source: Blob = photo.file ?? (await fetch(photo.previewUrl).then((r) => r.blob()));
  const bitmap = await createImageBitmap(source);

  try {
    const size = fit(bitmap.width, bitmap.height, MAX_UPLOAD_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não permitiu desenhar a imagem.');
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    return { blob: await canvasToBlob(canvas), ...size };
  } finally {
    // Sem isto, os bitmaps de um álbum grande ficam presos na memória até o
    // coletor decidir agir — e aí o navegador já engasgou.
    bitmap.close();
  }
}
