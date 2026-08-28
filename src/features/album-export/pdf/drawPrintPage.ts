/**
 * Desenho das páginas do arquivo de impressão.
 *
 * A régua aqui é o **milímetro**, não o pixel de tela: `mm` converte para
 * pixels do canvas a partir da resolução escolhida. Foi essa a mudança em
 * relação ao desenho antigo, que espelhava classes do Tailwind — a página que
 * vai para a gráfica precisa bater com o gabarito, e o gabarito é medido em mm.
 *
 * Nada aqui toca no DOM: recebe contexto, dados e imagens já carregadas. É o
 * que deixa o script `checkPdfExport.mts` rodar isto fora do navegador.
 */

import { SPEC } from '@/features/album-print/spec';
import { MOTIF_PATHS } from '@/features/album-editor/motifPaths';
import { clampOffset, cropRatios } from '@/features/album-editor/frameCrop';
import {
  PAGE_NUMBER,
  TEXT_BACKDROP,
  TEXT_PAD,
  numberOverPhoto,
  pageInsets,
} from '@/features/album-editor/pageLayout';
import type {
  CoverElement,
  CoverTextElement,
  EditorAlbum,
  EditorPage,
  PageTextBlock,
  PhotoFrame,
} from '@/types/album-editor';
import { layoutById, titleOf } from '@/types/album-editor';

export interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

/** Imagens das fotos, indexadas pelo id da foto. */
export type ImageMap = Map<string, LoadedImage>;

export interface PrintContext {
  album: EditorAlbum;
  /** Cor chapada do álbum e a tinta pareada, já resolvidas. */
  paper: string;
  ink: string;
  /** Nome da família por id de fonte, já resolvido para o canvas. */
  family: Record<string, string>;
  /** Peso da fonte por id. */
  weight: Record<string, number>;
  images: ImageMap;
}

/** Pixels por milímetro do canvas corrente. */
export type Ruler = (millimetres: number) => number;

/* ── fotos ───────────────────────────────────────────────────────────────── */

/**
 * A foto dentro do quadro, com o mesmo enquadramento da tela.
 *
 * Não há conta própria aqui: as razões saem de `frameCrop`, o mesmo módulo que
 * a página do editor usa. Foi o que acabou com a diferença entre o que a pessoa
 * enquadrou e o que saía impresso — antes o `cover` era refeito aqui à mão, o
 * deslocamento não conhecia limite e o encaixe "foto inteira" não existia.
 */
