'use client';

import { useState } from 'react';

import { FAQ } from '@/features/faq/copy';
import { useLang } from '@/features/i18n/LangProvider';

import { COPY } from './copy';

/**
 * As perguntas frequentes na própria página, e não na bolha flutuante.
 *
 * As perguntas são as mesmas de `features/faq/copy.ts` — a lista existe uma
 * vez só, e a bolha continua servindo as telas internas (`/album`, `/albums`),
 * onde não há corpo de página para abrir um acordeão.
 *
 * A resposta fechada continua no DOM (só com altura zero), então o Ctrl+F do
 * navegador acha o texto mesmo com o item recolhido.
 */
export function LandingFaq() {
  const { lang } = useLang();
  const t = COPY[lang];
  const faq = FAQ[lang];
  const [open, setOpen] = useState(-1);

  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-[860px] px-[clamp(20px,5vw,56px)] pb-[clamp(56px,7vw,96px)] pt-[clamp(24px,4vw,48px)]"
    >
      <h2 className="text-[clamp(28px,3.4vw,40px)]">{t.faqTitle}</h2>
      <p className="mt-2 text-[15px] text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
        {faq.subtitle}
      </p>

      <div className="mt-6 flex flex-col">
        {faq.items.map((item, index) => {
          const isOpen = index === open;
          return (
            <div key={item.question} className="qa-row">
              <button
                type="button"
                className="qa-q"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span>{item.question}</span>
                <span aria-hidden className="qa-plus">
                  +
                </span>
              </button>
              <div className="qa-a">
                <div className="overflow-hidden">
                  <p className="mb-5 max-w-[64ch] text-[14.5px] leading-[1.65] text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
