import { SiteFooter } from '@/components/SiteFooter';
import { AlbumTopBar } from '@/features/album-flow/AlbumTopBar';
import { landingFontVars } from '@/features/landing/fonts';

import { AccountTabs, type AccountSection } from './AccountTexts';

export type { AccountSection };

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
  /**
   * A aba acesa. `null` tira as abas: a página de um álbum veste a mesma roupa,
   * mas é uma página do álbum, não uma tela da conta.
   */
  section: AccountSection | null;
  children: React.ReactNode;
}) {
  return (
    <div className={`lp-theme af-root ac-root ${landingFontVars}`} data-step="1">
      <div aria-hidden className="af-bg">
        <span data-tone="1" />
      </div>

      <div className="lp-remap af-chrome">
        <AlbumTopBar />
        {section && <AccountTabs section={section} />}
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