function drawFramed(
  ctx: CanvasRenderingContext2D,
  image: LoadedImage,
  box: { x: number; y: number; w: number; h: number },
  frame: PhotoFrame,
): void {
  const ratios = cropRatios(box.w, box.h, image.width, image.height, frame.fit, frame.zoom);
  const w = box.w * ratios.rw;
  const h = box.h * ratios.rh;
  const offsetX = clampOffset(frame.offsetX, ratios.maxX);
  const offsetY = clampOffset(frame.offsetY, ratios.maxY);

  // O deslocamento é % do lado desenhado da foto — a mesma régua da tela.
  const x = box.x + (box.w - w) / 2 + (offsetX / 100) * w;
  const y = box.y + (box.h - h) / 2 + (offsetY / 100) * h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // Quadro maior que a foto (encaixe "foto inteira"): o papel aparece em volta,
  // e é papel branco, não o fundo do canvas.
  if (w < box.w || h < box.h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.drawImage(image.source, x, y, w, h);
  ctx.restore();
}

/* ── texto ───────────────────────────────────────────────────────────────── */

/** Quebra o texto na largura da caixa, respeitando as quebras já digitadas. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Escreve com entreletra — `letterSpacing` do canvas não é universal. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: CanvasTextAlign,
): void {
  if (tracking === 0) {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    return;
  }

  const glyphs = Array.from(text);
  const width =
    glyphs.reduce((sum, glyph) => sum + ctx.measureText(glyph).width, 0) +
    tracking * Math.max(0, glyphs.length - 1);

  let cursor = x;
  if (align === 'center') cursor -= width / 2;
  else if (align === 'right') cursor -= width;

  ctx.textAlign = 'left';
  for (const glyph of glyphs) {
    ctx.fillText(glyph, cursor, y);
    cursor += ctx.measureText(glyph).width + tracking;
  }
}

/* ── elementos da capa ───────────────────────────────────────────────────── */

/**
 * Um elemento da capa, posicionado na área final.
 *
 * `originX`/`originY` são o canto do retângulo de corte dentro do canvas: as
 * coordenadas do elemento são % da **área final**, então é dali que a conta
 * parte — e não da borda do arquivo com sangria.
 */
function drawCoverElement(
  ctx: CanvasRenderingContext2D,
  element: CoverElement,
  context: PrintContext,
  mm: Ruler,
  originX: number,
  originY: number,
): void {
  const trimW = mm(SPEC.trim.w);
  const trimH = mm(SPEC.trim.h);
  const cx = originX + (element.x / 100) * trimW;
  const cy = originY + (element.y / 100) * trimH;
  const color = element.color ?? context.ink;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((element.rotation * Math.PI) / 180);

  if (element.kind === 'motif') {
    const side = (element.size / 100) * trimW;
    ctx.translate(-side / 2, -side / 2);
    ctx.scale(side / 100, side / 100);
    for (const part of MOTIF_PATHS[element.shape]) {
      ctx.fillStyle = part.fill === 'paper' ? context.paper : color;
      ctx.strokeStyle = part.fill === 'paper' ? context.paper : color;
      const path = new Path2D(part.d);
      if (part.stroke) {
        ctx.lineWidth = part.stroke;
        ctx.lineCap = 'round';
        ctx.stroke(path);
      } else {
        ctx.fill(path);
      }
    }
    ctx.restore();
    return;
  }

  const size = mm(element.size);
  const family = context.family[element.font] ?? 'sans-serif';
  const weight = context.weight[element.font] ?? 400;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';

  const text = element.uppercase ? element.text.toUpperCase() : element.text;
  const boxWidth = (element.width / 100) * trimW;
  const tracking = (element.tracking / 100) * size;
  const lines = wrap(ctx, text, boxWidth);
  const lineHeight = size * element.leading;

  // A caixa é centrada no ponto do elemento, igual à tela.
  const firstBaseline = -((lines.length - 1) * lineHeight) / 2 + size * 0.35;
  const anchor =
    element.align === 'left' ? -boxWidth / 2 : element.align === 'right' ? boxWidth / 2 : 0;

  lines.forEach((line, index) => {
    drawTracked(
      ctx,
      line,
      anchor,
      firstBaseline + index * lineHeight,
      tracking,
      element.align as CanvasTextAlign,
    );
  });

  ctx.restore();
}

/* ── páginas ─────────────────────────────────────────────────────────────── */

export interface PrintPageSide {
  /** Em que lado desta página fica a lombada. */
  spineSide: 'left' | 'right';
  /** Número impresso desta página (1-based). */
  number: number;
}

/** Tamanho do arquivo de uma página: área final mais sangria dos dois lados. */
const FILE_W = SPEC.trim.w + SPEC.bleed * 2;
const FILE_H = SPEC.trim.h + SPEC.bleed * 2;

/**
 * Retângulos dos quadros, em milímetros a partir da **borda do arquivo**.
 *
 * As margens vêm de `pageInsets`, o mesmo módulo que a tela lê: a divisão da
 * página passou a ser uma medida só, escrita num lugar só. A régua da divisão é
 * a metade do arquivo — que é também a metade da área final, já que a sangria é
 * igual dos dois lados.
 */
function slotBoxes(page: EditorPage, spineSide: 'left' | 'right') {
  // "Página inteira" sangra sempre, e "com margem" tem margem sempre: são os
  // dois layouts de uma foto só, e um vira o outro se o preenchimento mandasse
  // neles.
  if (page.layout === 'full') {
    return [{ x: 0, y: 0, w: FILE_W, h: FILE_H }];
  }

  const insets =
    page.layout === 'inset'
      ? pageInsets({ ...page, fill: false }, spineSide, SPEC.bleed)
      : pageInsets(page, spineSide, SPEC.bleed);

  const { top, bottom, left, right, gap } = insets;
  const innerW = FILE_W - left - right;
  const innerH = FILE_H - top - bottom;
  const halfX = FILE_W / 2;
  const halfY = FILE_H / 2;

  switch (page.layout) {
    case 'inset':
      return [{ x: left, y: top, w: innerW, h: innerH }];
    case 'duoV':
      return [
        { x: left, y: top, w: halfX - left - gap / 2, h: innerH },
        { x: halfX + gap / 2, y: top, w: halfX - right - gap / 2, h: innerH },
      ];
    case 'duoH':
      return [
        { x: left, y: top, w: innerW, h: halfY - top - gap / 2 },
        { x: left, y: halfY + gap / 2, w: innerW, h: halfY - bottom - gap / 2 },
      ];
    case 'trio': {
      // 58% da altura do arquivo em cima, o resto embaixo — como no CSS.
      const split = FILE_H * 0.58;
      return [
        { x: left, y: top, w: innerW, h: split - top },
        {
          x: left,
          y: split + gap,
          w: halfX - left - gap / 2,
          h: FILE_H * 0.42 - bottom - gap,
        },
        {
          x: halfX + gap / 2,
          y: split + gap,
          w: halfX - right - gap / 2,
          h: FILE_H * 0.42 - bottom - gap,
        },
      ];
    }
    case 'quad':
      return [0, 1, 2, 3].map((i) => {
        const x = i % 2 === 0 ? left : halfX + gap / 2;
        const y = i < 2 ? top : halfY + gap / 2;
        return {
          x,
          y,
          w: (i % 2 === 0 ? halfX - gap / 2 : FILE_W - right) - x,
          h: (i < 2 ? halfY - gap / 2 : FILE_H - bottom) - y,
        };
      });
    default:
      return [];
  }
}

/**
 * Um bloco de texto da página.
 *
 * Mesma âncora dos elementos da capa: as coordenadas são % da **área final**,
 * então a conta parte do canto do corte. O respiro do fundo e a largura útil
 * saem de `pageLayout`, os mesmos que a tela usa — é isso que faz a linha
 * quebrar no papel onde quebrou na tela.
 */
function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  block: PageTextBlock,
  context: PrintContext,
  mm: Ruler,
  originX: number,
  originY: number,
): void {
  const text = block.uppercase ? block.text.toUpperCase() : block.text;
  if (!text.trim()) return;

  const trimW = mm(SPEC.trim.w);
  const trimH = mm(SPEC.trim.h);
  const size = mm(block.size);
  const padX = size * TEXT_PAD.x;
  const padY = size * TEXT_PAD.y;
  const boxWidth = (block.width / 100) * trimW;
  // `border-box` na tela: o respiro come a largura da caixa, não soma a ela.
  const inner = Math.max(size, boxWidth - (block.backdrop === 'none' ? 0 : padX * 2));

  ctx.save();
  ctx.translate(originX + (block.x / 100) * trimW, originY + (block.y / 100) * trimH);
  ctx.rotate((block.rotation * Math.PI) / 180);

  ctx.font = `${context.weight[block.font] ?? 400} ${size}px ${
    context.family[block.font] ?? 'sans-serif'
  }`;
  ctx.textBaseline = 'alphabetic';

  const lines = wrap(ctx, text, inner);
  const lineHeight = size * block.leading;

  if (block.backdrop !== 'none') {
    const boxHeight = lines.length * lineHeight + padY * 2;
    ctx.fillStyle = TEXT_BACKDROP[block.backdrop];
    ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
  }

  ctx.fillStyle = block.color ?? context.ink;
  const tracking = (block.tracking / 100) * size;
  const firstBaseline = -((lines.length - 1) * lineHeight) / 2 + size * 0.35;
  const anchor = block.align === 'left' ? -inner / 2 : block.align === 'right' ? inner / 2 : 0;

  lines.forEach((line, index) => {
    drawTracked(
      ctx,
      line,
      anchor,
      firstBaseline + index * lineHeight,
      tracking,
      block.align as CanvasTextAlign,
    );
  });

  ctx.restore();
}

