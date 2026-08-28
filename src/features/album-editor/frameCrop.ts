/**
 * A matemática do enquadramento da foto dentro do quadro.
 *
 * Função pura, sem React e sem canvas, porque os dois meios precisam dela e
 * precisam do **mesmo resultado**: a tela desenha a foto com esta conta, o PDF
 * redesenha com ela, e é isso que faz o arquivo sair igual à página que a
 * pessoa montou. Antes cada lado tinha a sua, e o limite do arraste era um
 * número fixo (±40) que não sabia nem o tamanho da foto nem o zoom — daí o
 * enquadramento que "escapava" do quadro e a foto que travava.
 *
 * A régua do deslocamento é o **lado desenhado da foto**, não o do quadro:
 * assim o limite é uma razão entre os dois lados, e não depende de saber o
 * quadro em pixels.
 */

import type { FrameFit } from '@/types/album-editor';

export interface CropRatios {
  /** Largura desenhada da foto ÷ largura do quadro. */
  rw: number;
  /** Altura desenhada da foto ÷ altura do quadro. */
  rh: number;
  /** Deslocamento máximo em cada eixo, em % do lado desenhado da foto. */
  maxX: number;
  maxY: number;
}

const NEUTRAL: CropRatios = { rw: 1, rh: 1, maxX: 0, maxY: 0 };

/**
 * Quanto a foto pode andar num eixo, em % do próprio lado desenhado.
 *
 * Sobrando foto (`ratio > 1`), ela anda até a borda dela encostar na borda do
 * quadro — um passo a mais abriria papel vazio dentro do quadro. Faltando foto
 * (`ratio < 1`, o caso do encaixe "foto inteira"), ela anda até encostar por
 * dentro — um passo a mais a jogaria para fora da página.
 */
function reach(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return (Math.abs(ratio - 1) / ratio) * 50;
}

export function cropRatios(
  frameW: number,
  frameH: number,
  imageW: number,
  imageH: number,
  fit: FrameFit,
  zoom: number,
): CropRatios {
  const ok =
    Number.isFinite(frameW) &&
    Number.isFinite(frameH) &&
    frameW > 0 &&
    frameH > 0 &&
    imageW > 0 &&
    imageH > 0;
  if (!ok) return NEUTRAL;

  const byWidth = frameW / imageW;
  const byHeight = frameH / imageH;
  const base = fit === 'contain' ? Math.min(byWidth, byHeight) : Math.max(byWidth, byHeight);
  const scale = base * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);

  const rw = (imageW * scale) / frameW;
  const rh = (imageH * scale) / frameH;

  return { rw, rh, maxX: reach(rw), maxY: reach(rh) };
}

/** Poda o deslocamento guardado ao que este zoom permite. */
export function clampOffset(offset: number, max: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(max, Math.max(-max, offset));
}
