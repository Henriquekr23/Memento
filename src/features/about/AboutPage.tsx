'use client';

import Link from 'next/link';

import { LogoMark } from '@/components/Logo';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { Tooltip } from '@/components/Tooltip';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';
import { AUTHOR } from '@/lib/author';

import { ABOUT, STACK } from './copy';

/**
 * Página "Sobre": o que o Memento é, o que ele não faz de propósito e quem fez.
 *
 * Reaproveita barra e rodapé das outras telas — o que muda aqui é só o miolo.
 * Idioma vem do provider, então trocar PT/EN nesta página vale para o site.
 */
export function AboutPage() {
  const { lang } = useLang();
  const t = ABOUT[lang];
  const c = COMMON[lang];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,72px)]">
        <SiteNav variant="inner" tagline={c.navAbout} />

        <article className="py-[clamp(40px,6vw,68px)]">
          <span className="kicker mb-4">{t.kicker}</span>
          <h1 className="m-0 max-w-[24ch] font-[family-name:var(--font-heading)] text-[clamp(32px,4.6vw,54px)] font-normal leading-[1.1] tracking-[-0.01em]">
            {t.title}
          </h1>
          <p className="mt-7 max-w-[60ch] text-[17px] leading-7 text-[color-mix(in_srgb,var(--color-text)_82%,transparent)]">
            {t.lead}
          </p>

          <hr className="hr my-12" />

          {/* Uma coluna no celular, três no desktop: são blocos irmãos, ninguém
              manda em ninguém. */}
          <div className="grid gap-10 md:grid-cols-3 md:gap-x-12">
            {t.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[23px] font-normal leading-7">{section.heading}</h2>
                <p className="mt-3 text-justify text-[15.5px] leading-[26px] text-[color-mix(in_srgb,var(--color-text)_78%,transparent)] hyphens-auto">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <hr className="hr my-12" />

          <section>
            <span className="kicker mb-4">{t.stackKicker}</span>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {STACK.map((item) => (
                <li key={item.name}>
                  <span className="tag tag-outline">
                    {item.name}
                    <span className="ml-1.5 opacity-60">· {item.role[lang]}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[25px] text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]">
              {t.stackNote}
            </p>
            <Tooltip label={c.tipRepo} side="top">
              <a
                href={AUTHOR.repo}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-secondary mt-5"
              >
                {lang === 'pt' ? 'Ver o código no GitHub' : 'View the code on GitHub'}
              </a>
            </Tooltip>
          </section>

          <hr className="hr my-12" />

          <section className="grid gap-7 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-10">
            <div className="flex h-24 w-24 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-divider)] bg-[var(--color-surface)]">
              <LogoMark size={44} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <span className="kicker mb-3">{t.authorKicker}</span>
              <h2 className="text-[26px] font-normal leading-8">{t.authorTitle}</h2>
              <p className="mt-3 max-w-[58ch] text-[15.5px] leading-[26px] text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]">
                {t.authorBody}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/album" className="btn btn-hero" aria-label={c.ctaAria}>
                  {t.backToAlbum}
                </Link>
                <Tooltip label={c.tipEmail} side="top">
                  <a href={`mailto:${AUTHOR.email}`} className="btn btn-secondary">
                    {AUTHOR.email}
                  </a>
                </Tooltip>
              </div>
            </div>
          </section>
        </article>

        <SiteFooter />
      </div>
    </div>
  );
}
