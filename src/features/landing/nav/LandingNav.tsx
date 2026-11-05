'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Tooltip } from '@/components/Tooltip';
import { AccountMenu } from '@/features/auth/AccountMenu';
import { useSessionUser } from '@/features/auth/useSessionUser';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { isSupabaseConfigured } from '@/lib/supabase/env';

import { COPY, LANDING_SECTIONS } from '../copy';
import { LandingCta } from '../LandingCta';
import { scrollToAnchor } from '../smoothScroll';
import { LangSwitch } from './LangSwitch';
import { useSlidingPill } from './useSlidingPill';

const DRAWER_ID = 'lp-drawer';

/**
 * A barra da landing.
 *
 * Enquanto o livro do herói abre, ela é só a marca, centralizada e um pouco
 * maior. Quando a última folha vira, `useHeroAlbumVars` escreve
 * `data-nav="open"` no wrapper da página e o CSS faz o resto: a marca desliza
 * para a esquerda, a pílula clara aparece atrás e as opções entram. Nenhum
 * re-render — o React só participa da opção ativa (`active`, que muda poucas
 * vezes) e da gaveta do celular.
 *
 * Com o teclado, o menu existe antes de aparecer: o foco dentro da barra
 * (`:focus-within`) força o estado aberto.
 *
 * A opção ativa é marcada por uma pílula só, que desliza entre as opções e
 * pode ser arrastada (`useSlidingPill`). O idioma fica ao lado de "Entrar"
 * (`LangSwitch`); o tema fica no canto enquanto a barra está fechada e,
 * depois, na gaveta.
 *
 * Abaixo de 1120 px as opções não cabem entre a marca e os botões; elas
 * passam para a gaveta, aberta pelo botão "Menu".
 */
