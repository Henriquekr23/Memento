'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

import { signOutAction } from './actions';
import { firstNameOf, initialOf } from './name';
import { type SessionUser, useSessionUser } from './useSessionUser';

/**
 * A conta na barra de navegação.
 *
 * Deslogado, são dois alvos e uma hierarquia clara: "Entrar" discreto e
 * "Criar conta" em destaque. Logado, tudo que era link solto na barra
 * ("Meus álbuns", "Sair") entra num menu único atrás do nome — a barra deixa
 * de crescer a cada tela nova que a conta ganha.
 *
 * Enquanto a sessão é lida do cookie, o espaço fica reservado com a largura
 * final: sem isso a barra dá um salto quando o nome aparece.
 *
 * `compact` é a barra da landing: deslogado, só "Entrar" em texto — o botão
 * em destaque ali já é "Montar meu álbum", e dois botões cheios lado a lado
 * dividiriam a atenção. Logado, é o mesmo menu de sempre.
 */
export function AccountMenu({
  compact = false,
  compactClassName = 'nav-link text-[15px] font-medium',
}: {
  compact?: boolean;
  /** Classe do "Entrar" no modo compacto (a landing usa a do botão de idioma). */
  compactClassName?: string;
} = {}) {
  const { user, isLoading } = useSessionUser();
  const { lang } = useLang();
  const t = COMMON[lang];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (isLoading) return <div aria-hidden className="h-[30px] w-[30px]" />;

  // Na própria tela de entrar, os botões de entrar seriam eco: a tela já é o
  // formulário, e ela mesma oferece o caminho para criar conta.
  if (!user && pathname?.startsWith('/entrar')) return null;

  if (!user) {
    // `next` traz a pessoa de volta para onde ela estava depois de entrar.
    const next = encodeURIComponent(pathname || '/');
    if (compact) {
      return (
        <Link href={`/entrar?next=${next}`} className={compactClassName}>
          {t.navSignIn}
        </Link>
      );
    }
    return (
      <div className="flex items-center gap-3">
        {/* No celular os dois não cabem ao lado da marca e do resto da barra —
            e a tela de entrar já oferece "criar conta" logo abaixo do formulário.
            Então: um alvo só no estreito, hierarquia completa a partir de sm. */}
        <Link
          href={`/entrar?next=${next}`}
          className="btn btn-secondary btn-sm sm:hidden"
        >
          {t.navSignIn}
        </Link>
        <Link href={`/entrar?next=${next}`} className="nav-link hidden text-sm sm:inline">
          {t.navSignIn}
        </Link>
        <Link
          href={`/entrar?modo=criar&next=${next}`}
          className="btn btn-primary btn-sm hidden sm:inline-flex"
        >
          {t.navSignUp}
        </Link>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${t.navAccount} — ${user.name}`}
        className="account-trigger"
        data-open={open}
      >
        <span className="avatar">{initialOf(user.name)}</span>
        {/* O nome só aparece onde cabe; no celular o círculo já identifica. */}
        <span className="hidden max-w-[120px] truncate sm:inline">
          {firstNameOf(user.name)}
        </span>
      </button>

      {open && (
        <div role="menu" className="menu account-menu">
          <AccountMenuBody user={user} onNavigate={close} />
        </div>
      )}
    </div>
  );
}

/**
 * O miolo do menu da conta: quem está logado (círculo, nome e e-mail) e as
 * três saídas — "Meus álbuns", "Minha conta" e "Sair".
 *
 * Separado do botão porque mora em dois lugares: no menu que abre do avatar
 * e, no celular, dentro da gaveta "Menu" da landing, onde a barra não tem
 * espaço para o avatar. Assim os dois lugares não divergem.
 *
 * `role="menuitem"` só no menu de verdade (`asMenu`); na gaveta são links
 * comuns dentro de um diálogo.
 */
export function AccountMenuBody({
  user,
  onNavigate,
  asMenu = true,
}: {
  user: SessionUser;
  onNavigate: () => void;
  asMenu?: boolean;
}) {
  const { lang } = useLang();
  const t = COMMON[lang];
  const role = asMenu ? 'menuitem' : undefined;
  return (
    <>
      {/* Quem está entrou: o mesmo círculo do botão, nome e e-mail. */}
      <div className="account-menu-head">
        <span className="avatar" aria-hidden>
          {initialOf(user.name)}
        </span>
        <span className="account-menu-who">
          <span className="account-menu-name">{user.name}</span>
          <span className="account-menu-email">{user.email}</span>
        </span>
      </div>
      <div className="menu-sep" />
      {/* Fechar no clique, e não num efeito que observa a rota: o menu
          precisa sumir junto com o clique, antes da tela nova chegar. */}
      <Link role={role} href="/albums" className="menu-item" onClick={onNavigate}>
        <MenuIcon d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM12 4v16" />
        {t.navMyAlbums}
      </Link>
      <Link role={role} href="/conta" className="menu-item" onClick={onNavigate}>
        <MenuIcon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />
        {t.navAccount}
      </Link>
      <div className="menu-sep" />
      <form action={signOutAction} onSubmit={onNavigate}>
        <button role={role} type="submit" className="menu-item is-danger">
          <MenuIcon d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l4-4-4-4M14 12H4" />
          {t.navSignOut}
        </button>
      </form>
    </>
  );
}

/** Ícone de traço dos itens do menu — herda a cor do item. */
function MenuIcon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="menu-icon"
    >
      <path d={d} />
    </svg>
  );
}
