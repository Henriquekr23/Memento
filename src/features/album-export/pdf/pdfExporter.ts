'use client';

/**
 * O álbum como um PDF — capa, folha de rosto, miolo e contracapa, uma página do
 * arquivo para cada página do livro.
 *
 * O caminho é: para cada página, desenhar num canvas do tamanho do papel →
 * espremer esse canvas num JPEG → embutir o JPEG cru numa página do PDF.
 * Nenhuma foto sai da máquina, nenhuma biblioteca nova entra no bundle.
 *
 * Uma página por vez, de propósito: um álbum de 200 fotos com todos os canvas
 * vivos ao mesmo tempo estoura a memória da aba. Aqui, no máximo um canvas e as
 * imagens de uma página existem por vez.
 */

import { resolveAlbumPalette } from '@/features/album-style/theme';
import { buildAlbumPages, type AlbumPage } from '@/lib/paginate';
import { slugify } from '@/lib/format';
import type { Photo } from '@/types/photo';

import { downloadBlob } from '../download';
import type { AlbumExporter, AlbumSnapshot, ExportProgress } from '../types';
import { drawAlbumPage, type LoadedImage, type PageRenderContext } from './drawPage';
import { buildPdf, type PdfPageInput } from './pdfWriter';

/** A5 em pontos (1 pt = 1/72"): o formato de álbum de mesa. */
const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;

/**
 * Largura de rasterização. Dá ~213 DPI no A5 — nítido na tela e digno de
 * impressão caseira, sem gerar um arquivo que ninguém consegue mandar por
 * e-mail. Subir daqui multiplica o tamanho do arquivo pelo quadrado.
 */
const PAGE_PIXEL_WIDTH = 1240;
const PAGE_PIXEL_HEIGHT = Math.round(
  (PAGE_PIXEL_WIDTH * PAGE_HEIGHT_PT) / PAGE_WIDTH_PT,
);

const JPEG_QUALITY = 0.88;

/**
 * Abre a foto no tamanho original.
 *
 * `createImageBitmap` com `imageOrientation: 'from-image'` aplica a rotação do
 * EXIF — sem isso, a foto tirada de lado sairia deitada no PDF mesmo aparecendo
 * de pé na tela, porque a `<img>` do navegador corrige e o canvas não.
 */
async function loadImage(photo: Photo): Promise<LoadedImage | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      // Álbum carregado da nuvem não tem `File`: os bytes vêm da URL assinada.
      // É a mesma imagem — só chegou pela rede em vez do disco.
      const source: Blob =
        photo.file ?? (await fetch(photo.previewUrl).then((r) => r.blob()));
      const bitmap = await createImageBitmap(source, {
        imageOrientation: 'from-image',
      });
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    }
  } catch {
    // Formato que o `createImageBitmap` não abre: cai no <img>, que aceita
    // tudo que o navegador sabe mostrar.
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    image.onerror = () => resolve(null);
    image.src = photo.previewUrl;
  });
}

function releaseImage(image: LoadedImage): void {
  if (typeof ImageBitmap !== 'undefined' && image.source instanceof ImageBitmap) {
    image.source.close();
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) throw new Error('O navegador não conseguiu gerar a página.');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * As páginas a exportar.
 *
 * Quando a composição do livro veio junto, são exatamente as páginas que estão
 * na tela. Sem ela (chamada antiga do exportador), a paginação é recalculada a
 * partir das fotos — o mesmo resultado que o livro mostraria sem edições.
 */
function pagesOf(album: AlbumSnapshot): readonly AlbumPage[] {
  return (
    album.book?.pages ??
    buildAlbumPages(album.photos, { stories: album.stories ?? [] })
  );
}

function renderContextOf(album: AlbumSnapshot): PageRenderContext {
  const book = album.book;
  const times = album.photos.map((photo) => photo.timestamp.getTime());

  return {
    palette: resolveAlbumPalette(
      book?.theme ?? { cover: 'leather', paper: 'cream', frame: 'polaroid', font: 'serif' },
    ),
    albumName: album.name,
    albumMeta: {
      firstDate: times.length > 0 ? new Date(Math.min(...times)) : null,
      lastDate: times.length > 0 ? new Date(Math.max(...times)) : null,
      photoCount: album.photos.length,
    },
    frame: book?.theme.frame ?? 'polaroid',
    pageCaptions: book?.pageCaptions ?? {},
    photoCaptions: album.photoCaptions ?? {},
    dayNotes: book?.dayNotes ?? {},
    composeModes: book?.composeModes ?? {},
    adjustments: book?.adjustments ?? {},
    placements: book?.placements ?? {},
    autoTilt: book?.autoTilt ?? true,
  };
}

export async function buildAlbumPdf(
  album: AlbumSnapshot,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Blob> {
  const pages = pagesOf(album);
  const context = renderContextOf(album);

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_PIXEL_WIDTH;
  canvas.height = PAGE_PIXEL_HEIGHT;

  // `alpha: false` porque toda página é opaca: economiza uma composição por
  // quadro e evita franja escura nas bordas ao virar JPEG.
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Este navegador não suporta gerar o álbum em PDF.');
  ctx.imageSmoothingQuality = 'high';

  const pdfPages: PdfPageInput[] = [];

  for (const [index, page] of pages.entries()) {
    const images = new Map<string, LoadedImage>();
    for (const photo of page.photos) {
      const image = await loadImage(photo);
      if (image) images.set(photo.id, image);
    }

    // O canvas é reaproveitado: limpar antes é o que impede a página anterior
    // de aparecer por baixo de uma foto com transparência.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawAlbumPage(ctx, page, images, context);

    pdfPages.push({
      widthPt: PAGE_WIDTH_PT,
      heightPt: PAGE_HEIGHT_PT,
      jpeg: await canvasToJpeg(canvas),
      pixelWidth: canvas.width,
      pixelHeight: canvas.height,
    });

    for (const image of images.values()) releaseImage(image);
    onProgress?.({ processed: index + 1, total: pages.length });

    // Devolve o fôlego ao navegador entre páginas: sem isto a aba congela e a
    // barra de progresso só aparece quando já acabou.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return buildPdf(pdfPages, { title: album.name.trim() || 'Meu álbum' });
}

export const pdfAlbumExporter: AlbumExporter = {
  id: 'pdf',
  label: 'Baixar álbum',
  async export(album, onProgress) {
    const blob = await buildAlbumPdf(album, onProgress);
    downloadBlob(blob, `${slugify(album.name, 'meu-album')}.pdf`);
  },
};
