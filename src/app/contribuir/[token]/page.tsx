import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { ContributeForm } from '@/features/album-contrib/ContributeForm';
import { resolveInvite } from '@/features/album-contrib/actions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSessionUser } from '@/lib/supabase/server';

/**
 * A porta do convite.
 *
 * Três estados, e o `notFound()` não é nenhum deles de propósito: um convite
 * revogado precisa dizer "este link não vale mais", não "página não
 * encontrada" — quem clicou não errou o endereço, o dono é que fechou a porta.
 *
 * Contribuir exige conta. A alternativa (envio anônimo) obrigaria a política de
 * Storage a aceitar `anon` gravando na pasta de outra pessoa, com o token como
 * única tranca; com login, cada foto que chega tem um remetente, o dono vê quem
 * mandou e dá para limitar por pessoa.
 */

export const metadata: Metadata = {
  title: 'Mandar fotos — Memento',
  robots: { index: false, follow: false },
};

export default async function ContribuirPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const shell = (children: React.ReactNode) => (
    <main className="page-shell page-body">
      <SiteNav variant="inner" />
      <hr className="hr" />
      <div className="h-10" />
      {children}
      <SiteFooter />
    </main>
  );

  if (!isSupabaseConfigured) {
    return shell(
      <p className="card mx-auto max-w-[520px] p-6 text-sm">
        Os convites não estão configurados nesta instalação.
      </p>,
    );
  }

  const invite = await resolveInvite(token);
  if (!invite.ok) {
    return shell(
      <section className="card mx-auto max-w-[520px] p-6 text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl">
          Convite encerrado
        </h1>
        <p className="muted mt-2 text-sm">{invite.error}</p>
        <Link href="/album" className="btn btn-primary btn-sm mt-5">
          Montar um álbum meu
        </Link>
      </section>,
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return shell(
      <section className="card mx-auto max-w-[520px] p-6 text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl">
          Entre para mandar suas fotos
        </h1>
        <p className="muted mt-2 text-sm">
          {invite.data.authorName || 'Quem montou o álbum'} pediu as suas fotos
          para <strong>{invite.data.title}</strong>. A conta é o que deixa quem
          recebe saber que as fotos vieram de você.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {/* O `next` volta para cá depois do login — `safeNext` aceita porque
              é caminho interno. */}
          <Link
            href={`/entrar?modo=criar&next=/contribuir/${token}`}
            className="btn btn-primary btn-sm"
          >
            Criar conta
          </Link>
          <Link
            href={`/entrar?next=/contribuir/${token}`}
            className="btn btn-secondary btn-sm"
          >
            Já tenho conta
          </Link>
        </div>
      </section>,
    );
  }

  return shell(<ContributeForm target={invite.data} />);
}
