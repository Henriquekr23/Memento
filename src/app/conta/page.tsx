import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountShell } from '@/features/account/AccountShell';
import { NameForm, PasswordForm } from '@/features/auth/AccountForms';
import { signOutAction } from '@/features/auth/actions';
import { initialOf, nameOf } from '@/features/auth/name';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Minha conta — Memento',
  robots: { index: false },
};

/**
 * A conta em um lugar só: nome, e-mail, senha e a saída.
 *
 * Desenhada como as etapas de montar: quem você é num cartão do lado (como o
 * trilho da bancada) e o que se muda nos cartões ao lado dele (como o
 * inspetor). "Sair" mora no cartão de quem você é — longe dos botões de
 * salvar, sem dividir fileira com eles.
 */
export default async function ContaPage() {
  if (!isSupabaseConfigured) redirect('/album');

  const user = await getSessionUser();
  if (!user) redirect('/entrar?next=%2Fconta');

  const name = nameOf(user);

  return (
    <AccountShell section="account">
      <section className="af-section ac-section">
        <div className="af-head">
          <h1 className="lp-h af-title">Sua conta.</h1>
          <p className="af-lead">Seu nome, sua senha e a saída — tudo aqui.</p>
        </div>

        <div className="ac-account">
          <aside className="ac-card ac-profile">
            <span aria-hidden className="avatar ac-profile-avatar">
              {initialOf(name)}
            </span>
            <p className="ac-profile-name">{name}</p>
            <p className="ac-profile-email">{user.email}</p>

            <div className="ac-profile-sep" />

            <form action={signOutAction} className="ac-profile-out">
              <button type="submit" className="af-btn af-btn-ghost ac-btn ac-btn-out">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l4-4-4-4M14 12H4" />
                </svg>
                Sair da conta
              </button>
              <p className="ac-hint">
                Encerra a sessão neste navegador. Seus álbuns guardados continuam onde estão.
              </p>
            </form>
          </aside>

          <div className="ac-forms">
            <NameForm name={name} email={user.email ?? ''} />
            <PasswordForm />
          </div>
        </div>
      </section>
    </AccountShell>
  );
}
