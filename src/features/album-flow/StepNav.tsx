'use client';

import { useRef } from 'react';

import { useLang } from '@/features/i18n/LangProvider';
import { useSlidingPill } from '@/features/landing/nav/useSlidingPill';

import { FLOW_COPY } from './copy';

export type Step = 1 | 2 | 3;

const STEPS: readonly Step[] = [1, 2, 3];

/**
 * As três pílulas do alto: onde a pessoa está e para onde pode ir.
 *
 * O fundinho da etapa atual é a mesma pílula do menu da landing
 * (`useSlidingPill`): uma peça só, que desliza entre as etapas e que dá para
 * segurar e arrastar — a etapa só muda ao soltar. Etapa sem fotos para mostrar
 * fica desativada e a pílula não para nela; voltar sempre funciona. No celular
 * a atual mostra número e nome, as outras só o número (`.af-step-label`, CSS).
 */
export function StepNav({
  step,
  isAvailable,
  onGo,
}: {
  step: Step;
  isAvailable: (step: Step) => boolean;
  onGo: (step: Step) => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const navRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLSpanElement>(null);
  const pill = useSlidingPill(navRef, sliderRef, step - 1, (index) => onGo(STEPS[index]), {
    itemSelector: '.af-step',
    canPick: (index) => isAvailable(STEPS[index]),
  });

  return (
    <nav ref={navRef} aria-label={t.stepsAria} className="af-steps lp-links" {...pill.handlers}>
      <span ref={sliderRef} aria-hidden className="lp-slider">
        <span className="lp-slider-l" />
        <span className="lp-slider-m" />
        <span className="lp-slider-r" />
      </span>
      {STEPS.map((n, index) => {
        const label = t.steps[n - 1];
        const current = n === step;
        return (
          <button
            key={n}
            type="button"
            className="af-step"
            data-lit={pill.lit === index}
            aria-current={current ? 'step' : undefined}
            aria-label={t.stepAria(n, label)}
            disabled={!current && !isAvailable(n)}
            onClick={() => {
              if (!current) onGo(n);
            }}
          >
            <span aria-hidden className="af-step-n">
              {n}
            </span>
            <span aria-hidden className="af-step-label">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
