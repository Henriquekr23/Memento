'use client';

import Link from 'next/link';

import { useLang } from '@/features/i18n/LangProvider';

import { ACCOUNT_COPY } from './copy';

/**
 * Os trechos de texto das páginas da conta.
 *
 * As páginas (`/albums`, `/conta`) são server components: buscam os dados e
 * montam a estrutura. O idioma, porém, só existe no navegador — então cada
 * trecho visível vem de um destes componentes client, que leem `useLang()` e
 * trocam junto com o botão de idioma, sem recarregar a página.
 */

function useCopy() {
  const { lang } = useLang();
  return ACCOUNT_COPY[lang];
}

export type AccountSection = 'albums' | 'account';

const TABS: { id: AccountSection; href: string; icon: string }[] = [
  {
    id: 'albums',
    href: '/albums',
    icon: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM12 4v16',
  },
  {
    id: 'account',
    href: '/conta',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  },
];

/** As duas abas da conta, no lugar do indicador de etapas da /album. */
export function AccountTabs({ section }: { section: AccountSection }) {
  const t = useCopy();
  return (
    <nav aria-label={t.tabsLabel} className="af-steps ac-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className="af-step ac-tab"
          aria-current={tab.id === section ? 'page' : undefined}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d={tab.icon} />
          </svg>
          {tab.id === 'albums' ? t.tabAlbums : t.tabAccount}
        </Link>
      ))}
    </nav>
  );
}

/** Título, linha de apoio e a ação principal de "Meus álbuns". */
export function AlbumsHead({ count, firstName }: { count: number; firstName: string }) {
  const t = useCopy();
  return (
    <div className="af-head">
      <h1 className="lp-h af-title">{t.albumsTitle}</h1>
      <p className="af-lead">
        {count === 0 ? t.albumsLeadEmpty(firstName) : t.albumsLeadCount(count)}
      </p>
      <Link href="/album" className="af-btn af-btn-primary af-btn-lg ac-head-cta">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t.newAlbum}
      </Link>
    </div>
  );
}

export function AlbumsEmpty() {
  const t = useCopy();
  return (
    <div className="ac-empty">
      <span aria-hidden className="ac-empty-art">
        <span />
        <span />
        <span />
      </span>
      <h2 className="lp-h ac-empty-title">{t.emptyTitle}</h2>
      <p className="ac-empty-text">
        {t.emptyTextBefore}
        <strong>{t.emptyTextStrong}</strong>
        {t.emptyTextAfter}
      </p>
    </div>
  );
}

export function SharedAlbumsHead() {
  const t = useCopy();
  return (
    <div className="ac-block-head">
      <h2 className="lp-h af-h2">{t.sharedTitle}</h2>
      <p className="af-help">{t.sharedHelp}</p>
    </div>
  );
}

/** Título e linha de apoio de "Minha conta". */
export function AccountHead() {
  const t = useCopy();
  return (
    <div className="af-head">
      <h1 className="lp-h af-title">{t.accountTitle}</h1>
      <p className="af-lead">{t.accountLead}</p>
    </div>
  );
}

/** O rótulo do botão de sair e a dica embaixo dele (o `<form>` fica na página). */
export function SignOutLabel() {
  return <>{useCopy().signOut}</>;
}

export function SignOutHint() {
  return <p className="ac-hint">{useCopy().signOutHint}</p>;
}
