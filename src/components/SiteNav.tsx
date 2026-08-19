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
 * A ordem é por finalidade, da esquerda para a direita: para onde ir (links do
 * site) · quem sou eu (conta) · como vejo (idioma e tema) · o que fazer (o
 * botão). O espaço entre os grupos é maior do que o de dentro deles — é isso
 * que faz a barra parecer três blocos em vez de sete botões soltos.
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

      {/* O espaço entre grupos é maior do que o de dentro de cada um: é a
          distância que agrupa, não a borda. */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Um grupo só de links, na ordem em que as seções aparecem na página.
            As âncoras somem no celular (não cabem ao lado da marca, e a rolagem
            já entrega as seções na ordem); "Sobre" fica sempre, porque é outra
            página — antes ela era repetida em dois blocos para isso. */}
        <div className="flex items-center gap-5 text-sm">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link hidden md:inline-block">
              {link.label}
            </a>
          ))}
          <Link href="/sobre" className="nav-link">
            {t.navAbout}
          </Link>
        </div>

        {/* Filete separando "para onde ir" de "como vejo / quem sou eu": sem
            ele, sete controles na mesma linha lêem como uma fila única. */}
        <span aria-hidden className="nav-sep" />

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />

          {/* A conta fecha a barra: é onde toda interface põe o perfil, e é
              para lá que a mão vai quando a pergunta é "quem sou eu aqui". */}
          {isSupabaseConfigured && <AccountMenu />}
        </div>
      </div>
    </nav>
  );
}
