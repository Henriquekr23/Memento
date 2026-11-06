'use client';

import Link from 'next/link';

import { AccountMenu } from '@/features/auth/AccountMenu';
import { COMMON } from '@/features/i18n/common';
import { LangToggle } from '@/features/i18n/LangToggle';
import { useLang } from '@/features/i18n/LangProvider';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { isSupabaseConfigured } from '@/lib/supabase/env';

import { Tooltip } from './Tooltip';
import { Wordmark } from './Logo';

/**
 * Barra do topo, uma só para todas as telas — inclusive o álbum, que antes
 * tinha um cabeçalho próprio e por isso não oferecia idioma, tema nem conta.
 *
 * São três blocos numa linha só, na grade de `.site-nav`: a marca à esquerda,
 * os links de navegação centralizados na régua da página e os controles de
 * como vejo / quem sou eu à direita. A coluna do meio é o centro real da tela
 * (as laterais são `1fr` iguais), então os links não andam quando a conta
 * aparece ou o rótulo do idioma muda de largura.
 *
 * A landing não usa esta barra: ela tem a própria (`features/landing/nav/
 * LandingNav`), com a marca que desliza do centro e as âncoras das seções. Por
 * isso `variant` só tem um valor hoje — fica como parâmetro para as telas que
 * já o passam.
 *
 * A barra não repete o botão de montar o álbum: aqui em cima ele só
 * disputava espaço com os controles.
 */
export function SiteNav({
  tagline,
}: {
  variant?: 'inner';
  tagline?: string;
}) {
  const { lang } = useLang();
  const t = COMMON[lang];

  const links = [{ href: '/', label: t.navHome }];

  return (
    <nav className="site-nav">
      <Tooltip label={t.homeTip} side="bottom">
        <Wordmark tagline={tagline} />
      </Tooltip>

      {/* "Início" some no celular (a marca já leva para lá e não sobra
          espaço entre ela e os controles); "Sobre" fica sempre. */}
      <div className="site-nav-links">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="nav-link hidden md:inline-block">
            {link.label}
          </a>
        ))}
        <Link href="/sobre" className="nav-link">
          {t.navAbout}
        </Link>
      </div>

      <div className="site-nav-tools">
        <LangToggle />
        <ThemeToggle />

        {/* A conta fecha a barra: é onde toda interface põe o perfil, e é
            para lá que a mão vai quando a pergunta é "quem sou eu aqui". */}
        {isSupabaseConfigured && <AccountMenu />}
      </div>
    </nav>
  );
}
