'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

import { signOutAction } from './actions';
import { firstNameOf, initialOf } from './name';
import { useSessionUser } from './useSessionUser';

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
 */
export function AccountMenu() {
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
        <div role="menu" className="menu">
          <p className="px-2.5 pb-1.5 pt-1 text-xs text-[color-mix(in_srgb,var(--color-text)_50%,transparent)]">
            {user.email}
          </p>
          <div className="menu-sep" />
          {/* Fechar no clique, e não num efeito que observa a rota: o menu
              precisa sumir junto com o clique, antes da tela nova chegar. */}
          <Link role="menuitem" href="/albums" className="menu-item" onClick={close}>
            {t.navMyAlbums}
          </Link>
          <Link role="menuitem" href="/conta" className="menu-item" onClick={close}>
            {t.navAccount}
          </Link>
          <div className="menu-sep" />
          <form action={signOutAction} onSubmit={close}>
            <button role="menuitem" type="submit" className="menu-item">
              {t.navSignOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
