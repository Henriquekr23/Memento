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
 * O botão de montar o álbum **não** vive aqui: ele é a ação principal do
 * produto e aparece grande no começo da landing, onde o olho já está. Na barra
 * ele competia com a navegação.
 *
 * A ordem é por finalidade, da esquerda para a direita: para onde ir (links do
 * site) · quem sou eu (conta) · como vejo (idioma e tema). O espaço entre os
 * grupos é maior do que o de dentro deles — é isso que faz a barra parecer
 * três blocos em vez de sete botões soltos.
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
    <nav className="site-nav">
      <Tooltip label={t.homeTip} side="bottom">
        <Wordmark tagline={tagline} />
      </Tooltip>

      {/* O espaço entre grupos é maior do que o de dentro de cada um
          (28px contra 20px): é a distância que agrupa, não a borda. */}
      <div className="flex items-center gap-4 sm:gap-7">
        {/* Âncoras somem no celular: não cabem ao lado da marca e a rolagem já
            entrega as seções na ordem. "Sobre" fica, porque é outra página. */}
        <div className="hidden items-center gap-5 text-sm md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
          <Link href="/sobre" className="nav-link">
            {t.navAbout}
          </Link>
        </div>

        {/* No celular "Sobre" sai da fila e vira o único link solto — trazer o
            grupo inteiro junto com ele não caberia. */}
        <Link href="/sobre" className="nav-link text-sm md:hidden">
          {t.navAbout}
        </Link>

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>

        {/* A conta é a última coisa da barra, encostada na margem direita: é
            onde toda interface põe o perfil, e é para lá que a mão vai quando
            a pergunta é "quem sou eu aqui". */}
        {isSupabaseConfigured && <AccountMenu />}
      </div>
    </nav>
  );
}
