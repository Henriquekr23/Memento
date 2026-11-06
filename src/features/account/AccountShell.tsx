import Link from 'next/link';

import { SiteFooter } from '@/components/SiteFooter';
import { AlbumTopBar } from '@/features/album-flow/AlbumTopBar';
import { landingFontVars } from '@/features/landing/fonts';

export type AccountSection = 'albums' | 'account';

const TABS: { id: AccountSection; href: string; label: string; icon: string }[] = [
  {
    id: 'albums',
    href: '/albums',
    label: 'Meus álbuns',
    icon: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM12 4v16',
  },
  {
    id: 'account',
    href: '/conta',
    label: 'Minha conta',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  },
];

/**
 * A moldura das telas da conta ("Meus álbuns" e "Minha conta").
 *
 * É a mesma roupa da /album — topo com a marca no centro, fundo em tom chapado
 * da etapa 1, título grande, rodapé na mesma régua —, para que sair da montagem
 * e cair na lista dos álbuns não pareça trocar de site. No lugar das etapas
 * entram as duas abas da conta: são as duas telas que a pessoa alterna, e antes
 * só se ia de uma à outra pelo menu do topo.
 */
export function AccountShell({
  section,
  children,
}: {
  section: AccountSection;
  children: React.ReactNode;
}) {
  return (
    <div className={`lp-theme af-root ac-root ${landingFontVars}`} data-step="1">
      <div aria-hidden className="af-bg">
        <span data-tone="1" />
      </div>

      <div className="lp-remap af-chrome">
        <AlbumTopBar />
        <nav aria-label="Conta" className="af-steps ac-tabs">
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
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="af-main">
        <div className="lp-remap">{children}</div>
      </main>

      <div className="lp-remap af-footer">
        <div className="af-footer-inner">
          <SiteFooter showMark={false} />
        </div>
      </div>
    </div>
  );
}
