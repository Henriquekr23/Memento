/**
 * Os grafismos da capa, em geometria pura.
 *
 * Fonte única: a tela desenha isto em SVG e o PDF desenha o **mesmo** `d` num
 * `Path2D` do canvas. Manter dois desenhos parecidos em dois arquivos é como se
 * perde a fidelidade entre o que a pessoa vê e o que a gráfica imprime — foi
 * por isso que sobrou só esta lista.
 *
 * Coordenadas numa caixa 0–100; quem usa escala. `fill: 'paper'` significa a
 * cor da capa (vazado), `'ink'` significa a tinta pareada.
 */

import type { MotifShape } from '@/types/album-editor';

export interface MotifPart {
  /** Dados de caminho SVG. */
  d: string;
  fill: 'ink' | 'paper';
  /** Espessura, quando a peça é traço e não preenchimento. */
  stroke?: number;
}

/** Elipse como caminho: dois arcos, para valer nos dois meios. */
function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

const discRays: MotifPart[] = Array.from({ length: 16 }, (_, i) => ({
  d: `M50 50 L${(50 + 46 * Math.cos((i * Math.PI) / 8)).toFixed(3)} ${(
    50 + 46 * Math.sin((i * Math.PI) / 8)
  ).toFixed(3)}`,
  fill: 'paper' as const,
  stroke: 1.4,
}));

export const MOTIF_PATHS: Record<MotifShape, MotifPart[]> = {
  /** Olho grego: três anéis alternados e a pupila. */
  eye: [
    { d: ellipse(50, 50, 50, 34), fill: 'paper' },
    { d: ellipse(50, 50, 33, 22), fill: 'ink' },
    { d: ellipse(50, 50, 20, 20), fill: 'paper' },
    { d: ellipse(50, 50, 11, 11), fill: 'ink' },
  ],

  disc: [
    { d: ellipse(50, 50, 46, 46), fill: 'ink' },
    ...discRays,
    { d: ellipse(50, 50, 5, 5), fill: 'paper' },
  ],

  arch: [{ d: 'M4 82 A46 46 0 0 1 96 82 Z', fill: 'ink' }],

  stripes: [
    { d: 'M0 18 H100 V31 H0 Z', fill: 'ink' },
    { d: 'M0 44 H100 V57 H0 Z', fill: 'ink' },
    { d: 'M0 70 H100 V83 H0 Z', fill: 'ink' },
  ],

  waves: [34, 58, 82].map((y) => ({
    d: `M0 ${y} Q25 ${y - 20} 50 ${y} T100 ${y}`,
    fill: 'ink' as const,
    stroke: 7,
  })),

  frame: [{ d: 'M4 4 H96 V96 H4 Z', fill: 'ink', stroke: 6 }],
};

export const MOTIF_SHAPES = Object.keys(MOTIF_PATHS) as MotifShape[];
