/**
 * Desenha uma página do álbum num canvas — a mesma página que o livro 3D mostra
 * na tela, só que assada numa imagem.
 *
 * Por que redesenhar em vez de fotografar o DOM: uma captura de tela do livro
 * traria a resolução da tela (uma foto de 12 MP viraria um borrão de 400 px),
 * os controles de edição e a perspectiva 3D. Aqui a página nasce no tamanho do
 * papel, com a foto na resolução original.
 *
 * A régua: `unit` é **um pixel de tela do livro**. Todo número deste arquivo é
 * o mesmo número que está no Tailwind do `BookPage`/`PhotoSlot` (`px-5` → `20`,
 * `text-[11px]` → `11`), multiplicado por `unit`. É o que mantém as duas
 * versões parecidas quando alguém mexe no visual de uma delas.
 */

import type { AlbumPalette, FrameId } from '@/features/album-style/theme';
import { formatDate, formatDayLabel } from '@/lib/format';
import type { AlbumPage } from '@/lib/paginate';
import {
  PAGE_LAYOUTS,
  resolveRotation,
  type ComposeMode,
  type PhotoAdjustment,
  type PhotoPlacement,
  type SlotRect,
} from '@/types/page';

import {
  drawTracked,
  ellipsize,
  roundRectPath,
  withAlpha,
  wrapText,
} from './canvasText';

/** Largura de referência da página no livro, em px de tela. */
const REFERENCE_PAGE_WIDTH = 380;

/**
 * Diário do dia — os mesmos números do `DayNote.tsx` (`text-[12px]`, linha de
 * 18px, teto de 5 linhas). Mexeu num, mexa no outro: o bloco só continua igual
 * na tela e no papel enquanto as duas réguas forem a mesma.
 */
const DAY_NOTE_SIZE = 12;
const DAY_NOTE_LINE_HEIGHT = 18;
const DAY_NOTE_MAX_LINES = 5;

export interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface AlbumMeta {
  firstDate: Date | null;
  lastDate: Date | null;
  photoCount: number;
}

/** Tudo que a página precisa saber e que não está nela própria. */
export interface PageRenderContext {
  palette: AlbumPalette;
  albumName: string;
  albumMeta: AlbumMeta;
  frame: FrameId;
  pageCaptions: Readonly<Record<string, string>>;
  photoCaptions: Readonly<Record<string, string>>;
  /** Diário de viagem, indexado pela chave do grupo de dia. */
  dayNotes: Readonly<Record<string, string>>;
  composeModes: Readonly<Record<string, ComposeMode>>;
  adjustments: Readonly<Record<string, PhotoAdjustment>>;
  placements: Readonly<Record<string, PhotoPlacement>>;
  autoTilt: boolean;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_ADJUSTMENT: PhotoAdjustment = {
  focusX: 50,
  focusY: 50,
  zoom: 1,
  rotation: null,
};

// ── Texturas ───────────────────────────────────────────────────────────────

/** Fibra diagonal do couro. Espelha o `GRAIN` do tema. */
function drawGrain(ctx: CanvasRenderingContext2D, box: Box, unit: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
  ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
  ctx.rotate(Math.PI / 4);

  const span = Math.hypot(box.width, box.height);
  for (let y = -span; y < span; y += 5 * unit) {
    ctx.fillRect(-span, y, span * 2, 2 * unit);
  }
  ctx.restore();
}

/** Trama do linho: fios na horizontal e na vertical. Espelha o `WEAVE`. */
function drawWeave(ctx: CanvasRenderingContext2D, box: Box, unit: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let y = box.y; y < box.y + box.height; y += 3 * unit) {
    ctx.fillRect(box.x, y, box.width, unit);
  }
  for (let x = box.x; x < box.x + box.width; x += 3 * unit) {
    ctx.fillRect(x, box.y, unit, box.height);
  }
  ctx.restore();
}

