'use client';

/**
 * O álbum como arquivo de impressão.
 *
 * Segue a estrutura do gabarito R1219: capa externa, contracapa externa e
 * lombada em arquivos próprios, e o miolo uma página por página — todas com
 * 5 mm de sangria. É o que a gráfica pede; abrir no visualizador continua
 * funcionando, só que com as bordas de sangria visíveis.
 *
 * O caminho é o mesmo de antes: desenhar num canvas do tamanho do papel →
 * espremer em JPEG → embutir o JPEG cru numa página do PDF. Uma página por vez:
 * um álbum de 200 fotos com todos os canvas vivos estoura a memória da aba.
 */

import { SPEC, spineTextSize, paperById, spineWidth } from '@/features/album-print/spec';
import { COVER_FONTS, canvasFontFamily, colorById } from '@/features/album-editor/palette';
import { slugify } from '@/lib/format';
import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import { downloadBlob } from '../download';
import type { AlbumExporter, AlbumSnapshot, ExportProgress } from '../types';
import {
  drawBackCover,
  drawCover,
  drawInnerPage,
  drawSpine,
  type LoadedImage,
  type PrintContext,
} from './drawPrintPage';
import { buildPdf, type PdfPageInput } from './pdfWriter';

/** 1 mm em pontos PostScript (1 pt = 1/72 pol). */
const PT_PER_MM = 72 / 25.4;

/**
 * Resolução de rasterização. 300 px/pol é o piso que gráfica aceita sem
 * reclamar; subir daqui multiplica o tamanho do arquivo pelo quadrado e não
 * melhora nada que a máquina consiga imprimir.
 */
const DPI = 300;
const PX_PER_MM = DPI / 25.4;

const JPEG_QUALITY = 0.92;

async function loadImage(photo: Photo): Promise<LoadedImage | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      // Álbum vindo da nuvem não tem `File`: os bytes chegam pela URL assinada.
      const source: Blob =
        photo.file ?? (await fetch(photo.previewUrl).then((response) => response.blob()));
      // `from-image` aplica a rotação do EXIF: sem isso a foto tirada de lado
      // sai deitada no PDF mesmo aparecendo de pé na tela.
      const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    }
  } catch {
    // Formato que o `createImageBitmap` não abre: cai no <img>.
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight });
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

function contextOf(album: EditorAlbum, images: Map<string, LoadedImage>): PrintContext {
  const color = colorById(album.color);
  const family: Record<string, string> = {};
  const weight: Record<string, number> = {};
  for (const font of COVER_FONTS) {
    family[font.id] = canvasFontFamily(font.id);
    weight[font.id] = font.weight;
  }
  return { album, paper: color.bg, ink: color.ink, family, weight, images };
}

/** Prepara um canvas do tamanho pedido, em milímetros. */
function makeCanvas(widthMm: number, heightMm: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(widthMm * PX_PER_MM);
  canvas.height = Math.round(heightMm * PX_PER_MM);
  // `alpha: false` porque toda página é opaca: uma composição a menos por
  // quadro, e sem franja escura ao virar JPEG.
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Este navegador não suporta gerar o álbum em PDF.');
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

const mm = (value: number) => value * PX_PER_MM;

export async function buildPrintPdf(
  snapshot: AlbumSnapshot,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Blob> {
  const album = snapshot.album;
  if (!album) throw new Error('Nada para exportar: o álbum está vazio.');

  // Sem esperar as fontes, o canvas desenha o título com a substituta do
  // sistema — e o arquivo sai diferente do que está na tela.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const spine =
    album.spine.mm ?? spineWidth(album.pages.length, paperById(album.paper).mm);
  const fileW = SPEC.trim.w + SPEC.bleed * 2;
  const fileH = SPEC.trim.h + SPEC.bleed * 2;

  const pdfPages: PdfPageInput[] = [];
  const total = album.pages.length + 3;
  let processed = 0;

  const push = async (canvas: HTMLCanvasElement, widthMm: number, heightMm: number) => {
    pdfPages.push({
      widthPt: widthMm * PT_PER_MM,
      heightPt: heightMm * PT_PER_MM,
      jpeg: await canvasToJpeg(canvas),
      pixelWidth: canvas.width,
      pixelHeight: canvas.height,
    });
    processed += 1;
    onProgress?.({ processed, total });
    // Devolve o fôlego ao navegador: sem isto a aba congela e a barra de
    // progresso só aparece quando já acabou.
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  /* ── capa, contracapa e lombada ── */
  {
    const context = contextOf(album, new Map());
    const cover = makeCanvas(fileW, fileH);
    drawCover(cover.ctx, context, mm);
    await push(cover.canvas, fileW, fileH);

    const back = makeCanvas(fileW, fileH);
    drawBackCover(back.ctx, context, mm);
    await push(back.canvas, fileW, fileH);

    // A lombada tem sangria só em cima e embaixo: dos lados é dobra.
    const spineFileW = spine + SPEC.bleed * 2;
    const spineCanvas = makeCanvas(spineFileW, fileH);
    drawSpine(spineCanvas.ctx, context, mm, spineTextSize(spine, album.spine.size));
    await push(spineCanvas.canvas, spineFileW, fileH);
  }

  /* ── miolo ── */
  const photosById = new Map(snapshot.photos.map((photo) => [photo.id, photo]));
  const page = makeCanvas(fileW, fileH);

  for (const [index, editorPage] of album.pages.entries()) {
    const images = new Map<string, LoadedImage>();
    for (const slot of editorPage.slots) {
      if (!slot.photoId || images.has(slot.photoId)) continue;
      const photo = photosById.get(slot.photoId);
      if (!photo) continue;
      const image = await loadImage(photo);
      if (image) images.set(slot.photoId, image);
    }

    drawInnerPage(page.ctx, editorPage, contextOf(album, images), mm, {
      // A folha do editor é o par (par, ímpar) aberto: a página de índice par é
      // a da **esquerda**, e a lombada dela fica à direita. O arquivo dizia o
      // contrário do que a tela mostrava, e a margem do lado da lombada saía
      // impressa na borda errada.
      spineSide: index % 2 === 0 ? 'right' : 'left',
      number: index + 1,
    });

    await push(page.canvas, fileW, fileH);
    for (const image of images.values()) releaseImage(image);
  }

  return buildPdf(pdfPages, { title: album.name.trim() || 'Meu álbum' });
}

export const printAlbumExporter: AlbumExporter = {
  id: 'pdf',
  label: 'Baixar álbum',
  async export(snapshot, onProgress) {
    const blob = await buildPrintPdf(snapshot, onProgress);
    downloadBlob(blob, `${slugify(snapshot.name, 'meu-album')}.pdf`);
  },
};
