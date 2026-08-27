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
import type {
  CoverElement,
  CoverTextElement,
  EditorAlbum,
  EditorPage,
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
 * Foto preenchendo o quadro, com o mesmo resultado do `object-fit: cover` da
 * tela: recorta o excesso do lado maior em vez de deformar a imagem.
 */
function drawCovered(
  ctx: CanvasRenderingContext2D,
  image: LoadedImage,
  box: { x: number; y: number; w: number; h: number },
  zoom: number,
  offsetX: number,
  offsetY: number,
): void {
  const scale = Math.max(box.w / image.width, box.h / image.height) * zoom;
  const w = image.width * scale;
  const h = image.height * scale;

  // O deslocamento é em % do quadro, igual à tela — `translate` depois do
  // `scale`, então ele acompanha o zoom.
  const x = box.x + (box.w - w) / 2 + (offsetX / 100) * w;
  const y = box.y + (box.h - h) / 2 + (offsetY / 100) * h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
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
}

/** Retângulos dos quadros de um layout, em milímetros da área final. */
function slotBoxes(page: EditorPage, spineSide: 'left' | 'right') {
  const t = SPEC.trim;
  const gap = 3;
  const m = 10;
  const ms = SPEC.safe.spine;
  const left = spineSide === 'left' ? ms : m;
  const right = spineSide === 'right' ? ms : m;
  const innerW = t.w - left - right;
  const innerH = t.h - m * 2;

  switch (page.layout) {
    case 'full':
      return [{ x: -SPEC.bleed, y: -SPEC.bleed, w: t.w + SPEC.bleed * 2, h: t.h + SPEC.bleed * 2 }];
    case 'inset':
      return [{ x: left, y: m, w: innerW, h: innerH }];
    case 'duoV': {
      const w = (innerW - gap) / 2;
      return [
        { x: left, y: m, w, h: innerH },
        { x: left + w + gap, y: m, w, h: innerH },
      ];
    }
    case 'duoH': {
      const h = (innerH - gap) / 2;
      return [
        { x: left, y: m, w: innerW, h },
        { x: left, y: m + h + gap, w: innerW, h },
      ];
    }
    case 'trio': {
      const topH = innerH * 0.58;
      const bottomH = innerH - topH - gap;
      const w = (innerW - gap) / 2;
      return [
        { x: left, y: m, w: innerW, h: topH },
        { x: left, y: m + topH + gap, w, h: bottomH },
        { x: left + w + gap, y: m + topH + gap, w, h: bottomH },
      ];
    }
    case 'quad': {
      const w = (innerW - gap) / 2;
      const h = (innerH - gap) / 2;
      return [
        { x: left, y: m, w, h },
        { x: left + w + gap, y: m, w, h },
        { x: left, y: m + h + gap, w, h },
        { x: left + w + gap, y: m + h + gap, w, h },
      ];
    }
    default:
      return [];
  }
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

  if (page.layout === 'text') {
    const m = 10;
    const ms = SPEC.safe.spine;
    const left = side.spineSide === 'left' ? ms : m;
    const right = side.spineSide === 'right' ? ms : m;
    const boxWidth = mm(SPEC.trim.w - left - right);

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
    const x = originX + mm(left);

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
    return;
  }

  const boxes = slotBoxes(page, side.spineSide);
  const capacity = layoutById(page.layout).slots;

  for (let i = 0; i < capacity && i < boxes.length; i += 1) {
    const frame = page.slots[i];
    const image = frame.photoId ? context.images.get(frame.photoId) : undefined;
    const box = boxes[i];
    const pixels = {
      x: originX + mm(box.x),
      y: originY + mm(box.y),
      w: mm(box.w),
      h: mm(box.h),
    };
    if (!image) {
      ctx.fillStyle = '#efece7';
      ctx.fillRect(pixels.x, pixels.y, pixels.w, pixels.h);
      continue;
    }
    drawCovered(ctx, image, pixels, frame.zoom, frame.offsetX, frame.offsetY);
  }
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
