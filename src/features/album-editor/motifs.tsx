/**
 * Os grafismos da capa na tela.
 *
 * O desenho em si mora em `motifPaths.ts` — aqui é só a tradução para SVG. É a
 * mesma geometria que o canvas do PDF usa, então o que a pessoa posiciona é
 * exatamente o que sai impresso.
 */

import type { MotifShape } from '@/types/album-editor';

import { MOTIF_PATHS } from './motifPaths';

export { MOTIF_SHAPES } from './motifPaths';

export function Motif({
  shape,
  ink,
  paper,
}: {
  shape: MotifShape;
  ink: string;
  paper: string;
}) {
  return (
    <>
      {MOTIF_PATHS[shape].map((part, index) => {
        const color = part.fill === 'paper' ? paper : ink;
        return (
          <path
            key={index}
            d={part.d}
            fill={part.stroke ? 'none' : color}
            stroke={part.stroke ? color : undefined}
            strokeWidth={part.stroke}
            strokeLinecap={part.stroke ? 'round' : undefined}
          />
        );
      })}
    </>
  );
}
