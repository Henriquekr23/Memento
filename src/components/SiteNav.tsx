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
 * `variant` decide o que são os links do meio: na landing são âncoras das
 * seções da própria página; fora dela, âncoras não existem — o link vira
 * "Início".
 *
 * A barra não repete o botão de montar o álbum: ele já vive grande no herói e
 * de novo no fim da landing, e aqui em cima só disputava espaço com os
 * controles.
 */
export function SiteNav({
  variant = 'landing',
  tagline,
}: {
  variant?: 'landing' | 'inner';
  tagline?: string;
}) {
  const { lang } = useLang();
  const t = COMMON[lang];

  const isLanding = variant === 'landing';
  const links = isLanding
    ? [
        { href: '#antes-depois', label: t.navBeforeAfter },
        { href: '#como-funciona', label: t.navHow },
        { href: '#recursos', label: t.navFeatures },
      ]
    : [{ href: '/', label: t.navHome }];

  return (
    <nav className="site-nav">
      <Tooltip label={t.homeTip} side="bottom">
        <Wordmark tagline={tagline} />
      </Tooltip>

      {/* Os links, na ordem em que as seções aparecem na página. As âncoras
          somem no celular (não cabem entre a marca e os controles, e a rolagem
          já entrega as seções na ordem); "Sobre" fica sempre, porque é outra
          página — antes ela era repetida em dois blocos para isso. */}
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
