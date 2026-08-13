/**
 * O pouco de tipografia que o canvas não traz de fábrica.
 *
 * O CSS do livro usa `tracking-[0.2em]`, `line-clamp` e quebra de linha; o
 * canvas só sabe desenhar uma string numa coordenada. Estas funções puras
 * cobrem a diferença — e ficam fora do desenho da página para que o
 * renderizador conte só a história das páginas.
 */

export type TextAlign = 'left' | 'center' | 'right';

/** Cor hexadecimal do tema com alfa aplicado. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;
  const int = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(int)) return hex;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function alignOffset(width: number, align: TextAlign): number {
  if (align === 'center') return -width / 2;
  if (align === 'right') return -width;
  return 0;
}

/**
 * Texto com espaçamento entre letras.
 *
 * `ctx.letterSpacing` existe, mas só nos navegadores mais novos e sem
 * alternativa quando falta — e o espaçamento largo é justamente o que dá o ar
 * de capa de livro aos títulos. Desenhar caractere a caractere sempre funciona.
 */
export function trackedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  if (text.length === 0) return 0;
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width;
  return width + tracking * (text.length - 1);
}

export function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: TextAlign = 'left',
): void {
  const total = trackedWidth(ctx, text, tracking);
  let cursor = x + alignOffset(total, align);
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';

  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }

  ctx.textAlign = previousAlign;
}

/** Quebra em linhas que cabem em `maxWidth`, respeitando as quebras escritas. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim().length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

/** Uma linha só, com reticências quando não cabe — o `truncate` do CSS. */
export function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, middle)}…`).width <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return `${text.slice(0, low).trimEnd()}…`;
}

/** Retângulo de cantos arredondados, sem depender de `ctx.roundRect`. */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
