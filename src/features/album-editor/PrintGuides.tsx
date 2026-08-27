/**
 * Guias de impressão: sangria, corte, área segura e vinco.
 *
 * `bleed` liga e desliga a sangria **por lado**, e não é firula: a capa não tem
 * sangria do lado da lombada, a contracapa não tem do outro, e a lombada não
 * tem em lado nenhum — ali é dobra, não corte. Uma guia desenhada nos quatro
 * lados por igual mentiria sobre onde a faca passa.
 */

import { SPEC } from '@/features/album-print/spec';

export type SpineSide = 'left' | 'right';

export interface BleedSides {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export const ALL_BLEED: BleedSides = { top: true, right: true, bottom: true, left: true };

interface PrintGuidesProps {
  /** Pixels de tela por milímetro. */
  ppm: number;
  spineSide?: SpineSide;
  bleed?: BleedSides;
  /** Marca do vinco da capa externa. */
  hinge?: boolean;
  show: boolean;
}

export function PrintGuides({
  ppm,
  spineSide = 'left',
  bleed = ALL_BLEED,
  hinge = false,
  show,
}: PrintGuidesProps) {
  if (!show) return null;

  const b = SPEC.bleed * ppm;
  const safe = SPEC.safe;

  const top = bleed.top ? b : 0;
  const right = bleed.right ? b : 0;
  const bottom = bleed.bottom ? b : 0;
  const left = bleed.left ? b : 0;

  // A margem de segurança é maior do lado da lombada: 12 mm contra 5 mm.
  const safeLeft = left + (spineSide === 'left' ? safe.spine : safe.outer) * ppm;
  const safeRight = right + (spineSide === 'right' ? safe.spine : safe.outer) * ppm;

  return (
    <div className="ae-guides" aria-hidden="true">
      <div className="ae-g-trim" style={{ top, right, bottom, left }} />
      <div
        className="ae-g-safe"
        style={{
          top: top + safe.top * ppm,
          right: safeRight,
          bottom: bottom + safe.bottom * ppm,
          left: safeLeft,
        }}
      />
      {hinge && (
        <div
          className="ae-g-hinge"
          style={{
            [spineSide]: (spineSide === 'left' ? left : right) + SPEC.hinge * ppm,
            top: 0,
            bottom: 0,
            width: 1,
          }}
        />
      )}
    </div>
  );
}

/** Guias da lombada: corte só em cima e embaixo, área segura a 1 mm dos lados. */
export function SpineGuides({ ppm, show }: { ppm: number; show: boolean }) {
  if (!show) return null;
  const b = SPEC.bleed * ppm;
  const s = SPEC.spineSafe * ppm;

  return (
    <div className="ae-guides" aria-hidden="true">
      <div className="ae-g-trim" style={{ top: b, bottom: b, left: 0, right: 0 }} />
      <div className="ae-g-safe" style={{ top: b + s, bottom: b + s, left: s, right: s }} />
    </div>
  );
}