/** O número da página, no pé do lado externo — se o álbum os mostrar. */
function drawPageNumber(
  ctx: CanvasRenderingContext2D,
  page: EditorPage,
  context: PrintContext,
  mm: Ruler,
  side: PrintPageSide,
): void {
  if (!context.album.showPageNumbers) return;

  const onPhoto = numberOverPhoto(page);
  const size = mm(PAGE_NUMBER.size);
  // O número fica no corte externo: do lado oposto ao da lombada.
  const outerRight = side.spineSide === 'left';

  ctx.save();
  ctx.font = `500 ${size}px ${context.family.dm ?? 'sans-serif'}`;
  ctx.fillStyle = onPhoto ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.45)';
  ctx.textBaseline = 'alphabetic';
  if (onPhoto) {
    // Sobre foto o número precisa de um respiro escuro atrás, como na tela.
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.9;
    ctx.shadowOffsetY = size * 0.12;
  }

  const x = mm(
    outerRight
      ? SPEC.bleed + SPEC.trim.w - PAGE_NUMBER.edge
      : SPEC.bleed + PAGE_NUMBER.edge,
  );
  // A medida da tela é a borda de baixo da caixa do número; a do canvas é a
  // linha de base. A diferença é a descida da fonte.
  const y = mm(SPEC.bleed + SPEC.trim.h - PAGE_NUMBER.bottom) - size * 0.22;

  drawTracked(ctx, String(side.number), x, y, size * 0.06, outerRight ? 'right' : 'left');
  ctx.restore();
}

