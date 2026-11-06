'use client';

import { useLang } from '@/features/i18n/LangProvider';

import { COPY } from '../copy';
import { LandingCta } from '../LandingCta';
import { AlbumBook } from './AlbumBook';
import type { VarStyle } from '../writeVars';
import { LEAVES, TINT_LAYERS } from './heroScroll';
import { useHeroAlbumVars } from './useHeroAlbumVars';

/**
 * O herói "o álbum é a página": um contêiner alto com um filho grudento do
 * tamanho da tela. Enquanto a pessoa rola o trecho preso (`--hero-pin` no
 * CSS), o livro fica parado no centro e as folhas viram.
 *
 * Não há título fora do livro: o h1 é a capa. Atrás dele, cinco camadas de cor
 * sólida empilhadas — o fundo troca de tom variando só a opacidade delas.
 */
export function HeroAlbum({ rootRef }: { rootRef: { readonly current: HTMLElement | null } }) {
  const { lang } = useLang();
  const t = COPY[lang].hero;
  const { setSection, setStick, onPointerMove, onPointerLeave, revealEnd } =
    useHeroAlbumVars(rootRef);

  return (
    <section
      ref={setSection}
      data-lp-section="como-funciona"
      aria-label={t.bookLabel}
      className="lp-hero"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {/* A âncora do menu não é o topo do herói (livro fechado): é a primeira
          abertura parada na tela, onde está escrito "Como funciona". */}
      <span id="como-funciona" aria-hidden className="lp-anchor lp-hero-anchor" />

      <div ref={setStick} className="lp-hero-stick">
        <div aria-hidden className="lp-tints">
          {Array.from({ length: TINT_LAYERS }, (_, i) => (
            <div key={i} className="lp-tint" />
          ))}
        </div>

        <div className="lp-book-slot">
          <div className="lp-book-frame">
            <div aria-hidden className="lp-book-floor" />
            <AlbumBook onEndFocus={revealEnd} />
          </div>
        </div>

        {/* Guia de rolagem, na borda direita e sem texto: o gesto (rodinha ou
            seta) e quanto do livro já foi folheado — um traço por folha,
            enchendo com `--fN`. Some quando a última folha vira. */}
        <div aria-hidden className="lp-scrollhint lp-hero-hint">
          <span className="lp-hint-cue">
            <span className="lp-hint-dot" />
          </span>
          <span className="lp-hint-steps">
            {Array.from({ length: LEAVES }, (_, i) => (
              <span key={i} className="lp-hint-step">
                <span style={{ '--fl': `var(--f${i}, 0)` } as VarStyle} />
              </span>
            ))}
          </span>
        </div>

        {/* Só no celular: o botão de largura total embaixo do livro, quando
            ele termina de abrir. No desktop o botão está na última página. */}
        <div className="lp-endcta">
          <LandingCta onFocus={revealEnd} />
        </div>
      </div>
    </section>
  );
}
