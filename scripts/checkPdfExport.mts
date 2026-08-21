/**
 * Verificação avulsa do exportador de PDF, fora do navegador.
 *
 * O desenho da página é função pura de `(ctx, página, imagens, contexto)`, então
 * dá para trocar o canvas do navegador por um de Node e olhar o resultado sem
 * abrir a aplicação. Roda com:
 *
 *   npm i --no-save @napi-rs/canvas tsx
 *   npx tsx scripts/checkPdfExport.mts <pasta-com-fotos> <saida.pdf> [variante]
 *
 * Variantes: `alinhado` (padrão) e `livre`, que usa papel escuro, cantoneiras e
 * as fotos soltas e tortas — o caminho que mais quebra ao mexer no visual.
 *
 * Fora do `tsconfig` de propósito (ver `exclude`): é ferramenta de bancada, não
 * código da aplicação, e não deve pesar no build nem exigir a dependência
 * nativa do canvas para compilar o projeto.
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createCanvas, loadImage } from '@napi-rs/canvas';

import {
  DEFAULT_THEME,
  resolveAlbumPalette,
  type AlbumTheme,
} from '../src/features/album-style/theme';
import {
  drawAlbumPage,
  type LoadedImage,
  type PageRenderContext,
} from '../src/features/album-export/pdf/drawPage';
import { buildPdf, type PdfPageInput } from '../src/features/album-export/pdf/pdfWriter';
import {
  STORY_ANCHOR_START,
  buildAlbumPages,
  type StoryInsertion,
} from '../src/lib/paginate';
import type { PhotoPlacement } from '../src/types/page';
import type { Photo } from '../src/types/photo';

const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
const PIXEL_WIDTH = 1240;
const PIXEL_HEIGHT = Math.round((PIXEL_WIDTH * PAGE_HEIGHT_PT) / PAGE_WIDTH_PT);

const [folder = 'fotos', output = 'album.pdf', variant = 'alinhado'] =
  process.argv.slice(2);
const isFree = variant === 'livre';

const files = readdirSync(folder)
  .filter((name) => /\.jpe?g$/i.test(name))
  .sort();

const photos: Photo[] = files.map((name, index) => ({
  id: `p${index}`,
  file: null as unknown as File,
  fileName: name,
  extension: 'jpg',
  sizeInBytes: 0,
  previewUrl: '',
  exif: {
    takenAt: null,
    gps: null,
    cameraMake: null,
    cameraModel: null,
    width: null,
    height: null,
  },
  // Duas datas, para exercitar a quebra de dia e a numeração "Dia 1 · 1/2".
  timestamp: new Date(2026, 4, 12 + Math.floor(index / 5), 9 + index, 15),
  timestampSource: 'exif',
  included: true,
}));

const stories: StoryInsertion[] = [
  {
    id: 's1',
    anchorPhotoId: STORY_ANCHOR_START,
    title: 'Como tudo começou',
    body:
      'A gente saiu de casa às cinco da manhã sem saber direito onde ia dormir. ' +
      'O mapa dizia quatro horas de estrada; foram sete, com duas paradas para ' +
      'café e uma para consertar o retrovisor.\n\n' +
      'Chegando lá, a primeira coisa que vimos foi o mar aparecendo entre os morros.',
  },
];

const pages = buildAlbumPages(photos, { stories });
const photoPages = pages.filter((page) => page.kind === 'photos');

const theme: AlbumTheme = isFree
  ? { cover: 'charcoal', paper: 'charcoal', frame: 'corners', font: 'handwriting' }
  : DEFAULT_THEME;

// No modo livre as fotos saem dos slots: posições sobrepostas, tamanhos
// diferentes e ordem de empilhamento explícita.
const placements: Record<string, PhotoPlacement> = isFree
  ? {
      p0: { x: 4, y: 6, w: 58, h: 40, z: 1 },
      p1: { x: 38, y: 30, w: 55, h: 38, z: 3 },
      p2: { x: 10, y: 55, w: 50, h: 38, z: 2 },
      p3: { x: 45, y: 2, w: 40, h: 30, z: 4 },
    }
  : {};

const context: PageRenderContext = {
  palette: resolveAlbumPalette(theme),
  albumName: 'Litoral em maio — férias de 2026',
  albumMeta: {
    firstDate: photos[0]?.timestamp ?? null,
    lastDate: photos.at(-1)?.timestamp ?? null,
    photoCount: photos.length,
  },
  frame: theme.frame,
  pageCaptions: { [photoPages[0]?.key ?? '']: 'A chegada' },
  photoCaptions: { p0: 'primeira parada', p3: 'o mirante', p6: 'de volta' },
  // As chaves são os dias que as datas acima produzem. O primeiro é longo de
  // propósito: exercita a quebra de linha e o corte no teto de 5 linhas.
  dayNotes: {
    '2026-05-12':
      'Acordamos com o barulho do mar batendo embaixo da janela e nenhum plano. ' +
      'Descemos a pé até o porto, comemos pastel de camarão em pé e ficamos ' +
      'olhando os barcos voltarem. À tarde subimos o morro achando que dava ' +
      'tempo antes do sol cair — não dava, e ainda assim foi a melhor parte do ' +
      'dia. Voltamos no escuro, guiados pela luz de um bar que nem estava aberto.',
    '2026-05-13': 'Dia de estrada. Pouca foto, muito café.',
  },
  composeModes: isFree
    ? Object.fromEntries(photoPages.map((page) => [page.key, 'free' as const]))
    : {},
  adjustments: {
    p1: { focusX: 30, focusY: 20, zoom: 1.4, rotation: null },
    p2: { focusX: 50, focusY: 50, zoom: 1, rotation: -8 },
  },
  placements,
  autoTilt: true,
};

const canvas = createCanvas(PIXEL_WIDTH, PIXEL_HEIGHT);
const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

const images = new Map<string, LoadedImage>();
for (const [index, name] of files.entries()) {
  const image = await loadImage(join(folder, name));
  images.set(`p${index}`, {
    source: image as unknown as CanvasImageSource,
    width: image.width,
    height: image.height,
  });
}

const pdfPages: PdfPageInput[] = [];

for (const page of pages) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PIXEL_WIDTH, PIXEL_HEIGHT);
  drawAlbumPage(ctx, page, images, context);

  pdfPages.push({
    widthPt: PAGE_WIDTH_PT,
    heightPt: PAGE_HEIGHT_PT,
    jpeg: new Uint8Array(canvas.encodeSync('jpeg', 88)),
    pixelWidth: PIXEL_WIDTH,
    pixelHeight: PIXEL_HEIGHT,
  });
}

const blob = buildPdf(pdfPages, { title: context.albumName });
writeFileSync(output, Buffer.from(await blob.arrayBuffer()));

console.log(
  `${pages.length} páginas · ${(blob.size / 1024 / 1024).toFixed(2)} MB → ${output}`,
);
console.log(pages.map((page) => `${page.number ?? '·'} ${page.kind}`).join('\n'));