/** A página "só texto": título e corpo centrados na mancha. */
function drawTextPage(
  ctx: CanvasRenderingContext2D,
  page: EditorPage,
  context: PrintContext,
  mm: Ruler,
  side: PrintPageSide,
  originY: number,
): void {
  const insets = pageInsets({ ...page, fill: false }, side.spineSide, SPEC.bleed);
  const boxWidth = mm(FILE_W - insets.left - insets.right);

  ctx.fillStyle = context.ink;
  ctx.textBaseline = 'alphabetic';

  const headingSize = mm(9);
  ctx.font = `${context.weight.anton ?? 400} ${headingSize}px ${
    context.family.anton ?? 'sans-serif'
  }`;
  const headingLines = wrap(ctx, page.heading.toUpperCase(), boxWidth);

  const bodySize = mm(3.4);
  const bodyLineHeight = bodySize * 1.5;
  ctx.font = `400 ${bodySize}px ${context.family.dm ?? 'sans-serif'}`;
  const bodyLines = wrap(ctx, page.body, boxWidth);

  const headingLineHeight = headingSize * 0.95;
  const total =
    headingLines.length * headingLineHeight +
    (page.heading ? mm(4) : 0) +
    bodyLines.length * bodyLineHeight;

  let y = originY + (mm(SPEC.trim.h) - total) / 2 + headingSize * 0.8;
  const x = mm(insets.left);

  ctx.textAlign = 'left';
  ctx.font = `${context.weight.anton ?? 400} ${headingSize}px ${
    context.family.anton ?? 'sans-serif'
  }`;
  for (const line of headingLines) {
    ctx.fillText(line, x, y);
    y += headingLineHeight;
  }

  if (page.heading) y += mm(4);
  ctx.font = `400 ${bodySize}px ${context.family.dm ?? 'sans-serif'}`;
  ctx.globalAlpha = 0.85;
  for (const line of bodyLines) {
    ctx.fillText(line, x, y);
    y += bodyLineHeight;
  }
  ctx.globalAlpha = 1;
}

