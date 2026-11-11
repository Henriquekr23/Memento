import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountShell } from '@/features/account/AccountShell';
import { AuthDisabled, AuthForm, type AuthMode } from '@/features/auth/AuthForm';
import { safeNext } from '@/lib/safeNext';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = {
  title: 'Entrar — Memento',
  robots: { index: false },
};

/**
 * Entrar e criar conta. Veste a mesma roupa das telas da conta
 * (`AccountShell` sem abas): topo com a marca no centro, fundo chapado da
 * etapa 1 e rodapé na mesma régua — entrar não parece trocar de site.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const mode: AuthMode = params.modo === 'criar' ? 'signup' : 'signin';

  if (!isSupabaseConfigured) {
    return (
      <AccountShell section={null}>
        <AuthDisabled />
      </AccountShell>
    );
  }

  // Já logado não tem por que ver a tela de login.
  if (await getSessionUser()) redirect(next);

  return (
    <AccountShell section={null}>
      <AuthForm mode={mode} next={next} />
    </AccountShell>
  );
}
