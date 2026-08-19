'use client';

import { AUTHOR } from '@/lib/author';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

import { LogoMark } from './Logo';
import { Tooltip } from './Tooltip';

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.63 22.42c.57.1.78-.25.78-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.09 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.15v3.18c0 .3.2.66.79.55A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM2.75 21h4.46V9.5H2.75V21Zm7.1 0h4.46v-6.2c0-1.64.31-3.23 2.34-3.23 2 0 2.03 1.87 2.03 3.33V21h4.46v-7.1c0-3.87-.84-6.65-5.35-6.65-2.17 0-3.63 1.19-4.23 2.32h-.06V9.5H9.85V21Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m3 6 9 6.5L21 6" />
    </svg>
  );
}

/**
 * Rodapé de todas as telas: quem fez, onde encontrar e o aviso de fase.
 *
 * Um componente só, e não um bloco copiado em cada página, porque os links
 * vêm de `lib/author.ts` — mudar o LinkedIn é mudar uma linha, em um arquivo.
 */
export function SiteFooter() {
  const { lang } = useLang();
  const t = COMMON[lang];

  const links = [
    { id: 'github', label: 'GitHub', href: AUTHOR.github, tip: t.tipGithub, icon: <GithubIcon /> },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: AUTHOR.linkedin,
      tip: t.tipLinkedin,
      icon: <LinkedinIcon />,
    },
    {
      id: 'email',
      label: AUTHOR.email,
      href: `mailto:${AUTHOR.email}`,
      tip: t.tipEmail,
      icon: <MailIcon />,
    },
  ];

  return (
    <footer className="pb-10 pt-9">
      <hr className="hr mb-8" />

      {/* Uma coluna no celular, duas a partir de sm: a lista de links é o que
          o dedo procura, então ela vem primeiro na ordem visual do desktop. */}
      <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={20} className="text-[var(--color-accent)]" />
            <span className="font-[family-name:var(--font-heading)] text-[17px] font-bold">
              {t.footerMadeBy} {AUTHOR.name}
            </span>
          </span>
          <p className="mt-2 text-[13px] leading-5 text-[color-mix(in_srgb,var(--color-text)_58%,transparent)]">
            {AUTHOR.role[lang]} · {t.footerNote}
          </p>
        </div>

        <nav aria-label={t.footerLinksLabel} className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Tooltip key={link.id} label={link.tip} side="top">
              <a
                href={link.href}
                target={link.id === 'email' ? undefined : '_blank'}
                rel={link.id === 'email' ? undefined : 'noreferrer noopener'}
                className="footer-link"
              >
                {link.icon}
                <span>{link.label}</span>
              </a>
            </Tooltip>
          ))}
        </nav>
      </div>
    </footer>
  );
}
