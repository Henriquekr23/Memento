'use client';

import { useRef } from 'react';

import { SiteFooter } from '@/components/SiteFooter';

import { BeforeAfter } from './BeforeAfter';
import { LANDING_SECTIONS } from './copy';
import { landingFontVars } from './fonts';
import { HeroAlbum } from './hero-album/HeroAlbum';
import { LandingFaq } from './LandingFaq';
import { LandingNav } from './nav/LandingNav';
import { useActiveSection } from './nav/useActiveSection';
import { useAnchorScroll } from './smoothScroll';
import { OrganizeSection } from './organize/OrganizeSection';

/**
 * A página inicial: "o álbum é a página".
 *
 * De cima para baixo: o herói é um fotolivro que abre com a rolagem e explica
 * o Memento em quatro aberturas (`#como-funciona`); a seção escura deixa a
 * pessoa organizar uma viagem de exemplo e vê-la virar álbum (`#organizar`);
 * depois "Antes e depois", as perguntas e o rodapé, que são as seções de antes
 * com fundo e espaçamento novos.
 *
 * `.landing` é a fronteira dos tokens novos (`--landing-*`, fontes e o remapeio
 * dos tokens do Organic para as seções antigas): nada daqui vaza para
 * `/album`, `/albums`, `/conta` ou `/sobre`. O `data-nav` dele é escrito pelo
 * herói quando a última folha vira, e é o que solta a barra de navegação.
 */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const active = useActiveSection(rootRef, LANDING_SECTIONS);
  useAnchorScroll(rootRef);

  return (
    <div ref={rootRef} className={`landing ${landingFontVars}`}>
      <LandingNav active={active} />

      <main>
        <HeroAlbum rootRef={rootRef} />
        <OrganizeSection />

        <div className="lp-band lp-band-1">
          <BeforeAfter />
        </div>

        <div className="lp-band lp-band-2">
          <LandingFaq />
        </div>
      </main>

      {/* Mesma faixa das perguntas, fora do `<main>`: o rodapé é da página,
          não do conteúdo. */}
      <div className="lp-band lp-band-2 lp-band-foot">
        <div className="page-shell">
          <SiteFooter showMark={false} />
        </div>
      </div>
    </div>
  );
}