/**
 * A luz caindo no papel — cada `radial-gradient` do CSS vira uma destas.
 *
 * Dois detalhes que só aparecem quando se desenha à mão:
 *
 * 1. o raio é a distância até o **canto mais longe** vezes a parada de cor,
 *    porque é assim que o `radial-gradient` do CSS se comporta por padrão;
 * 2. o gradiente termina na *mesma cor* com alfa zero, e não em "transparente".
 *    O canvas interpola sem premultiplicar o alfa: cair de branco para o preto
 *    transparente atravessa o cinza e deixa o papel encardido.
 */
function radialWash(
  ctx: CanvasRenderingContext2D,
  box: Box,
  atX: number,
  atY: number,
  rgb: string,
  alpha: number,
  stop: number,
): void {
  const cx = box.x + box.width * atX;
  const cy = box.y + box.height * atY;
  const left = box.x;
  const top = box.y;
  const right = box.x + box.width;
  const bottom = box.y + box.height;

  const radius =
    Math.max(
      Math.hypot(cx - left, cy - top),
      Math.hypot(right - cx, cy - top),
      Math.hypot(cx - left, bottom - cy),
      Math.hypot(right - cx, bottom - cy),
    ) * stop;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(box.x, box.y, box.width, box.height);
}

function paintCover(
  ctx: CanvasRenderingContext2D,
  box: Box,
  palette: AlbumPalette,
  unit: number,
): void {
  ctx.fillStyle = palette.coverBase;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  if (palette.coverTexture === 'grain') drawGrain(ctx, box, unit);
  else drawWeave(ctx, box, unit);
  radialWash(ctx, box, 0.3, 0.18, '255, 255, 255', 0.16, 0.55);
}

function paintPaper(
  ctx: CanvasRenderingContext2D,
  box: Box,
  palette: AlbumPalette,
): void {
  ctx.fillStyle = palette.paperBase;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  radialWash(ctx, box, 0.18, 0.12, '255, 255, 255', 0.5, 0.45);
  radialWash(ctx, box, 0.82, 0.78, '0, 0, 0', 0.05, 0.55);
}

// ── Fotos ──────────────────────────────────────────────────────────────────

/**
 * Recorte da imagem dentro da moldura.
 *
 * Reproduz a conta que o navegador faz com `object-fit: cover` +
 * `object-position` + `transform: scale()` ancorado no mesmo ponto. Sem isto, a
 * foto que o usuário reenquadrou à mão sairia centralizada no PDF — o ajuste
 * mais visível de todos seria justamente o que se perde.
 */
function drawCovered(
  ctx: CanvasRenderingContext2D,
  image: LoadedImage,
  box: Box,
  adjustment: PhotoAdjustment,
  radius: number,
): void {
  ctx.save();
  roundRectPath(ctx, box.x, box.y, box.width, box.height, radius);
  ctx.clip();

  const cover = Math.max(box.width / image.width, box.height / image.height);
  const drawnWidth = image.width * cover;
  const drawnHeight = image.height * cover;

  // `object-position`: a sobra é distribuída na proporção escolhida.
  const offsetX = (box.width - drawnWidth) * (adjustment.focusX / 100);
  const offsetY = (box.height - drawnHeight) * (adjustment.focusY / 100);

  // `transform-origin` no mesmo ponto do enquadramento: o zoom aproxima de onde
  // a pessoa está olhando, não do centro da moldura.
  const originX = box.width * (adjustment.focusX / 100);
  const originY = box.height * (adjustment.focusY / 100);
  const zoom = adjustment.zoom;

  ctx.drawImage(
    image.source,
    box.x + originX + (offsetX - originX) * zoom,
    box.y + originY + (offsetY - originY) * zoom,
    drawnWidth * zoom,
    drawnHeight * zoom,
  );

  ctx.restore();
}

