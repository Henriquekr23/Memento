'use client';

import Link from 'next/link';

import { AccountMenu } from '@/features/auth/AccountMenu';
import { useSessionUser } from '@/features/auth/useSessionUser';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';
import { LangSwitch } from '@/features/landing/nav/LangSwitch';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { isSupabaseConfigured } from '@/lib/supabase/env';

import { FLOW_COPY } from './copy';

/**
 * O topo da /album: a marca no centro e, no canto, idioma, tema e a conta.
 *
 * É a barra da landing sem as opções da home: mesmos botões (`LangSwitch`,
 * `.lp-theme-btn`), mesma marca. A marca é posicionada no centro da barra, e não
 * empurrada pelos vizinhos — os botões da direita mudam de largura (logado ou
 * não, PT ou EN) e a palavra não pode andar junto.
 *
 * "Entrar" aqui **não navega**: abre o `InlineAuthDialog` (`onSignIn`). O álbum
 * vive só na memória desta aba, e ir para `/entrar` no meio da montagem
 * jogaria fora tudo o que foi escolhido.
 */
export function AlbumTopBar({ onSignIn }: { onSignIn: () => void }) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];

  return (
    <header className="af-top">
      <Link href="/" aria-label={t.brandAria} className="lp-wordmark af-brand">
        memento
      </Link>

      <div className="af-top-tools">
        <LangSwitch />
        <ThemeToggle className="lp-theme-btn" />
        {isSupabaseConfigured && <AccountSlot onSignIn={onSignIn} />}
      </div>
    </header>
  );
}

function AccountSlot({ onSignIn }: { onSignIn: () => void }) {
  const { user, isLoading } = useSessionUser();
  const { lang } = useLang();

  // Reserva o lugar enquanto o cookie é lido: sem isso a barra pisca "Entrar"
  // por um quadro para quem já tem sessão.
  if (isLoading) return <span aria-hidden className="af-account-wait" />;
  if (user) return <AccountMenu />;

  return (
    <button type="button" className="af-signin" onClick={onSignIn}>
      {COMMON[lang].navSignIn}
    </button>
  );
}
