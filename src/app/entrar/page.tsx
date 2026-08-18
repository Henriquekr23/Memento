import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { AuthForm, type AuthMode } from '@/features/auth/AuthForm';
import { safeNext } from '@/lib/safeNext';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = {
  title: 'Entrar — Memento',
  robots: { index: false },
};

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
      <main className="page-shell page-body">
        <SiteNav variant="inner" />
        <hr className="hr" />
        <p className="card mx-auto mt-10 max-w-[520px] p-6 text-sm">
          As contas não estão configuradas nesta instalação. O álbum continua
          funcionando por completo em <strong>/album</strong>, sem conta.
        </p>
        <SiteFooter />
      </main>
    );
  }

  // Já logado não tem por que ver a tela de login.
  if (await getSessionUser()) redirect(next);

  return (
    <main className="page-shell page-body">
      <SiteNav variant="inner" />
      <hr className="hr" />
      <div className="h-10" />
      <AuthForm mode={mode} next={next} />
      <SiteFooter />
    </main>
  );
}