/** Cantoneiras de papel, como as do `PhotoSlot`. */
function drawCorners(
  ctx: CanvasRenderingContext2D,
  box: Box,
  palette: AlbumPalette,
  unit: number,
): void {
  const size = 15 * unit;
  const right = box.x + box.width;
  const bottom = box.y + box.height;

  ctx.save();
  ctx.fillStyle = withAlpha(palette.paperInkSoft, 0.55);
  const triangles: [number, number][][] = [
    [
      [box.x, box.y],
      [box.x + size, box.y],
      [box.x, box.y + size],
    ],
    [
      [right, box.y],
      [right - size, box.y],
      [right, box.y + size],
    ],
    [
      [box.x, bottom],
      [box.x + size, bottom],
      [box.x, bottom - size],
    ],
    [
      [right, bottom],
      [right - size, bottom],
      [right, bottom - size],
    ],
  ];

  for (const points of triangles) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    ctx.lineTo(points[1][0], points[1][1]);
    ctx.lineTo(points[2][0], points[2][1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function shadow(
  ctx: CanvasRenderingContext2D,
  blur: number,
  offsetY: number,
  alpha: number,
): void {
  ctx.shadowColor = `rgba(20, 14, 8, ${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
}

function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Uma foto colada na página: moldura do tema, inclinação, recorte ajustado
 * pelo usuário e legenda embaixo — nessa ordem, que é a do `PhotoSlot`.
 */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  image: LoadedImage,
  frameBox: Box,
  rotation: number,
  adjustment: PhotoAdjustment,
  caption: string,
  context: PageRenderContext,
  unit: number,
): void {
  const { palette, frame } = context;
  const isPolaroid = frame === 'polaroid';
  const padding = isPolaroid ? 3 * unit : 0;

  ctx.save();
  // Gira em torno do centro da moldura, como o `transform: rotate` do CSS.
  ctx.translate(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-frameBox.width / 2, -frameBox.height / 2);

  if (isPolaroid) {
    shadow(ctx, 10 * unit, 3 * unit, 0.28);
    ctx.fillStyle = palette.frameBg;
    roundRectPath(ctx, 0, 0, frameBox.width, frameBox.height, 3 * unit);
    ctx.fill();
    clearShadow(ctx);
  } else if (frame === 'bleed') {
    // A sombra precisa de algo opaco embaixo para existir; o próprio papel faz
    // esse papel, e a foto cobre tudo logo em seguida.
    shadow(ctx, 8 * unit, 2 * unit, 0.22);
    ctx.fillStyle = palette.paperBase;
    roundRectPath(ctx, 0, 0, frameBox.width, frameBox.height, unit);
    ctx.fill();
    clearShadow(ctx);
  }

  const inner: Box = {
    x: padding,
    y: padding,
    width: frameBox.width - padding * 2,
    height: frameBox.height - padding * 2,
  };

  // A legenda vive dentro da moldura, embaixo da imagem (é o `flex-col` do
  // `PhotoSlot`): ela come altura da foto em vez de invadir a página.
  const captionText = caption.trim();
  const captionHeight = captionText ? 11 * unit * 1.2 + 8 * unit : 0;
  const imageBox: Box = {
    ...inner,
    height: Math.max(unit, inner.height - captionHeight),
  };

  drawCovered(ctx, image, imageBox, adjustment, unit);
  if (frame === 'corners') drawCorners(ctx, imageBox, palette, unit);

  if (captionText) {
    ctx.fillStyle = palette.paperInk;
    ctx.font = `${11 * unit}px ${palette.fontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      ellipsize(ctx, captionText, inner.width - 4 * unit),
      inner.x + inner.width / 2,
      imageBox.y + imageBox.height + captionHeight / 2,
    );
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  ctx.restore();
}

// ── Páginas ────────────────────────────────────────────────────────────────

function coverText(
  ctx: CanvasRenderingContext2D,
  page: AlbumPage,
  box: Box,
  context: PageRenderContext,
  unit: number,
): void {
  const { palette, albumName, albumMeta } = context;
  const centerX = box.x + box.width / 2;
  const maxWidth = box.width - 64 * unit;
  const gap = 12 * unit;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (page.kind === 'back') {
    const lines = [
      { text: 'FIM DO ÁLBUM', size: 11, tracking: 0.3, alpha: 0.7 },
      { text: 'Memento · Guarde a memória', size: 10, tracking: 0, alpha: 0.45 },
    ];
    const total = lines.reduce((sum, line) => sum + line.size * unit * 1.4, 0) + gap * 2 + unit;
    let y = box.y + (box.height - total) / 2;

    ctx.fillStyle = withAlpha(palette.coverAccent, 0.5);
    ctx.fillRect(centerX - 20 * unit, y, 40 * unit, Math.max(1, unit));
    y += unit + gap;

    for (const line of lines) {
      ctx.fillStyle = withAlpha(palette.coverInk, line.alpha);
      ctx.font = `${line.size * unit}px ${palette.fontStack}`;
      drawTracked(ctx, line.text, centerX, y, line.tracking * line.size * unit, 'center');
      y += line.size * unit * 1.4 + gap;
    }
    return;
  }

  const titleSize = 30 * unit;
  ctx.font = `600 ${titleSize}px ${palette.fontStack}`;
  const titleLines = wrapText(ctx, albumName.trim() || 'Meu álbum', maxWidth);
  const hasDates = albumMeta.firstDate !== null && albumMeta.lastDate !== null;

  const blocks =
    10 * unit * 1.4 + // "Memento"
    titleLines.length * titleSize * 1.25 +
    unit + // filete
    (hasDates ? 12 * unit * 1.4 : 0) +
    11 * unit * 1.4 +
    4 * unit;
  const gaps = gap * (hasDates ? 4 : 3);
  let y = box.y + (box.height - blocks - gaps) / 2;

  ctx.fillStyle = palette.coverAccent;
  ctx.font = `${10 * unit}px ${palette.fontStack}`;
  drawTracked(ctx, 'MEMENTO', centerX, y, 0.4 * 10 * unit, 'center');
  y += 10 * unit * 1.4 + gap;

  ctx.fillStyle = palette.coverInk;
  ctx.font = `600 ${titleSize}px ${palette.fontStack}`;
  for (const line of titleLines) {
    ctx.fillText(line, centerX, y);
    y += titleSize * 1.25;
  }
  y += gap;

  ctx.fillStyle = withAlpha(palette.coverAccent, 0.6);
  ctx.fillRect(centerX - 32 * unit, y, 64 * unit, Math.max(1, unit));
  y += unit + gap;

  if (hasDates) {
    ctx.fillStyle = withAlpha(palette.coverInk, 0.7);
    ctx.font = `${12 * unit}px ${palette.fontStack}`;
    ctx.fillText(
      `${formatDate(albumMeta.firstDate!)} — ${formatDate(albumMeta.lastDate!)}`,
      centerX,
      y,
    );
    y += 12 * unit * 1.4 + gap;
  }

  y += 4 * unit;
  ctx.fillStyle = withAlpha(palette.coverAccent, 0.6);
  ctx.font = `${11 * unit}px ${palette.fontStack}`;
  drawTracked(ctx, 'GUARDE A MEMÓRIA', centerX, y, 0.2 * 11 * unit, 'center');
}

function drawTitlePage(
  ctx: CanvasRenderingContext2D,
  box: Box,
  context: PageRenderContext,
  unit: number,
): void {
  const { palette, albumName, albumMeta } = context;
  const x = box.x + 40 * unit;
  const maxWidth = box.width - 80 * unit;
  const gap = 12 * unit;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const titleSize = 24 * unit;
  ctx.font = `600 ${titleSize}px ${palette.fontStack}`;
  const titleLines = wrapText(ctx, albumName.trim() || 'Meu álbum', maxWidth);
  const hasDates = albumMeta.firstDate !== null && albumMeta.lastDate !== null;

  const total =
    titleLines.length * titleSize * 1.25 +
    (hasDates ? 14 * unit * 1.4 + gap : 0) +
    14 * unit * 1.4 +
    gap * 2 +
    24 * unit +
    11 * unit * 1.4;
  let y = box.y + (box.height - total) / 2;

  ctx.fillStyle = palette.paperInk;
  for (const line of titleLines) {
    ctx.fillText(line, x, y);
    y += titleSize * 1.25;
  }
  y += gap;

  ctx.fillStyle = withAlpha(palette.paperInk, 0.6);
  ctx.font = `${14 * unit}px ${palette.fontStack}`;
  if (hasDates) {
    ctx.fillText(
      `${formatDate(albumMeta.firstDate!)} — ${formatDate(albumMeta.lastDate!)}`,
      x,
      y,
    );
    y += 14 * unit * 1.4 + gap;
  }
  ctx.fillText(
    `${albumMeta.photoCount} ${albumMeta.photoCount === 1 ? 'foto' : 'fotos'}`,
    x,
    y,
  );
  y += 14 * unit * 1.4 + 24 * unit;

  // Na tela, aqui fica a dica de como folhear. No papel isso não quer dizer
  // nada — a assinatura de quem montou o álbum, sim.
  ctx.fillStyle = withAlpha(palette.paperInk, 0.35);
  ctx.font = `${11 * unit}px ${palette.fontStack}`;
  ctx.fillText('Montado com Memento · Keep the Journey', x, y);
}

function drawPhotosPage(
  ctx: CanvasRenderingContext2D,
  page: AlbumPage,
  box: Box,
  images: ReadonlyMap<string, LoadedImage>,
  context: PageRenderContext,
  unit: number,
): void {
  const { palette } = context;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // ── Cabeçalho (px-5 pt-4 no BookPage) ──
  let y = box.y + 16 * unit;
  const headerX = box.x + 20 * unit;
  const headerWidth = box.width - 40 * unit;

  if (page.dayNumber !== null) {
    const label =
      page.totalPagesOfDay > 1
        ? `DIA ${page.dayNumber} · ${page.pageOfDay}/${page.totalPagesOfDay}`
        : `DIA ${page.dayNumber}`;
    ctx.fillStyle = palette.paperAccent;
    ctx.font = `${10 * unit}px ${palette.fontStack}`;
    drawTracked(ctx, label, headerX, y, 0.2 * 10 * unit);
    y += 14 * unit;
  }

  // A legenda escrita pelo usuário; sem ela, o dia por extenso — o mesmo
  // placeholder que aparece na tela, com a mesma opacidade.
  const caption = context.pageCaptions[page.key]?.trim();
  const fallback = page.date ? formatDayLabel(page.date) : '';
  const headerText = caption || fallback;

  if (headerText) {
    ctx.fillStyle = withAlpha(palette.paperInk, caption ? 1 : 0.35);
    ctx.font = `${13 * unit}px ${palette.fontStack}`;
    ctx.fillText(ellipsize(ctx, headerText, headerWidth), headerX, y + 3 * unit);
  }
  y += 24 * unit;

  // ── Diário do dia (o `DayNote`: px-5 pt-1 pb-1, filete + texto com pl-3) ──
  // Só na página que abre o dia, e só quando tem texto: sem diário, o papel
  // continua exatamente como era antes desta feature existir.
  const dayNote =
    page.opensGroup && page.groupKey
      ? (context.dayNotes[page.groupKey] ?? '').trim()
      : '';

  if (dayNote) {
    const size = DAY_NOTE_SIZE * unit;
    const lineHeight = DAY_NOTE_LINE_HEIGHT * unit;
    const top = y + 4 * unit;

    ctx.font = `italic ${size}px ${palette.fontStack}`;
    // O mesmo teto da tela: passando disso o texto é cortado em vez de comer a
    // área das fotos. O que aparece impresso é o que aparece no livro.
    const lines = wrapText(ctx, dayNote, headerWidth - 12 * unit).slice(
      0,
      DAY_NOTE_MAX_LINES,
    );
    const blockHeight = lines.length * lineHeight;

    ctx.fillStyle = withAlpha(palette.paperAccent, 0.45);
    ctx.fillRect(headerX, top, Math.max(1, unit), blockHeight);

    ctx.fillStyle = withAlpha(palette.paperInk, 0.8);
    // A linha de 18px é mais alta que a letra de 12px; o texto fica no meio
    // dela, como o navegador faz com `line-height`.
    let lineY = top + (lineHeight - size) / 2;
    for (const line of lines) {
      ctx.fillText(line, headerX + 12 * unit, lineY);
      lineY += lineHeight;
    }

    y += blockHeight + 8 * unit;
  }

  // ── Área útil (inset-x-3 inset-y-1 dentro do que sobra) ──
  const footerHeight = 26 * unit;
  const content: Box = {
    x: box.x + 12 * unit,
    y: y + 4 * unit,
    width: box.width - 24 * unit,
    height: box.y + box.height - footerHeight - (y + 4 * unit) - 4 * unit,
  };

  const layout = PAGE_LAYOUTS[page.layoutId];
  const isFree = (context.composeModes[page.key] ?? 'aligned') === 'free';

  // Em modo livre a ordem de empilhamento é do usuário; em modo alinhado é a
  // ordem das fotos. Desenhar fora de ordem trocaria quem fica por cima.
  const ordered = page.photos.map((photo, index) => ({ photo, index }));
  if (isFree) {
    ordered.sort(
      (a, b) =>
        (context.placements[a.photo.id]?.z ?? 0) -
        (context.placements[b.photo.id]?.z ?? 0),
    );
  }

  for (const { photo, index } of ordered) {
    const image = images.get(photo.id);
    if (!image) continue;

    const placement = context.placements[photo.id] ?? null;
    const slot: SlotRect =
      layout.slots[index] ?? layout.slots[layout.slots.length - 1];
    const rect: SlotRect | PhotoPlacement = isFree && placement ? placement : slot;

    // `p-2` no invólucro do slot: a moldura nunca encosta na vizinha.
    const pad = 8 * unit;
    const frameBox: Box = {
      x: content.x + (rect.x / 100) * content.width + pad,
      y: content.y + (rect.y / 100) * content.height + pad,
      width: (rect.w / 100) * content.width - pad * 2,
      height: (rect.h / 100) * content.height - pad * 2,
    };
    if (frameBox.width <= 0 || frameBox.height <= 0) continue;

    const adjustment = context.adjustments[photo.id] ?? DEFAULT_ADJUSTMENT;
    const rotation = resolveRotation(
      photo.id,
      adjustment,
      isFree && context.autoTilt,
    );

    drawPhoto(
      ctx,
      image,
      frameBox,
      rotation,
      adjustment,
      context.photoCaptions[photo.id] ?? '',
      context,
      unit,
    );
  }

  // ── Rodapé: só a numeração, como na tela ──
  if (page.number !== null) {
    ctx.fillStyle = withAlpha(palette.paperInk, 0.3);
    ctx.font = `${10 * unit}px ${palette.fontStack}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      String(page.number),
      box.x + box.width - 20 * unit,
      box.y + box.height - 22 * unit,
    );
    ctx.textAlign = 'left';
  }
}

/**
 * Ponto de entrada: pinta a página inteira no canvas, do fundo à numeração.
 * O canvas já deve ter o tamanho da página.
 */
export function drawAlbumPage(
  ctx: CanvasRenderingContext2D,
  page: AlbumPage,
  images: ReadonlyMap<string, LoadedImage>,
  context: PageRenderContext,
): void {
  const box: Box = {
    x: 0,
    y: 0,
    width: ctx.canvas.width,
    height: ctx.canvas.height,
  };
  const unit = box.width / REFERENCE_PAGE_WIDTH;

  ctx.save();
  ctx.textBaseline = 'top';

  if (page.kind === 'cover' || page.kind === 'back') {
    paintCover(ctx, box, context.palette, unit);
    coverText(ctx, page, box, context, unit);
    ctx.restore();
    return;
  }

  paintPaper(ctx, box, context.palette);

  if (page.kind === 'title') drawTitlePage(ctx, box, context, unit);
  else if (page.kind === 'photos') {
    drawPhotosPage(ctx, page, box, images, context, unit);
  }
  // `inside-cover` é papel liso de propósito: é a guarda atrás da capa.

  ctx.restore();
}
