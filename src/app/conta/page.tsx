import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { NameForm, PasswordForm } from '@/features/auth/AccountForms';
import { signOutAction } from '@/features/auth/actions';
import { nameOf } from '@/features/auth/name';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Minha conta — Memento',
  robots: { index: false },
};

/**
 * A conta em um lugar só: nome, e-mail, senha e a saída.
 *
 * "Sair" mora aqui, e não na lista de álbuns: lá ele dividia a linha com
 * "Montar um álbum" — a ação mais construtiva e a mais destrutiva da tela lado
 * a lado, do mesmo tamanho.
 */
export default async function ContaPage() {
  if (!isSupabaseConfigured) redirect('/album');

  const user = await getSessionUser();
  if (!user) redirect('/entrar?next=%2Fconta');

  return (
    <main className="page-shell page-body">
      <SiteNav variant="inner" />
      <hr className="hr" />

      <header className="page-head">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl">
            Minha conta
          </h1>
          <p className="muted mt-1 text-sm">
            {nameOf(user)} · {user.email}
          </p>
        </div>
      </header>

      {/* Coluna estreita: são formulários curtos, e esticá-los por 1200px faz
          o olho percorrer a linha inteira à toa entre o rótulo e o campo. */}
      {/* <div className="flex max-w-[680px] flex-col gap-6"> */}
      <div className="flex flex-col gap-6">
        <NameForm name={nameOf(user)} email={user.email ?? ''} />
        <PasswordForm />

        <section className="panel">
          <h2 className="panel-title">Sessão</h2>
          <p className="field-hint max-w-[58ch]">
            Sair encerra a sessão neste navegador. Seus álbuns guardados
            continuam onde estão.
          </p>
          <form action={signOutAction} className="panel-actions">
            <button type="submit" className="btn btn-secondary">
              Sair da conta
            </button>
          </form>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
