'use client';

import Image from 'next/image';
import Link from 'next/link';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

import { BeforeAfter } from './BeforeAfter';
import { COPY } from './copy';
import { LandingFaq } from './LandingFaq';
import { useHeroScroll } from './useHeroScroll';

/**
 * A página inicial, no design Organic.
 *
 * A ordem das seções responde, de cima para baixo, às perguntas de quem chega:
 * o que é isto (herói) · por que eu ia querer (antes e depois) · como se usa
 * (passos) · o que garante (recursos) · e as dúvidas que sobram (FAQ).
 *
 * Só o herói sangra até a borda da janela; o resto vive dentro da `.page-shell`,
 * a mesma régua de largura das outras telas. A bolha flutuante de FAQ não
 * aparece aqui de propósito — a página tem a lista inteira aberta no corpo, e
 * as duas juntas eram a mesma resposta oferecida duas vezes.
 */
export function LandingPage() {
  const { lang } = useLang();
  const t = COPY[lang];
  const c = COMMON[lang];
  const { setPhotoNode, solid } = useHeroScroll();

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* A barra fica grudada no topo e só ganha fundo depois do herói: sobre a
          foto ela é clara e transparente, sobre o papel ela é opaca. */}
      <div className="nav-bar" data-solid={solid}>
        <div className="page-shell">
          {/* Sem a assinatura "Guarde a memória" aqui: com os links, o idioma,
              o tema, a conta e o botão, ela quebrava em duas linhas e engordava
              a barra. Ela continua no rodapé, onde há espaço para ser lida. */}
          <SiteNav variant="landing" />
        </div>
      </div>

      {/* ── Herói ──────────────────────────────────────────────────────── */}
      <header id="top" className="hero">
        <div ref={setPhotoNode} className="hero-photo">
          <Image
            src="/hero.jpg"
            alt={t.heroPhotoAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div aria-hidden className="hero-veil" />

        <div className="hero-body page-shell">
          <h1 className="hero-title">
            <span className="block">{t.heroLine1}</span>
            <span className="block">{t.heroLine2}</span>
          </h1>
          <p className="hero-sub">{t.heroSub}</p>

          <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <Link href="/album" aria-label={c.ctaAria} className="btn btn-hero">
              {c.cta}
              <span aria-hidden className="btn-hero-arrow">
                →
              </span>
            </Link>
            <a href="#antes-depois" className="link-onphoto self-center sm:self-auto">
              {t.heroSecondary}
            </a>
          </div>

          <p className="hero-note">{t.heroNote}</p>
        </div>
      </header>

      <BeforeAfter />

      {/* ── Como funciona ─────────────────────────────────────────────── */}
      <section id="como-funciona" className="page-shell py-[clamp(56px,7vw,96px)]">
        <h2 className="mb-10 text-[clamp(28px,3.4vw,40px)]">{t.comoKicker}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((step, index) => (
            <div key={step.title}>
              <span className="step-num">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mb-2 text-[19px]">{step.title}</h3>
              <p className="m-0 text-[14.5px] leading-[1.6] text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                {step.body}
              </p>
              <p className="mt-2.5 mb-0 border-l border-[var(--color-accent)] pl-3 text-[13px] leading-[1.55] text-[color-mix(in_srgb,var(--color-text)_52%,transparent)]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recursos ──────────────────────────────────────────────────── */}
      <section id="recursos" className="page-shell pb-[clamp(48px,6vw,80px)]">
        <span className="kicker mb-2.5">{t.recursosKicker}</span>
        <h2 className="mb-8 max-w-[20ch] text-[clamp(26px,3vw,34px)]">{t.recursosTitle}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {t.features.map((feature) => (
            <div key={feature.title} className="card">
              <h3 className="m-0 text-[19px]">{feature.title}</h3>
              <p className="m-0 text-[14.5px] leading-[1.6] text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <LandingFaq />

      {/* ── Fechamento ────────────────────────────────────────────────── */}
      <section className="page-shell pb-[clamp(56px,7vw,88px)]">
        <div className="flex flex-col items-start gap-5 rounded-[calc(var(--radius-lg)*1.15)] bg-[var(--color-surface)] px-[clamp(24px,4vw,44px)] py-[clamp(28px,4vw,44px)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 max-w-[22ch] text-[clamp(24px,2.6vw,32px)]">{t.closingTitle}</h2>
            <p className="mt-2 mb-0 text-[14px] text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
              {t.closingBody}
            </p>
          </div>
          <Link href="/album" aria-label={c.ctaAria} className="btn btn-hero">
            {c.cta}
            <span aria-hidden className="btn-hero-arrow">
              →
            </span>
          </Link>
        </div>
      </section>

      <div className="page-shell">
        <SiteFooter />
      </div>
    </div>
  );
}