export function LandingNav({ active }: { active: number }) {
  const { lang } = useLang();
  const t = COPY[lang].nav;
  const c = COMMON[lang];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const linksRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLSpanElement>(null);
  const pill = useSlidingPill(linksRef, sliderRef, active, goToSection);

  // A logo centralizada é a mesma logo da esquerda, deslocada: o CSS calcula
  // o deslocamento a partir da largura da barra e da largura da logo, que só
  // dá para saber medindo (depende da fonte). Mede de novo quando a janela
  // muda ou quando a fonte chega e a palavra muda de largura.
  useEffect(() => {
    const header = headerRef.current;
    const logo = logoRef.current;
    if (!header || !logo) return;
    const measure = () => {
      header.style.setProperty('--nav-w', `${header.clientWidth}px`);
      header.style.setProperty('--logo-w', `${logo.offsetWidth}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(logo);
    return () => observer.disconnect();
  }, []);

  const closeDrawer = useCallback((returnFocus: boolean) => {
    setDrawerOpen(false);
    if (returnFocus) menuButtonRef.current?.focus();
  }, []);

  return (
    <>
      <header ref={headerRef} className="lp-nav">
        <div aria-hidden className="lp-nav-bar" />

        <div ref={logoRef} className="lp-logo">
          <Tooltip label={c.homeTip} side="bottom">
            <LandingWordmark />
          </Tooltip>
        </div>

        <div className="lp-links-wrap">
          <nav
            ref={linksRef}
            aria-label={t.label}
            className="lp-links lp-reveal"
            {...pill.handlers}
          >
            <span ref={sliderRef} aria-hidden className="lp-slider">
              <span className="lp-slider-l" />
              <span className="lp-slider-m" />
              <span className="lp-slider-r" />
            </span>
            {LANDING_SECTIONS.map((id, index) => (
              <a
                key={id}
                href={`#${id}`}
                draggable={false}
                className="lp-link"
                data-lit={pill.lit === index}
                aria-current={active === index ? 'true' : undefined}
              >
                <span aria-hidden className="lp-link-pill" />
                <span className="lp-link-text">{t.links[id]}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="lp-tools lp-reveal">
          <span className="lp-tool-wide">
            <LangSwitch />
          </span>
          {isSupabaseConfigured && (
            <span className="lp-tool-wide">
              <AccountMenu compact compactClassName="lp-navbtn" />
            </span>
          )}
          <LandingCta className="lp-tool-cta" />
          <button
            ref={menuButtonRef}
            type="button"
            className="lp-menu-btn"
            aria-expanded={drawerOpen}
            aria-controls={DRAWER_ID}
            onClick={() => setDrawerOpen(true)}
          >
            {t.menu}
          </button>
        </div>

        <LandingDrawer open={drawerOpen} active={active} onClose={closeDrawer} />
      </header>

      {/* O tema, enquanto a barra ainda não existe: um ícone solto no canto
        superior direito, que some quando a barra chega (lá o canto é do
        botão). Fora do `<header>` de propósito — focar nele não pode abrir
        a barra pelo `:focus-within`. Depois disso o tema fica na gaveta. */}
      <div className="lp-theme-corner">
        <ThemeToggle className="lp-theme-btn" />
      </div>
    </>
  );
}

/**
 * A gaveta do celular (e da janela estreita): as mesmas opções em tamanho
 * grande, a conta, o botão de montar e as preferências de idioma e tema.
 *
 * Fica sempre no DOM — escondida com `visibility`, que também a tira da ordem
 * do Tab — para a entrada e a saída poderem ser transição. Aberta, prende o
 * foco, fecha com Esc, com "Fechar" e com um toque fora; Esc e "Fechar"
 * devolvem o foco ao botão "Menu". Tocar numa opção só fecha: a página rola até
 * a seção, e o foco segue o link.
 */
function LandingDrawer({
  open,
  active,
  onClose,
}: {
  open: boolean;
  active: number;
  onClose: (returnFocus: boolean) => void;
}) {
  const { lang } = useLang();
  const t = COPY[lang].nav;
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusables = () =>
      Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));

    drawer.querySelector<HTMLElement>('.lp-drawer-link')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(true);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !drawer.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !drawer.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!drawer.contains(event.target as Node)) onClose(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose]);

  return (
    <div
      id={DRAWER_ID}
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.drawerLabel}
      className="lp-drawer"
      data-open={open}
    >
      <div className="lp-drawer-head">
        <LandingWordmark />
        <button type="button" className="lp-drawer-close" onClick={() => onClose(true)}>
          {t.close}
        </button>
      </div>

      <nav aria-label={t.label} className="lp-drawer-links">
        {LANDING_SECTIONS.map((id, index) => (
          <a
            key={id}
            href={`#${id}`}
            className="lp-drawer-link"
            aria-current={active === index ? 'true' : undefined}
            onClick={() => onClose(false)}
          >
            <span aria-hidden className="lp-link-pill" />
            <span className="lp-link-text">{t.links[id]}</span>
          </a>
        ))}
        {isSupabaseConfigured && <DrawerAccount onNavigate={() => onClose(false)} />}
      </nav>

      <LandingCta className="lp-drawer-cta" />

      <div className="lp-drawer-prefs">
        <LangSwitch />
        <ThemeToggle />
      </div>
    </div>
  );
}

/** "Entrar" para quem não tem sessão; "Meus álbuns" para quem tem. */
function DrawerAccount({ onNavigate }: { onNavigate: () => void }) {
  const { user, isLoading } = useSessionUser();
  const { lang } = useLang();
  const c = COMMON[lang];
  if (isLoading) return null;
  return user ? (
    <Link href="/albums" className="lp-drawer-link" onClick={onNavigate}>
      <span className="lp-link-text">{c.navMyAlbums}</span>
    </Link>
  ) : (
    <Link href="/entrar?next=%2F" className="lp-drawer-link" onClick={onNavigate}>
      <span className="lp-link-text">{c.navSignIn}</span>
    </Link>
  );
}

/**
 * A marca da landing: só a palavra, em minúsculas, na Bricolage com tamanho
 * óptico (`--font-landing-brand`) — como no protótipo. O ícone das duas fotos
 * continua nas outras telas (`Wordmark`), não aqui.
 */
function LandingWordmark() {
  return (
    <Link href="/" aria-label="Memento — voltar ao início" className="lp-wordmark">
      memento
    </Link>
  );
}

/** Leva até a seção escolhida arrastando a pílula — o mesmo caminho do clique. */
function goToSection(index: number) {
  const id = LANDING_SECTIONS[index];
  if (id) scrollToAnchor(id);
}
