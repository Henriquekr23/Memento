'use client';

import Link from 'next/link';

import { COMMON } from '@/features/i18n/common';
import { LangToggle } from '@/features/i18n/LangToggle';
import { useLang } from '@/features/i18n/LangProvider';
import { ThemeToggle } from '@/features/theme/ThemeToggle';

import { Tooltip } from './Tooltip';
import { Wordmark } from './Logo';

/**
 * Barra do topo, uma só para landing, "Sobre" e álbum.
 *
 * O botão de montar o álbum **não** vive mais aqui: ele é a ação principal do
 * produto e agora aparece grande no começo da landing, onde o olho já está. Na
 * barra ele competia com a navegação e ainda precisava de um clone escondido
 * para o celular.
 *
 * `variant` decide o que são os links do meio: na landing são âncoras das
 * seções da própria página; fora dela, âncoras não existem — o link vira
 * "Início".
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

  const links =
    variant === 'landing'
      ? [
          { href: '#o-album', label: t.navAlbum },
          { href: '#como-funciona', label: t.navHow },
          { href: '#recursos', label: t.navFeatures },
        ]
      : [{ href: '/', label: t.navHome }];

  return (
    <nav className="flex items-center justify-between gap-4 py-7">
      <Tooltip label={t.homeTip} side="bottom">
        <Wordmark tagline={tagline} />
      </Tooltip>

      <div className="flex items-center gap-4 sm:gap-5">
        {/* Âncoras somem no celular: não cabem ao lado da marca e a rolagem já
            entrega as seções na ordem. "Sobre" fica, porque é outra página. */}
        <div className="hidden gap-7 text-sm md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
        </div>

        <Link href="/sobre" className="nav-link text-sm">
          {t.navAbout}
        </Link>

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
