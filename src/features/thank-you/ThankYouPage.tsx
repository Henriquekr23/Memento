'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { Tooltip } from '@/components/Tooltip';
import { FaqWidget } from '@/features/faq/FaqWidget';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';
import { ShareRow } from '@/features/share/ShareRow';
import { shareCardFileName } from '@/features/share/shareMessage';

import { THANK_YOU } from './copy';
import {
  getThankYouServerSnapshot,
  getThankYouSnapshot,
  subscribeThankYou,
} from './handoff';

/** Marca de conclusão: o visto dentro de um círculo, em acento. */
function CheckMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14.5" stroke="var(--color-accent)" strokeWidth="1.6" />
      <path
        d="M9.5 16.6l4.4 4.3L22.6 12"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Página de agradecimento, mostrada depois que o álbum é baixado.
 *
 * Os dados vêm do `sessionStorage` (ver `handoff.ts`) e são lidos **num efeito**,
 * não no primeiro render: este arquivo é pré-renderizado como HTML estático no
 * build, onde não existe `sessionStorage`. Ler ali daria HTML diferente do
 * cliente. O primeiro quadro é a versão genérica; se houver álbum, ela é
 * substituída no mesmo instante.
 *
 * Chegar aqui sem ter baixado nada é caso previsto, não erro: a página existe
 * como URL e precisa fazer sentido sozinha.
 */
export function ThankYouPage() {
  const { lang } = useLang();
  const t = THANK_YOU[lang];
  const c = COMMON[lang];

  const album = useSyncExternalStore(
    subscribeThankYou,
    getThankYouSnapshot,
    getThankYouServerSnapshot,
  );

  const photos = album
    ? `${album.photoCount} ${
        lang === 'pt'
          ? album.photoCount === 1
            ? 'foto'
            : 'fotos'
          : album.photoCount === 1
            ? 'photo'
            : 'photos'
      }`
    : '';
  const pages = album
    ? `${album.pageCount} ${
        lang === 'pt'
          ? album.pageCount === 1
            ? 'página'
            : 'páginas'
          : album.pageCount === 1
            ? 'page'
            : 'pages'
      }`
    : '';

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <SiteNav variant="inner" tagline={t.kicker} />

        <main className="py-[clamp(40px,6vw,68px)]">
          <span className="kicker mb-4">{t.kicker}</span>

          <div className="flex items-start gap-4">
            {album && (
              <span className="mt-1.5 flex-none">
                <CheckMark />
              </span>
            )}
            <div>
              <h1 className="m-0 max-w-[26ch] font-[family-name:var(--font-heading)] text-[clamp(30px,4.4vw,50px)] font-normal leading-[1.1] tracking-[-0.01em]">
                {album ? t.title : t.titleGeneric}
              </h1>
              {album && album.albumName.trim() && (
                <p className="mt-4 font-[family-name:var(--font-heading)] text-[22px] leading-7 text-[var(--color-accent-700)]">
                  “{album.albumName.trim()}”
                </p>
              )}
              <p className="mt-4 max-w-[58ch] text-[16.5px] leading-7 text-[color-mix(in_srgb,var(--color-text)_80%,transparent)]">
                {album ? t.lead : t.leadGeneric}
              </p>
              {album && (
                <p className="mt-2 text-[14.5px] leading-6 text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                  {t.summary.replace('{photos}', photos).replace('{pages}', pages)}{' '}
                  {t.checkFile}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/album" className="btn btn-hero" aria-label={c.ctaAria}>
              {t.again}
            </Link>
            <Link href="/" className="btn btn-secondary">
              {t.home}
            </Link>
          </div>

          <hr className="hr my-12" />

          {/* O cartão só aparece quando existe: sem álbum não há o que mostrar,
              e um retângulo vazio prometeria algo que não está lá. */}
          {album?.cardDataUrl && (
            <>
              <section className="grid gap-7 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:gap-10">
                <div className="plate elev-md">
                  {/* `next/image` não entra aqui: a origem é um data URL gerado
                      no navegador, sem largura conhecida em build e sem nada
                      para o otimizador do servidor fazer. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={album.cardDataUrl}
                    alt={t.cardLabel}
                    width={1200}
                    height={630}
                    className="block h-auto w-full"
                  />
                </div>
                <div>
                  <span className="kicker mb-3">{t.cardLabel}</span>
                  <p className="text-[15px] leading-[25px] text-[color-mix(in_srgb,var(--color-text)_76%,transparent)]">
                    {t.cardHint}
                  </p>
                  <Tooltip label={t.downloadCard} side="top">
                    <a
                      href={album.cardDataUrl}
                      download={shareCardFileName(album.albumName)}
                      className="btn btn-primary mt-5"
                    >
                      {t.downloadCard}
                    </a>
                  </Tooltip>
                </div>
              </section>

              <hr className="hr my-12" />
            </>
          )}

          <ShareRow
            albumName={album?.albumName ?? ''}
            photoCount={album?.photoCount ?? 0}
            pageCount={album?.pageCount ?? 0}
            cardDataUrl={album?.cardDataUrl ?? null}
          />

          <hr className="hr my-12" />

          <section>
            <span className="kicker mb-4">{t.nextKicker}</span>
            <div className="grid gap-9 md:grid-cols-3 md:gap-x-12">
              {t.next.map((item) => (
                <div key={item.title}>
                  <h2 className="text-[22px] font-normal leading-7">{item.title}</h2>
                  <p className="mt-2.5 text-justify text-[15px] leading-[25px] text-[color-mix(in_srgb,var(--color-text)_76%,transparent)] hyphens-auto">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>

      <FaqWidget />
    </div>
  );
}
