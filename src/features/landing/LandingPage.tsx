'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Wordmark } from '@/components/Logo';

import { COPY, type Lang } from './copy';
import { usePointerVars } from './usePointerVars';

/**
 * Alterna o tema lendo o estado atual do próprio documento.
 *
 * Sem estado no React de propósito: o padrão vem do sistema operacional por
 * media query no CSS, e ler isso durante o render quebraria a hidratação.
 * Aqui a única fonte da verdade é o `data-theme` no <html>.
 */
function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
}

function SunIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="theme-icon-sun"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="theme-icon-moon"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

/** Traçado do fio que liga as três fotos da ilustração do topo. */
const THREAD = 'M70,400 C170,350 120,230 240,215 C365,200 305,110 405,75';

/**
 * Uma foto solta da ilustração do topo.
 *
 * `depth` é o quanto ela se desloca com o ponteiro: quanto maior, mais perto
 * do observador ela parece estar. A rotação é sobre o próprio centro, então o
 * `transform-origin` vem em coordenadas do viewBox.
 */
function HeroPhoto({
  cx,
  cy,
  width,
  height,
  tilt,
  depth,
  accent = false,
}: {
  cx: number;
  cy: number;
  width: number;
  height: number;
  tilt: number;
  depth: number;
  accent?: boolean;
}) {
  const x = cx - width / 2;
  const y = cy - height / 2;
  const inset = 7;
  const innerSize = width - inset * 2;

  return (
    <g
      className="transition-transform duration-150 ease-out"
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: `translate(calc(var(--mx) * ${-depth}px), calc(var(--my) * ${-depth}px)) rotate(${tilt}deg)`,
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="2"
        fill="var(--color-bg)"
        stroke={accent ? 'var(--color-accent)' : 'var(--color-divider)'}
        strokeWidth="1.5"
      />
      <rect
        x={x + inset}
        y={y + inset}
        width={innerSize}
        height={innerSize}
        fill={
          accent
            ? 'color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))'
            : 'var(--color-surface)'
        }
      />
      <line
        x1={x + inset}
        y1={y + height - inset - 4}
        x2={x + inset + innerSize * 0.62}
        y2={y + height - inset - 4}
        stroke="var(--color-divider)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function LandingPage() {
  const [lang, setLang] = useState<Lang>('pt');
  /** Passo aberto em "Como funciona"; -1 quando todos estão fechados. */
  const [openStep, setOpenStep] = useState(0);
  const t = COPY[lang];

  const {
    setNode: setHeroNode,
    onPointerMove: onHeroMove,
    onPointerLeave: onHeroLeave,
  } = usePointerVars<HTMLElement>();
  const {
    setNode: setPlateNode,
    onPointerMove: onPlateMove,
    onPointerLeave: onPlateLeave,
  } = usePointerVars<HTMLAnchorElement>();

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-[clamp(20px,5vw,72px)] pt-7">
        <Wordmark tagline={t.tagline} />

        <div className="flex items-center gap-5">
          <div className="hidden gap-7 text-sm md:flex">
            <a href="#o-album" className="nav-link">
              {t.navA}
            </a>
            <a href="#como-funciona" className="nav-link">
              {t.navB}
            </a>
            <a href="#recursos" className="nav-link">
              {t.navC}
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang((current) => (current === 'pt' ? 'en' : 'pt'))}
              aria-label={t.langAria}
              className="btn btn-secondary h-9 min-w-9 px-2.5 text-xs tracking-[0.06em]"
            >
              {lang === 'pt' ? 'EN' : 'PT'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t.themeAria}
              className="btn btn-secondary btn-icon"
            >
              <SunIcon />
              <MoonIcon />
            </button>
            <Link
              href="/album"
              aria-label={t.ctaAria}
              className="btn btn-primary hidden sm:inline-flex"
            >
              {t.cta}
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,72px)]">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          ref={setHeroNode}
          onPointerMove={onHeroMove}
          onPointerLeave={onHeroLeave}
          className="relative grid items-center gap-6 py-[76px] md:grid-cols-[1.25fr_1fr]"
          style={{ ['--mx' as string]: 0, ['--my' as string]: 0, ['--angle' as string]: '0deg' }}
        >
          <div>
            <h1 className="mm-rise m-0 -ml-[0.03em] font-[family-name:var(--font-heading)] text-[clamp(38px,5.2vw,68px)] font-normal leading-[1.08] tracking-[-0.01em]">
              <span className="block">{t.heroLine1}</span>
              <span className="block">{t.heroLine2}</span>
            </h1>
            <p className="mm-rise mt-8 max-w-[52ch] text-[17px] leading-7 text-[color-mix(in_srgb,var(--color-text)_82%,transparent)] [animation-delay:0.12s]">
              {t.heroSub}
            </p>

            {/* Só no celular: ali em cima o botão de montar não cabe na barra,
                e sem ele a única porta de entrada ficaria a uma rolagem de
                distância. No desktop a barra já resolve. */}
            <Link
              href="/album"
              aria-label={t.ctaAria}
              className="mm-rise btn btn-primary mt-8 [animation-delay:0.24s] sm:hidden"
            >
              {t.cta}
            </Link>
          </div>

          {/* Três fotos penduradas no mesmo fio: o que o álbum faz, sem texto. */}
          <div aria-hidden className="pointer-events-none hidden md:block">
            <svg viewBox="0 0 480 480" width="100%" height="auto" className="block overflow-visible">
              <g
                className="transition-transform duration-150 ease-out"
                style={{
                  transform: 'translate(calc(var(--mx) * -5px), calc(var(--my) * -5px))',
                }}
              >
                <path d={THREAD} fill="none" stroke="var(--color-divider)" strokeWidth="1.5" />
                <path
                  d={THREAD}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                  strokeDasharray="6 14"
                  strokeLinecap="round"
                  className="mm-dash"
                />
              </g>

              <HeroPhoto cx={70} cy={400} width={78} height={94} tilt={-7} depth={9} />
              <HeroPhoto cx={240} cy={215} width={68} height={82} tilt={6} depth={15} />
              <HeroPhoto cx={402} cy={78} width={94} height={112} tilt={-4} depth={24} accent />
            </svg>
          </div>
        </section>

        <hr className="hr" />

        {/* ── O álbum ───────────────────────────────────────────────────── */}
        <section
          id="o-album"
          className="mm-split grid items-center gap-7 py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-x-[clamp(32px,5vw,80px)]"
        >
          {/* A prancha é a porta de entrada: clicar nela abre o construtor. */}
          <Link
            href="/album"
            aria-label={t.plateAria}
            ref={setPlateNode}
            onPointerMove={onPlateMove}
            onPointerLeave={onPlateLeave}
            className="plate plate-link elev-md order-first block"
            style={{
              ['--mx' as string]: 0,
              ['--my' as string]: 0,
            }}
          >
            <div
              className="grid aspect-[4/5] w-full place-items-center"
              style={{
                background:
                  'repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-text) 4%, transparent) 0 12px, transparent 12px 24px), var(--color-surface)',
              }}
            >
              <div className="px-6 text-center">
                <span className="block text-sm text-[color-mix(in_srgb,var(--color-text)_45%,transparent)]">
                  {t.photoPlaceholder}
                </span>
                <span className="plate-cta mt-3.5 inline-flex items-center gap-1.5 font-[family-name:var(--font-heading)] text-sm font-semibold text-[var(--color-accent-700)]">
                  {t.plateCta}
                  <span aria-hidden className="plate-cta-arrow">
                    →
                  </span>
                </span>
              </div>
            </div>
          </Link>

          <div>
            <span className="kicker mb-3.5">{t.splitKicker}</span>
            <h2 className="max-w-[20ch] text-[32px] font-normal leading-[38px] tracking-[-0.008em]">
              {t.splitTitle}
            </h2>
            <p className="mt-4 text-justify text-[15.5px] leading-[26px] text-[color-mix(in_srgb,var(--color-text)_78%,transparent)] hyphens-auto">
              {t.splitBody}
            </p>
          </div>
        </section>

        <hr className="hr" />

        {/* ── Como funciona ─────────────────────────────────────────────── */}
        <section id="como-funciona" className="py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="kicker">{t.comoKicker}</span>
            <span className="text-[13px] text-[color-mix(in_srgb,var(--color-text)_50%,transparent)]">
              {t.comoHint}
            </span>
          </div>

          <div className="mt-7 grid grid-cols-1 items-start gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((step, index) => {
              const isOpen = index === openStep;
              return (
                <button
                  key={step.title}
                  type="button"
                  className="step"
                  aria-expanded={isOpen}
                  onClick={() => setOpenStep(isOpen ? -1 : index)}
                >
                  <span
                    className="step-num block font-[family-name:var(--font-heading)] text-[44px] font-normal leading-[56px] [font-feature-settings:'tnum'_1]"
                    style={{ marginLeft: index === 0 ? '-0.13em' : undefined }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-2 block font-[family-name:var(--font-heading)] text-[22px] font-normal leading-7">
                    {step.title}
                  </span>
                  <span className="mt-2 block text-[15px] leading-6 text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]">
                    {step.body}
                  </span>
                  <span className="step-detail">
                    <span className="block overflow-hidden">
                      <span className="mt-3 block border-l border-[var(--color-accent)] pl-3.5 text-[14px] leading-[23px] text-[color-mix(in_srgb,var(--color-text)_68%,transparent)]">
                        {step.detail}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <hr className="hr" />

        {/* ── Recursos ──────────────────────────────────────────────────── */}
        <section id="recursos" className="py-16">
          <span className="kicker mb-3.5">{t.recursosKicker}</span>
          <div className="mm-cols mt-3.5 grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-3">
            {t.features.map((feature) => (
              <div key={feature.title}>
                <h2 className="flex min-h-14 items-end text-[25px] font-normal leading-7 tracking-[-0.005em]">
                  {feature.title}
                </h2>
                <p className="mt-3.5 text-justify text-[15.5px] leading-[26px] text-[color-mix(in_srgb,var(--color-text)_78%,transparent)] hyphens-auto">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <hr className="hr" />

        <section className="flex flex-wrap items-center justify-between gap-4 py-12">
          <h2 className="m-0 max-w-[24ch] text-[28px] font-normal leading-[34px]">
            {t.closingTitle}
          </h2>
          <Link href="/album" className="btn btn-primary" aria-label={t.ctaAria}>
            {t.cta}
          </Link>
        </section>

        <hr className="hr" />

        <footer className="py-8 text-[13px] leading-5 text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
          {t.footer}
        </footer>
      </div>
    </div>
  );
}
