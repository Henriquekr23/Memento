'use client';

import Image from 'next/image';

import { useLang } from '@/features/i18n/LangProvider';

import { COPY } from './copy';
import { usePointerVars } from './usePointerVars';

/**
 * Os dois destinos possíveis das mesmas fotos, lado a lado.
 *
 * As duas ilustrações são desenhadas, não fotografadas: o "antes" é a grade de
 * seis quadrados iguais do aplicativo de fotos (a falta de hierarquia é o
 * argumento da seção, então ela precisa aparecer), e o "depois" é uma página do
 * álbum montada com os mesmos componentes que o produto usa — papel, moldura,
 * legenda e data.
 *
 * A única imagem de verdade é a do herói, reaproveitada aqui dentro da moldura:
 * é o mesmo arquivo já baixado no topo da página, então não custa uma segunda
 * requisição.
 */
export function BeforeAfter() {
  const { lang } = useLang();
  const t = COPY[lang].beforeAfter;
  /* A página do álbum acompanha o ponteiro de leve. O movimento sai por
     variável CSS escrita fora do React — nenhum re-render por pixel. */
  const { setNode, onPointerMove, onPointerLeave } = usePointerVars<HTMLElement>();

  return (
    <section id="antes-depois" className="page-shell py-[clamp(48px,6vw,80px)]">
      <span className="kicker mb-2.5">{t.kicker}</span>
      <h2 className="max-w-[16ch] text-[clamp(28px,3.4vw,40px)] leading-[1.14]">{t.title}</h2>
      <p className="mt-4 max-w-[60ch] text-[15.5px] leading-[1.6] text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]">
        {t.lead}
      </p>

      <div className="mt-9 grid gap-6 md:grid-cols-2">
        <div className="ba-card" data-tone="before">
          <span className="chip">{t.before.badge}</span>
          <h3 className="ba-card-title">{t.before.title}</h3>
          <p className="ba-card-body">{t.before.body}</p>
          <div aria-hidden className="ba-grid">
            {[0, 1, 2, 3, 4, 5].map((cell) => (
              <div key={cell} className="ba-cell" />
            ))}
          </div>
        </div>

        <div className="ba-card" data-tone="after">
          <span className="chip chip-accent">{t.after.badge}</span>
          <h3 className="ba-card-title">{t.after.title}</h3>
          <p className="ba-card-body">{t.after.body}</p>

          {/* A página do álbum. `aria-hidden` porque é ilustração: tudo o que
              ela diz já está escrito no parágrafo acima. */}
          <figure
            aria-hidden
            ref={setNode}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            className="album-plate"
          >
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-neutral-300)]">
              <Image
                src="/hero.jpg"
                alt=""
                fill
                sizes="(max-width: 768px) 90vw, 420px"
                className="object-cover [filter:saturate(0.6)_contrast(0.85)_brightness(1.1)]"
              />
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-3">
              <span className="font-[family-name:var(--font-heading)] text-[13px] font-bold text-[var(--color-neutral-800)]">
                {t.afterCaption}
              </span>
              <span className="text-[11px] tabular-nums text-[var(--color-neutral-600)]">
                14.08.2026 · 18:42
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