/** Uma página do miolo, no arquivo com sangria. */
export function drawInnerPage(
  ctx: CanvasRenderingContext2D,
  page: EditorPage,
  context: PrintContext,
  mm: Ruler,
  side: PrintPageSide,
): void {
  const originX = mm(SPEC.bleed);
  const originY = mm(SPEC.bleed);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Texto de trás primeiro: ele é fundo da foto, não legenda dela.
  for (const block of page.textBlocks) {
    if (block.behind) drawTextBlock(ctx, block, context, mm, originX, originY);
  }

  if (page.layout === 'text') {
    drawTextPage(ctx, page, context, mm, side, originY);
  } else {
    const boxes = slotBoxes(page, side.spineSide);
    const capacity = layoutById(page.layout).slots;

    for (let i = 0; i < capacity && i < boxes.length; i += 1) {
      const frame = page.slots[i];
      const image = frame.photoId ? context.images.get(frame.photoId) : undefined;
      const box = boxes[i];
      const pixels = { x: mm(box.x), y: mm(box.y), w: mm(box.w), h: mm(box.h) };
      if (!image) {
        ctx.fillStyle = '#efece7';
        ctx.fillRect(pixels.x, pixels.y, pixels.w, pixels.h);
        continue;
      }
      drawFramed(ctx, image, pixels, frame);
    }
  }

  for (const block of page.textBlocks) {
    if (!block.behind) drawTextBlock(ctx, block, context, mm, originX, originY);
  }

  drawPageNumber(ctx, page, context, mm, side);
}

/** A capa externa: cor chapada e os elementos posicionados. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  context: PrintContext,
  mm: Ruler,
): void {
  ctx.fillStyle = context.paper;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const element of context.album.elements) {
    drawCoverElement(ctx, element, context, mm, mm(SPEC.bleed), mm(SPEC.bleed));
  }
}

/** A contracapa externa: a mesma cor, com o texto opcional rente à margem. */
export function drawBackCover(
  ctx: CanvasRenderingContext2D,
  context: PrintContext,
  mm: Ruler,
): void {
  ctx.fillStyle = context.paper;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const { back } = context.album;
  if (!back.show || !back.text.trim()) return;

  const size = mm(3.2);
  ctx.font = `400 ${size}px ${context.family.dm ?? 'sans-serif'}`;
  ctx.fillStyle = context.ink;
  ctx.globalAlpha = 0.85;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const x = mm(SPEC.bleed + SPEC.safe.outer);
  const width = mm(SPEC.trim.w - SPEC.safe.outer - SPEC.safe.spine);
  const lines = wrap(ctx, back.text, width);
  const lineHeight = size * 1.5;
  let y = mm(SPEC.bleed + SPEC.trim.h - SPEC.safe.bottom) - (lines.length - 1) * lineHeight;

  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  ctx.globalAlpha = 1;
}

/** A lombada, no arquivo próprio: sangria só em cima e embaixo. */
export function drawSpine(
  ctx: CanvasRenderingContext2D,
  context: PrintContext,
  mm: Ruler,
  spineTextMm: number,
): void {
  ctx.fillStyle = context.paper;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const title = titleOf(context.album);
  const { spine } = context.album;
  if (!spine.show || !title) return;

  const text = spineLabel(title, context.album.spine.showYear, context.album.spine.year);
  if (!text.trim()) return;

  const size = mm(spineTextMm);
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, (spine.offset / 100) * ctx.canvas.height);
  ctx.rotate(((spine.direction === 'ascending' ? -90 : 90) * Math.PI) / 180);
  ctx.font = `${context.weight[title.font] ?? 400} ${size}px ${
    context.family[title.font] ?? 'sans-serif'
  }`;
  ctx.fillStyle = title.color ?? context.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function spineLabel(title: CoverTextElement, showYear: boolean, year: string): string {
  const base = title.uppercase ? title.text.toUpperCase() : title.text;
  return showYear && year ? `${base}   ${year}` : base;
}
